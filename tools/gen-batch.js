'use strict';

/**
 * Erzeugt service-pack Manifeste fuer eine Reihe von Web-Diensten und traegt sie
 * in registry.json ein. Danach mit `node tools/sign.js` signieren.
 *
 * Nutzung:  node tools/gen-batch.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT = path.join(ROOT, 'extensions');

// id, name, svcType, url, icon(emoji), color, author, homepage, faviconDomain, description
const ITEMS = [
    // AI-Assistenten
    ['chatgpt', 'ChatGPT', 'chatgpt', 'https://chatgpt.com', '🤖', '#10a37f', 'OpenAI', 'https://chatgpt.com', 'chatgpt.com', 'OpenAI ChatGPT assistant as a service.'],
    ['claude-ai', 'Claude', 'claude', 'https://claude.ai', '🧠', '#d97757', 'Anthropic', 'https://claude.ai', 'claude.ai', 'Anthropic Claude AI assistant as a service.'],
    ['gemini', 'Google Gemini', 'gemini', 'https://gemini.google.com', '✨', '#1a73e8', 'Google', 'https://gemini.google.com', 'gemini.google.com', 'Google Gemini AI assistant as a service.'],
    ['perplexity', 'Perplexity', 'perplexity', 'https://www.perplexity.ai', '🔎', '#20808d', 'Perplexity AI', 'https://www.perplexity.ai', 'perplexity.ai', 'Perplexity AI answer engine as a service.'],
    ['deepseek', 'DeepSeek', 'deepseek', 'https://chat.deepseek.com', '🐋', '#4d6bfe', 'DeepSeek', 'https://chat.deepseek.com', 'deepseek.com', 'DeepSeek AI assistant as a service.'],
    // Cloud / Office
    ['google-drive', 'Google Drive', 'gdrive', 'https://drive.google.com', '📁', '#1fa463', 'Google', 'https://drive.google.com', 'drive.google.com', 'Google Drive cloud storage as a service.'],
    ['google-docs', 'Google Docs', 'gdocs', 'https://docs.google.com', '📄', '#4285f4', 'Google', 'https://docs.google.com', 'docs.google.com', 'Google Docs, Sheets and Slides as a service.'],
    ['microsoft-office', 'Microsoft 365', 'office365', 'https://www.office.com', '📊', '#d83b01', 'Microsoft', 'https://www.office.com', 'office.com', 'Microsoft 365 / OneDrive web apps as a service.'],
    ['dropbox', 'Dropbox', 'dropbox', 'https://www.dropbox.com/home', '📦', '#0061ff', 'Dropbox', 'https://www.dropbox.com', 'dropbox.com', 'Dropbox cloud storage as a service.'],
    // Meetings
    ['zoom', 'Zoom', 'zoom', 'https://app.zoom.us/wc/home', '🎥', '#2d8cff', 'Zoom', 'https://zoom.us', 'zoom.us', 'Zoom web client for meetings as a service.'],
    ['google-meet', 'Google Meet', 'gmeet', 'https://meet.google.com', '📹', '#00897b', 'Google', 'https://meet.google.com', 'meet.google.com', 'Google Meet video calls as a service.'],
    ['jitsi', 'Jitsi Meet', 'jitsi', 'https://meet.jit.si', '🗣️', '#1d76ba', 'Jitsi', 'https://jitsi.org', 'jit.si', 'Jitsi Meet open-source video conferencing as a service.'],
    // Aufgaben / Notizen / PM
    ['google-keep', 'Google Keep', 'gkeep', 'https://keep.google.com', '🗒️', '#fbbc04', 'Google', 'https://keep.google.com', 'keep.google.com', 'Google Keep notes as a service.'],
    ['ms-todo', 'Microsoft To Do', 'mstodo', 'https://to-do.office.com/tasks/', '✅', '#3d5afe', 'Microsoft', 'https://to-do.office.com', 'to-do.office.com', 'Microsoft To Do tasks as a service.'],
    ['clickup', 'ClickUp', 'clickup', 'https://app.clickup.com', '🚀', '#7b68ee', 'ClickUp', 'https://clickup.com', 'clickup.com', 'ClickUp project management as a service.'],
    ['asana', 'Asana', 'asana', 'https://app.asana.com', '🎯', '#f06a6a', 'Asana', 'https://asana.com', 'asana.com', 'Asana project management as a service.'],
    ['linear', 'Linear', 'linear', 'https://linear.app', '📐', '#5e6ad2', 'Linear', 'https://linear.app', 'linear.app', 'Linear issue tracking as a service.'],
    // Design / Whiteboards
    ['figma', 'Figma', 'figma', 'https://www.figma.com/files', '🎨', '#f24e1e', 'Figma', 'https://www.figma.com', 'figma.com', 'Figma design tool as a service.'],
    ['miro', 'Miro', 'miro', 'https://miro.com/app/dashboard/', '🧩', '#ffd02f', 'Miro', 'https://miro.com', 'miro.com', 'Miro online whiteboard as a service.'],
    ['canva', 'Canva', 'canva', 'https://www.canva.com', '🖌️', '#00c4cc', 'Canva', 'https://www.canva.com', 'canva.com', 'Canva graphic design as a service.'],
    // Schreibassistent (QuillBot Web-App; die Chrome-Erweiterung kann Vertex nicht ausfuehren)
    ['quillbot', 'QuillBot', 'quillbot', 'https://quillbot.com', '✍️', '#2ecaa0', 'QuillBot', 'https://quillbot.com', 'quillbot.com', 'QuillBot AI writing / paraphrasing web app as a service.']
];

function favicon(domain) {
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
}

const registryPath = path.join(ROOT, 'registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const byId = new Map(registry.extensions.map((e) => [e.id, e]));

for (const [id, name, svcType, url, icon, color, author, homepage, favDomain, description] of ITEMS) {
    const dir = path.join(EXT, id);
    fs.mkdirSync(dir, { recursive: true });
    const manifest = {
        id,
        name,
        version: '1.0.0',
        description: `${description} Adds ${name} as a service.`,
        author,
        homepage,
        type: 'service-pack',
        services: [
            { type: svcType, name, url, icon, color }
        ],
        icon: favicon(favDomain)
    };
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

    const entry = {
        id,
        name,
        version: '1.0.0',
        description,
        author,
        type: 'service-pack',
        manifest: `extensions/${id}/manifest.json`,
        icon: favicon(favDomain)
    };
    byId.set(id, entry);
    console.log('wrote', id);
}

registry.updated = '2026-07-02';
registry.extensions = Array.from(byId.values());
fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
console.log('\nregistry now has', registry.extensions.length, 'extensions');
