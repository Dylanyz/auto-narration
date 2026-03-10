/* ═══════════════════════════════════════════════
   Auto Narration – Content Script
   Reads selected text from any webpage.
   ═══════════════════════════════════════════════ */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getSelection') {
        const selection = window.getSelection();
        sendResponse({ text: selection ? selection.toString() : '' });
    }
});
