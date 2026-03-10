/**
 * main.js  —  Premiere Pro CEP Panel Logic
 *
 * Runs in the CEP browser/Node mixed context.
 * Uses Node's 'fs' + 'path' to read the configured folder,
 * and Adobe's CSInterface bridge to call premiere.jsx functions.
 */

/* ════════════════════════════════════════════════
   SETUP — Node.js modules & CEP bridge
════════════════════════════════════════════════ */

// In CEP --mixed-context mode, require() is available globally
const fs = require('fs');
const path = require('path');

// Minimal CEP bridge using the raw __adobe_cep__ global
const cep = (typeof __adobe_cep__ !== 'undefined') ? __adobe_cep__ : null;

function evalScript(script) {
    return new Promise((resolve) => {
        if (!cep) {
            // Dev mode: no Premiere connected
            console.warn('[DevMode] evalScript called:', script.slice(0, 80));
            resolve('DEV_MODE');
            return;
        }
        cep.evalScript(script, (result) => resolve(result));
    });
}

/* ════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════ */
const SETTINGS_KEY = 'autoNarrationPremiereSettings';

let settings = {
    folderPath: '',
    binPath: 'Audio/VO',
    trackIndex: 0,   // 0-based internally, shown as 1-based in UI
};

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) { }
    // Populate settings form
    document.getElementById('folderPathInput').value = settings.folderPath;
    document.getElementById('binPathInput').value = settings.binPath;
    document.getElementById('trackIndexInput').value = settings.trackIndex + 1; // 1-based
}

function saveSettings() {
    settings.folderPath = document.getElementById('folderPathInput').value.trim();
    settings.binPath = document.getElementById('binPathInput').value.trim();
    settings.trackIndex = Math.max(0, parseInt(document.getElementById('trackIndexInput').value, 10) - 1);

    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { }

    setStatus('Settings saved.', 'ok');
    switchTab('mainView');
    refreshFileList();
}

/* ════════════════════════════════════════════════
   FILE LIST
════════════════════════════════════════════════ */
let files = []; // { name, fullPath, mtime, size }

function refreshFileList() {
    const folder = settings.folderPath;

    if (!folder) {
        setStatus('No folder configured. Open Settings.', '');
        renderFiles([]);
        return;
    }

    // Expand ~ to home directory
    const expanded = folder.replace(/^~/, process.env.HOME || '');

    if (!fs.existsSync(expanded)) {
        setStatus('Folder not found: ' + expanded, 'err');
        renderFiles([]);
        return;
    }

    try {
        const allEntries = fs.readdirSync(expanded);
        const audioFiles = allEntries
            .filter(f => /\.(mp3|wav|aif|aiff|m4a)$/i.test(f))
            .map(name => {
                const fullPath = path.join(expanded, name);
                const stat = fs.statSync(fullPath);
                return { name, fullPath, mtime: stat.mtime, size: stat.size };
            })
            .sort((a, b) => b.mtime - a.mtime); // newest first

        files = audioFiles;
        renderFiles(audioFiles);
        setStatus(audioFiles.length + ' file' + (audioFiles.length !== 1 ? 's' : '') + ' found.', 'ok');
    } catch (e) {
        setStatus('Error reading folder: ' + e.message, 'err');
        renderFiles([]);
    }
}

function renderFiles(list) {
    const container = document.getElementById('fileList');
    const emptyState = document.getElementById('emptyState');
    const countLabel = document.getElementById('fileCountLabel');

    // Clear existing file items (keep emptyState)
    Array.from(container.children).forEach(el => {
        if (el.id !== 'emptyState') el.remove();
    });

    if (list.length === 0) {
        emptyState.style.display = '';
        countLabel.textContent = 'Recent Files';
        return;
    }

    emptyState.style.display = 'none';
    countLabel.textContent = list.length + ' Audio File' + (list.length !== 1 ? 's' : '');

    list.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.idx = idx;

        const ago = timeAgo(file.mtime);
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);

        item.innerHTML = `
      <div class="file-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      </div>
      <div class="file-info">
        <div class="file-name" title="${esc(file.name)}">${esc(file.name)}</div>
        <div class="file-meta">${ago} · ${sizeMB} MB</div>
      </div>
      <button class="import-btn" data-idx="${idx}" title="Import this file to Premiere">Import</button>
    `;

        container.appendChild(item);
    });
}

function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.round(diff / 60) + 'm ago';
    if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
    return Math.round(diff / 86400) + 'd ago';
}

/* ════════════════════════════════════════════════
   IMPORT LOGIC
════════════════════════════════════════════════ */
async function importFile(file) {
    setStatus('Importing ' + file.name + '…', 'busy');
    disableButtons(true);

    const binPath = settings.binPath || '';
    const trackIndex = settings.trackIndex;

    // Escape backslashes for the JSX string
    const jsxPath = file.fullPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const jsxBin = binPath.replace(/'/g, "\\'");

    const script = `importAndPlace('${jsxPath}', '${jsxBin}', ${trackIndex})`;

    try {
        const result = await evalScript(script);

        if (result === 'DEV_MODE') {
            setStatus('(Dev mode) Would import: ' + file.name, 'ok');
        } else if (typeof result === 'string' && result.startsWith('ERROR')) {
            setStatus(result.replace('ERROR: ', ''), 'err');
        } else {
            setStatus('✓ Imported: ' + file.name, 'ok');
        }
    } catch (e) {
        setStatus('Failed: ' + e.message, 'err');
    } finally {
        disableButtons(false);
    }
}

async function importLatest() {
    // Force refresh first to make sure we have the newest file
    refreshFileList();
    if (files.length === 0) {
        setStatus('No audio files found in the configured folder.', 'err');
        return;
    }
    await importFile(files[0]);
}

/* ════════════════════════════════════════════════
   STATUS BAR
════════════════════════════════════════════════ */
function setStatus(msg, type = '') {
    const bar = document.getElementById('statusBar');
    const text = document.getElementById('statusText');
    bar.className = 'status-bar ' + type;
    text.textContent = msg;
}

function disableButtons(disabled) {
    document.getElementById('importLatestBtn').disabled = disabled;
    document.getElementById('refreshBtn').disabled = disabled;
}

/* ════════════════════════════════════════════════
   TABS
════════════════════════════════════════════════ */
function switchTab(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');

    document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === viewId);
    });
}

/* ════════════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════════════ */

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
        if (tab.dataset.tab === 'settingsView') {
            // Re-populate form with current settings
            document.getElementById('folderPathInput').value = settings.folderPath;
            document.getElementById('binPathInput').value = settings.binPath;
            document.getElementById('trackIndexInput').value = settings.trackIndex + 1;
        }
    });
});

// Import latest
document.getElementById('importLatestBtn').addEventListener('click', importLatest);

// Refresh
document.getElementById('refreshBtn').addEventListener('click', refreshFileList);

// Save settings
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

// Per-file import button (event delegation)
document.getElementById('fileList').addEventListener('click', (e) => {
    const btn = e.target.closest('.import-btn');
    if (btn) {
        const idx = parseInt(btn.dataset.idx, 10);
        if (files[idx]) importFile(files[idx]);
    }
});

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
loadSettings();
refreshFileList();

// Ping ExtendScript to confirm JSX is loaded
evalScript('ping()').then(result => {
    if (result === 'pong') {
        setStatus('Connected to Premiere Pro.', 'ok');
    } else if (result !== 'DEV_MODE') {
        setStatus('Premiere Pro not responding. Restart the panel.', 'err');
    }
});
