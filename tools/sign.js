'use strict';

/**
 * Signiert registry.json und alle extensions/<id>/manifest.json mit Ed25519.
 * Erzeugt beim ersten Lauf ein Schluesselpaar (keys/private.pem, keys/public.pem).
 * Der private Schluessel wird NICHT committet (.gitignore).
 *
 * Nutzung:  node tools/sign.js
 * Ausgabe:  neben jeder Datei eine <datei>.sig (Base64 der Ed25519-Signatur).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const KEYS = path.join(ROOT, 'keys');
const PRIV = path.join(KEYS, 'private.pem');
const PUB = path.join(KEYS, 'public.pem');

function ensureKeys() {
    fs.mkdirSync(KEYS, { recursive: true });
    if (!fs.existsSync(PRIV)) {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        fs.writeFileSync(PRIV, privateKey.export({ type: 'pkcs8', format: 'pem' }));
        fs.writeFileSync(PUB, publicKey.export({ type: 'spki', format: 'pem' }));
        console.log('Generated new Ed25519 key pair in keys/');
    }
    return crypto.createPrivateKey(fs.readFileSync(PRIV));
}

function signFile(privateKey, file) {
    const data = fs.readFileSync(file);
    const sig = crypto.sign(null, data, privateKey).toString('base64');
    fs.writeFileSync(file + '.sig', sig + '\n');
    console.log('signed', path.relative(ROOT, file));
}

const key = ensureKeys();
const targets = [path.join(ROOT, 'registry.json')];
const extDir = path.join(ROOT, 'extensions');
for (const id of fs.readdirSync(extDir)) {
    const m = path.join(extDir, id, 'manifest.json');
    if (fs.existsSync(m)) { targets.push(m); }
}
targets.forEach((f) => signFile(key, f));
console.log('\nPublic key (embed in the app):\n' + fs.readFileSync(PUB, 'utf8'));
