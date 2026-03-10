/* ═══════════════════════════════════════════════
   Auto Narration – Google Docs Sidebar Injector
   ═══════════════════════════════════════════════ */

if (!document.getElementById('auto-narration-sidebar-host')) {
    const host = document.createElement('div');
    host.id = 'auto-narration-sidebar-host';
    host.style.cssText = 'position: fixed; top: 0; right: -360px; width: 360px; height: 100vh; z-index: 999999999; background: #1a1a1e; border-left: 1px solid #3a3a40; box-shadow: -4px 0 15px rgba(0,0,0,0.3); transition: right 0.3s ease;';

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL('popup.html?mode=sidebar');
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    iframe.allow = "clipboard-read; clipboard-write";

    host.appendChild(iframe);
    document.body.appendChild(host);

    const toggleSidebar = (forceHide) => {
        const isVisible = host.style.right === '0px';
        if (isVisible || forceHide) {
            host.style.right = '-360px';
        } else {
            host.style.right = '0px';
        }
    };

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getDocsIframe() {
        return document.querySelector('.docs-texteventtarget-iframe');
    }

    /**
     * Try to read the Docs selection via the hidden iframe's getSelection API.
     * No clipboard impact.
     */
    function tryIframeSelection() {
        try {
            const eventIframe = getDocsIframe();
            if (eventIframe && eventIframe.contentDocument) {
                const sel = eventIframe.contentDocument.getSelection();
                const text = sel ? sel.toString() : '';
                if (text && text.trim()) return text.trim();
            }
        } catch (e) {
            console.warn('Strategy 1 (iframe getSelection) failed:', e);
        }
        return '';
    }

    async function readClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            return (text && text.trim()) ? text.trim() : '';
        } catch (e) {
            return '';
        }
    }

    /**
     * Programmatic copy via multiple approaches, then read clipboard.
     * Google Docs' copy handler lives inside .docs-texteventtarget-iframe,
     * so we must target that iframe's document specifically.
     */
    async function tryCopyAndRead() {
        const eventIframe = getDocsIframe();

        // Approach 1: execCommand('copy') on the IFRAME's contentDocument.
        // Google Docs attaches its copy handler inside this iframe — calling
        // execCommand on the outer document misses it entirely.
        if (eventIframe && eventIframe.contentDocument) {
            for (const delay of [250, 500]) {
                try {
                    eventIframe.focus();
                    await sleep(30);
                    eventIframe.contentDocument.execCommand('copy');
                    await sleep(delay);
                    const text = await readClipboard();
                    if (text) return text;
                } catch (e) {
                    console.warn('Approach 1 (iframe execCommand) failed:', e);
                }
            }
        }

        // Approach 2: execCommand('copy') on the outer document with iframe focused.
        // Fallback in case the iframe's contentDocument is restricted.
        for (const delay of [250, 500]) {
            try {
                if (eventIframe) eventIframe.focus();
                else {
                    const editor = document.querySelector('.kix-appview-editor');
                    if (editor) editor.focus();
                }
                await sleep(30);
                document.execCommand('copy');
                await sleep(delay);
                const text = await readClipboard();
                if (text) return text;
            } catch (e) {
                console.warn('Approach 2 (outer execCommand) failed:', e);
            }
        }

        // Approach 3: Simulate Cmd+C / Ctrl+C keyboard events on the iframe.
        // Google Docs intercepts keyboard events with its own handler which
        // reads its internal selection model and writes to the clipboard.
        if (eventIframe && eventIframe.contentDocument) {
            try {
                eventIframe.focus();
                await sleep(30);
                const target = eventIframe.contentDocument.body || eventIframe.contentDocument.documentElement;
                const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
                const evProps = {
                    key: 'c', code: 'KeyC', keyCode: 67, which: 67,
                    ctrlKey: !isMac, metaKey: isMac,
                    bubbles: true, cancelable: true, composed: true
                };
                target.dispatchEvent(new KeyboardEvent('keydown', evProps));
                target.dispatchEvent(new KeyboardEvent('keypress', evProps));
                await sleep(100);
                target.dispatchEvent(new KeyboardEvent('keyup', evProps));
                await sleep(400);
                const text = await readClipboard();
                if (text) return text;
            } catch (e) {
                console.warn('Approach 3 (keyboard simulation) failed:', e);
            }
        }

        return '';
    }

    /**
     * Main extraction: tries iframe getSelection first (no clipboard impact),
     * then falls back to programmatic copy (replaces clipboard).
     */
    async function docsExtractSelection() {
        const direct = tryIframeSelection();
        if (direct) return direct;
        return await tryCopyAndRead();
    }

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
        if (msg.action === 'docsGetSelection' || msg.action === 'docsCopyText') {
            docsExtractSelection().then(text => {
                sendResponse({ success: !!text, text: text });
            });
            return true;
        }
    });

    chrome.storage.local.get(['autoOpenSidebar'], (data) => {
        if (data.autoOpenSidebar !== false) {
            setTimeout(() => toggleSidebar(false), 1000);
        }
    });
}
