/* ═══════════════════════════════════════════════
   Auto Narration – Popup Logic
   ═══════════════════════════════════════════════ */

const $ = (sel) => document.querySelector(sel);

let state = {
    apiKey: '',
    voiceId: '',
    voiceName: '',
    modelId: 'eleven_multilingual_v2',
    selectedText: '',
    autoOpenSidebar: true,
};

/* ── View switching ── */
const urlParams = new URLSearchParams(window.location.search);
const isSidebar = urlParams.get('mode') === 'sidebar';

if (isSidebar) {
    document.body.classList.add('is-sidebar');
    $('#closeSidebarBtn').style.display = 'flex';
    $('#openSidebarBtn').style.display = 'none';
} else {
    $('#closeSidebarBtn').style.display = 'none';
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/* ── Status display ── */
function setStatus(msg, type) {
    const dot = $('#statusDot');
    const text = $('#statusText');
    dot.className = 'dot ' + (type || 'idle');
    text.textContent = msg;
}

/* ── Fetch selection from active tab ── */
async function fetchSelection() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) return;
    const tab = tabs[0];
    const isDocs = tab.url && tab.url.includes('docs.google.com/document');

    if (isSidebar) {
        $('#openSidebarBtn').style.display = 'none';
    } else if (isDocs) {
        $('#openSidebarBtn').style.display = 'flex';
    }

    let text = '';

    if (isDocs) {
        // Google Docs workaround: Message the content script which has local DOM access to trigger the copy and read the clipboard
        try {
            const res = await chrome.tabs.sendMessage(tab.id, { action: 'docsCopyText' });
            if (res && res.text) {
                text = res.text;
            }
        } catch (err) {
            console.warn('Docs selection extract failed (might need page reload):', err);
        }
    } else {
        // Normal web page: inject script to get selection
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => window.getSelection().toString()
            });
            if (results && results[0] && results[0].result) {
                text = results[0].result;
            }
        } catch (e) {
            console.warn('Scripting inject failed:', e);
        }
    }

    if (text && text.trim()) {
        state.selectedText = text.trim();
        if (state.apiKey) {
            $('#textPreview').textContent = state.selectedText;
            setStatus('Text ready — click Generate Audio.', 'success');
        }
    } else {
        state.selectedText = '';
        if (state.apiKey) {
            if (isDocs) {
                $('#textPreview').textContent = 'Google Docs blocks automatic extraction.\nPlease press Cmd+C or Ctrl+C to copy your text, then click here to refresh.';
                setStatus('Action required: Copy text manually (Cmd/Ctrl + C).', 'warning');
            } else {
                $('#textPreview').textContent = 'Highlight text on the page…';
                setStatus('No text selected. Highlight some text first.', 'idle');
            }
        }
    }
    updateGenerateBtn();
}

/* ── Update Generate button state ── */
function updateGenerateBtn() {
    $('#generateBtn').disabled = !(state.apiKey && state.voiceId);
}

/* ── Settings persistence ── */
async function loadSettings() {
    const data = await chrome.storage.local.get([
        'apiKey', 'voiceId', 'voiceName', 'modelId', 'autoOpenSidebar'
    ]);
    state.apiKey = data.apiKey || '';
    state.voiceId = data.voiceId || '';
    state.voiceName = data.voiceName || '';
    state.modelId = data.modelId || 'eleven_multilingual_v2';
    state.autoOpenSidebar = data.autoOpenSidebar !== false; // default true
    updateGenerateBtn();
}

async function saveSettings() {
    state.apiKey = $('#apiKeyInput').value.trim();
    state.modelId = $('#modelSelect').value;
    state.autoOpenSidebar = $('#autoOpenSidebarInput').checked;

    const voiceSelect = $('#voiceSelect');
    if (voiceSelect.value) {
        state.voiceId = voiceSelect.value;
        state.voiceName = voiceSelect.options[voiceSelect.selectedIndex]?.text || '';
    }

    await chrome.storage.local.set({
        apiKey: state.apiKey,
        voiceId: state.voiceId,
        voiceName: state.voiceName,
        modelId: state.modelId,
        autoOpenSidebar: state.autoOpenSidebar
    });

    updateGenerateBtn();
    showView('mainView');
    setStatus('Settings saved ✓', 'success');
}

/* ── Open settings ── */
function openSettings() {
    $('#apiKeyInput').value = state.apiKey;
    $('#modelSelect').value = state.modelId;
    $('#autoOpenSidebarInput').checked = state.autoOpenSidebar;
    if (state.voiceId) {
        ensureVoiceOption(state.voiceId, state.voiceName);
        $('#voiceSelect').value = state.voiceId;
    }
    showView('settingsView');
}

function ensureVoiceOption(id, name) {
    const select = $('#voiceSelect');
    let found = false;
    for (let opt of select.options) {
        if (opt.value === id) { found = true; break; }
    }
    if (!found) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name || id;
        select.appendChild(opt);
    }
}

/* ── Load voices from ElevenLabs ── */
async function loadVoices() {
    const apiKey = $('#apiKeyInput').value.trim();
    if (!apiKey) {
        setStatus('Enter your API key first.', 'error');
        return;
    }

    const btn = $('#loadVoicesBtn');
    btn.textContent = '…';
    btn.disabled = true;

    try {
        const res = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: { 'xi-api-key': apiKey }
        });

        if (!res.ok) throw new Error('API error ' + res.status);

        const data = await res.json();
        const select = $('#voiceSelect');
        select.innerHTML = '';

        (data.voices || []).forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voice_id;
            opt.textContent = v.name;
            select.appendChild(opt);
        });

        if (data.voices?.length) {
            select.value = data.voices[0].voice_id;
        }
    } catch (err) {
        setStatus('Failed to load voices: ' + err.message, 'error');
    } finally {
        btn.textContent = 'Load';
        btn.disabled = false;
    }
}

/* ── Generate audio ── */
async function generateAudio() {
    if (!state.apiKey || !state.voiceId) return;

    const btn = $('#generateBtn');
    btn.disabled = true;

    // Grab fresh selection (which triggers a copy in Docs, or fresh read)
    setStatus('Reading selection…', 'working');
    await fetchSelection();

    if (!state.selectedText) {
        setStatus('No text selected. Highlight text on the page first.', 'error');
        btn.disabled = false;
        updateGenerateBtn();
        return;
    }

    setStatus('Generating audio…', 'working');

    try {
        const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                action: 'generateFromPopup',
                text: state.selectedText,
                settings: {
                    apiKey: state.apiKey,
                    voiceId: state.voiceId,
                    voiceName: state.voiceName,
                    modelId: state.modelId,
                }
            }, (res) => {
                if (res && res.error) reject(new Error(res.error));
                else resolve(res);
            });
        });

        setStatus('✓ Saved: ' + result.filename, 'success');
    } catch (err) {
        setStatus('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        updateGenerateBtn();
    }
}

/* ── Event listeners ── */
$('#settingsBtn').addEventListener('click', openSettings);
$('#closeSettingsBtn').addEventListener('click', () => showView('mainView'));
$('#cancelSettingsBtn').addEventListener('click', () => showView('mainView'));
$('#saveSettingsBtn').addEventListener('click', saveSettings);
$('#loadVoicesBtn').addEventListener('click', loadVoices);
$('#generateBtn').addEventListener('click', generateAudio);
$('#refreshBtn').addEventListener('click', fetchSelection);

$('#closeSidebarBtn').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: 'closeSidebar' });
});

$('#openSidebarBtn').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleSidebar' });
        window.close(); // close the popup
    }
});

/* ── Init ── */
loadSettings().then(() => {
    fetchSelection();

    if (!state.apiKey) {
        setStatus('API Key Required', 'error');
        // Inject a prominent warning into the text preview area
        $('#textPreview').innerHTML = `
            <div style="color: var(--error); font-weight: 600; margin-bottom: 8px;">
                ⚠️ ElevenLabs API Key Missing
            </div>
            <ol style="margin-left: 16px; margin-top: 8px; color: var(--text); line-height: 1.6; font-size: 11px;">
                <li>Click the <strong>Settings (⚙)</strong> icon above.</li>
                <li>Go to <em>elevenlabs.io/app/settings/api-keys</em> to get your key.</li>
                <li>Paste it in Settings and click <strong>Load Voices</strong>.</li>
                <li>Pick a voice and click <strong>Save</strong>.</li>
            </ol>
        `;
        $('#textPreview').style.maxHeight = 'none'; // allow it to expand
        $('#generateBtn').disabled = true;
    }
});
