/* ═══════════════════════════════════════════════
   Auto Narration – Google Docs Sidebar Injector
   ═══════════════════════════════════════════════ */

if (!document.getElementById('auto-narration-sidebar-host')) {
    // Create sidebar container
    const host = document.createElement('div');
    host.id = 'auto-narration-sidebar-host';
    // Initially hidden off-screen to the right
    host.style.cssText = 'position: fixed; top: 0; right: -360px; width: 360px; height: 100vh; z-index: 999999999; background: #1a1a1e; border-left: 1px solid #3a3a40; box-shadow: -4px 0 15px rgba(0,0,0,0.3); transition: right 0.3s ease;';

    // Inject the popup UI as an iframe
    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html?mode=sidebar');
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    iframe.allow = "clipboard-read; clipboard-write";

    host.appendChild(iframe);
    document.body.appendChild(host);

    // Toggle function
    const toggleSidebar = (forceHide) => {
        const isVisible = host.style.right === '0px';
        if (isVisible || forceHide) {
            host.style.right = '-360px'; // Hide
        } else {
            host.style.right = '0px'; // Show
        }
    };

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'toggleSidebar') {
            toggleSidebar();
            sendResponse({ success: true });
            return true;
        }
        if (msg.action === 'closeSidebar') {
            toggleSidebar(true);
            sendResponse({ success: true });
            return true;
        }
        if (msg.action === 'docsCopyText') {
            // Restore focus to the hidden Docs text engine so it populates the clipboard
            const eventIframe = document.querySelector('.docs-texteventtarget-iframe');
            if (eventIframe) eventIframe.focus();
            else {
                const editor = document.querySelector('.kix-appview-editor');
                if (editor) editor.focus();
            }

            // Execute copy (this works here because content scripts share the origin of the page)
            document.execCommand('copy');

            // Wait briefly for the clipboard to populate, then read it and return the result
            setTimeout(async () => {
                try {
                    const text = await navigator.clipboard.readText();
                    sendResponse({ success: true, text: text });
                } catch (e) {
                    console.error("Docs clipboard read failed:", e);
                    sendResponse({ success: false, text: '' });
                }
            }, 150);

            return true; // Keep the message channel open for the async response
        }
    });

    // Auto-open if setting is enabled
    chrome.storage.local.get(['autoOpenSidebar'], (data) => {
        if (data.autoOpenSidebar !== false) { // default true
            // Small delay to let Docs UI settle before sliding in
            setTimeout(() => toggleSidebar(false), 1000);
        }
    });
}
