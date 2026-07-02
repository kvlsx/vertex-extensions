'use strict';

/**
 * Validiert registry.json + alle Manifeste gegen das Schema-Regelwerk und prueft
 * jede Ed25519-Signatur gegen keys/public.pem. Zusaetzlich adversariale Tests:
 * die Sicherheits-Guards der App (safeManifestPath, isSafeUrl, verifySignature)
 * werden hier nachgebildet und muessen boesartige Eingaben ablehnen.
 *
 * Nutzung:  node tools/validate.js   (Exit-Code != 0 bei Fehlern)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const pub = crypto.createPublicKey(fs.readFileSync(path.join(ROOT, 'keys', 'public.pem')));

let fails = 0;
const bad = (msg) => { console.error('  ✗', msg); fails++; };
const ok = (msg) => console.log('  ✓', msg);

// --- Guards wie in der App (src/index.js) nachgebildet ---
function isSafeUrl(url) {
    try { const p = new URL(url).protocol; return p === 'https:' || p === 'http:'; } catch { return false; }
}
function safeManifestPath(p) {
    return typeof p === 'string' && /^[a-z0-9._/-]+$/i.test(p) && !p.includes('..') && !p.startsWith('/');
}
function verifySignature(text, sigB64) {
    try { return crypto.verify(null, Buffer.from(text), pub, Buffer.from(String(sigB64).trim(), 'base64')); }
    catch { return false; }
}

// --- 1) registry.json ---
console.log('registry.json:');
const regText = fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf8');
const regSig = fs.readFileSync(path.join(ROOT, 'registry.json.sig'), 'utf8');
verifySignature(regText, regSig) ? ok('signature valid') : bad('registry signature INVALID');
const reg = JSON.parse(regText);
const ids = new Set();
for (const e of reg.extensions) {
    if (ids.has(e.id)) { bad(`duplicate id ${e.id}`); }
    ids.add(e.id);
    if (!/^[a-z0-9-]+$/.test(e.id)) { bad(`bad id pattern ${e.id}`); }
    if (!safeManifestPath(e.manifest)) { bad(`unsafe manifest path for ${e.id}: ${e.manifest}`); }
    if (!['service-pack', 'adblocker', 'proxy'].includes(e.type)) { bad(`bad type ${e.type} (${e.id})`); }
}
ok(`${reg.extensions.length} registry entries, ${ids.size} unique ids`);

// --- 2) jedes Manifest ---
console.log('manifests:');
let count = 0;
for (const e of reg.extensions) {
    const mPath = path.join(ROOT, e.manifest);
    if (!fs.existsSync(mPath)) { bad(`missing manifest ${e.manifest}`); continue; }
    const mText = fs.readFileSync(mPath, 'utf8');
    const mSig = fs.readFileSync(mPath + '.sig', 'utf8');
    if (!verifySignature(mText, mSig)) { bad(`signature INVALID: ${e.id}`); }
    const m = JSON.parse(mText);
    for (const req of ['id', 'name', 'version', 'type']) {
        if (!m[req]) { bad(`${e.id}: missing ${req}`); }
    }
    if (m.id !== e.id) { bad(`${e.id}: manifest id mismatch (${m.id})`); }
    if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(m.version)) { bad(`${e.id}: bad version ${m.version}`); }
    if (m.type === 'service-pack') {
        if (!Array.isArray(m.services) || m.services.length === 0) { bad(`${e.id}: no services`); }
        for (const s of m.services || []) {
            if (!isSafeUrl(s.url)) { bad(`${e.id}: unsafe service url ${s.url}`); }
            if (!/^[a-z0-9-]+$/.test(s.type)) { bad(`${e.id}: bad service type ${s.type}`); }
            if (s.color && !/^#[0-9a-fA-F]{3,8}$/.test(s.color)) { bad(`${e.id}: bad color ${s.color}`); }
        }
    }
    count++;
}
ok(`${count} manifests checked`);

// --- 3) adversariale Tests: Guards muessen boesartige Eingaben ablehnen ---
console.log('adversarial guards:');
const mustReject = [
    ['isSafeUrl javascript:', () => !isSafeUrl('javascript:alert(1)')],
    ['isSafeUrl file:', () => !isSafeUrl('file:///etc/passwd')],
    ['isSafeUrl data:', () => !isSafeUrl('data:text/html,<script>')],
    ['isSafeUrl garbage', () => !isSafeUrl('not a url')],
    ['safeManifestPath traversal', () => !safeManifestPath('../../keys/private.pem')],
    ['safeManifestPath absolute', () => !safeManifestPath('/etc/passwd')],
    ['safeManifestPath remote url', () => !safeManifestPath('https://evil.example/m.json')],
    ['verify tampered manifest', () => {
        const t = fs.readFileSync(path.join(ROOT, reg.extensions[0].manifest), 'utf8');
        const sig = fs.readFileSync(path.join(ROOT, reg.extensions[0].manifest) + '.sig', 'utf8');
        return !verifySignature(t + ' ', sig); // 1 Byte veraendert -> muss fehlschlagen
    }],
    ['verify empty sig', () => !verifySignature('x', '')],
    ['verify wrong-key sig', () => {
        const other = crypto.generateKeyPairSync('ed25519').privateKey;
        const sig = crypto.sign(null, Buffer.from(regText), other).toString('base64');
        return !verifySignature(regText, sig); // andere Schluessel -> muss fehlschlagen
    }]
];
for (const [name, fn] of mustReject) {
    let pass = false;
    try { pass = !!fn(); } catch { pass = false; }
    pass ? ok(name) : bad(`GUARD FAILED: ${name}`);
}

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
