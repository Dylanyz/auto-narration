/* ═══════════════════════════════════════════════
   Auto Narration – Background Service Worker
   ═══════════════════════════════════════════════ */

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'generateNarration',
        title: 'Generate Narration',
        contexts: ['selection']
    });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'generateNarration') return;

    let text = info.selectionText;

    // On Google Docs, selectionText is empty due to canvas rendering —
    // ask the content script to extract it via the multi-strategy cascade
    if ((!text || !text.trim()) && tab.url && tab.url.includes('docs.google.com/document')) {
        try {
            const res = await chrome.tabs.sendMessage(tab.id, { action: 'docsGetSelection' });
            if (res && res.text) text = res.text;
        } catch (e) {
            console.warn('Docs context menu text extraction failed:', e);
        }
    }

    if (!text || !text.trim()) return;

    // Get settings from storage
    const settings = await chrome.storage.local.get([
        'apiKey', 'voiceId', 'voiceName', 'modelId'
    ]);

    if (!settings.apiKey || !settings.voiceId) {
        // Notify user to configure settings
        chrome.action.openPopup?.();
        // Also inject a notification directly if openPopup fails or isn't supported
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => alert('Auto Narration: Please click the extension icon and add your ElevenLabs API Key in Settings first.')
        }).catch(() => { });
        return;
    }

    try {
        // Call ElevenLabs TTS
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}`,
            {
                method: 'POST',
                headers: {
                    'xi-api-key': settings.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg',
                },
                body: JSON.stringify({
                    text: text,
                    model_id: settings.modelId || 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                })
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('ElevenLabs error:', response.status, errText);
            return;
        }

        const blob = await response.blob();
        const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
        const voiceName = (settings.voiceName || 'Voice').replace(/\s+/g, '');
        const filename = `AutoVO_${voiceName}_${timestamp}.mp3`;

        // Convert blob to data URL for download
        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            chrome.downloads.download({
                url: dataUrl,
                filename: filename,
                saveAs: false
            });
        };
        reader.readAsDataURL(blob);

    } catch (err) {
        console.error('Narration generation failed:', err);
    }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getSelection') {
        // Query the active tab for selected text
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                sendResponse({ text: '' });
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getSelection' }, (response) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ text: '' });
                } else {
                    sendResponse(response || { text: '' });
                }
            });
        });
        return true; // async response
    }

    if (msg.action === 'generateFromPopup') {
        generateAudio(msg.text, msg.settings).then(result => {
            sendResponse(result);
        }).catch(err => {
            sendResponse({ error: err.message });
        });
        return true; // async response
    }
});

async function generateAudio(text, settings) {
    const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}`,
        {
            method: 'POST',
            headers: {
                'xi-api-key': settings.apiKey,
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg',
            },
            body: JSON.stringify({
                text: text,
                model_id: settings.modelId || 'eleven_multilingual_v2',
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        }
    );

    if (!response.ok) {
        const errText = await response.text();
        throw new Error('ElevenLabs error ' + response.status + ': ' + errText.slice(0, 120));
    }

    const blob = await response.blob();
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const voiceName = (settings.voiceName || 'Voice').replace(/\s+/g, '');
    const filename = `AutoVO_${voiceName}_${timestamp}.mp3`;

    // Convert blob to data URL for download
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            chrome.downloads.download({
                url: reader.result,
                filename: filename,
                saveAs: false
            }, (downloadId) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve({ success: true, filename: filename, downloadId: downloadId });
                }
            });
        };
        reader.onerror = () => reject(new Error('Failed to read audio blob'));
        reader.readAsDataURL(blob);
    });
}
