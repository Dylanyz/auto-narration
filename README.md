# Auto Narration Bridge

A two-step workflow tool for video editors. Select text in Google Docs → generate AI voiceover → import to your Premiere Pro timeline at the playhead. No servers, no hacks.

---

## How it works

| Step | What you do | What happens |
|------|-------------|--------------|
| **1** | Select text in Google Docs, click **Generate Audio** | ElevenLabs converts it to `.mp3`, saved directly to your configured folder |
| **2** | In Premiere, click **Import Latest** (or pick from the list) | The file is imported into your project bin and inserted at the playhead |

---

## Setup

### Part A — Google Docs Add-on

1. Open any Google Doc.
2. Go to **Extensions → Apps Script**.
3. Delete the placeholder code and paste in the contents of `google-docs-addon/Code.gs`.
4. Click the **+** next to "Files" and add an HTML file named `Sidebar`. Paste in the contents of `google-docs-addon/Sidebar.html`.
5. Click **Save**, then **Deploy → Test deployments → Install** (or Deploy as Add-on for permanent use).
6. Back in your Google Doc, refresh the page. You'll see **Extensions → Auto Narration → Open Auto Narration** in the menu.
7. Open the sidebar and click the ⚙️ **Settings** icon:
   - Paste your [ElevenLabs API key](https://elevenlabs.io/app/settings/api-keys)
   - Click **Load** to fetch your voices, then select one
   - Click **Browse…** to pick your save folder (e.g. `~/Documents/VO-Files`)
   - Click **Save Settings**

> **Note:** The folder picker uses Chrome's File System Access API. You'll need to grant folder access once per browser session when you first click Generate Audio.

---

### Part B — Premiere Pro Extension

**Requirements:** Adobe Premiere Pro 2021 (v15) or later, macOS

#### Install

1. Open Terminal.
2. `cd` into the `premiere-extension` folder:
   ```
   cd "/Users/dyl/Desktop/Coding/auto-narration/premiere-extension"
   ```
3. Make the installer executable and run it:
   ```
   chmod +x install.sh && ./install.sh
   ```
4. Quit and re-open Premiere Pro.
5. Go to **Window → Extensions → Auto Narration Bridge**.

#### Configure

In the Premiere extension, click **Settings** and fill in:

- **Audio Files Folder** — the exact same folder you set in the Google Docs plugin (e.g. `/Users/you/Documents/VO-Files`)
- **Target Bin** — where in your Premiere project to import the file (e.g. `Audio/VO`). Leave blank for the project root. Nested bins like `Audio/VO/Temp` are created automatically.
- **Audio Track** — which audio track to insert onto (1 = A1, 2 = A2, etc.)

Click **Save Settings**.

---

## Usage

1. **In Google Docs:** Highlight the narration text you want converted. Click **Generate Audio** in the sidebar. Wait a few seconds.
2. **In Premiere Pro:** Position your playhead where you want the clip. Click **Import Latest** in the panel (or click **Import** next to a specific file in the list).

That's it.

---

## File structure

```
auto-narration/
├── README.md
├── google-docs-addon/
│   ├── Code.gs           ← Apps Script (server-side)
│   └── Sidebar.html      ← Sidebar UI (client-side JS + ElevenLabs API)
└── premiere-extension/
    ├── install.sh        ← One-time installer
    ├── CSXS/
    │   └── manifest.xml  ← CEP extension metadata
    ├── index.html        ← Panel UI
    ├── main.js           ← Panel logic (Node.js + file system)
    └── premiere.jsx      ← ExtendScript (Premiere DOM access)
```

---

## Troubleshooting

**Extension doesn't appear in Premiere's Window menu**
- Make sure you ran `install.sh` and restarted Premiere.
- Check that `PlayerDebugMode` was set: `defaults read com.adobe.CSXS.11 PlayerDebugMode` should return `1`.

**"No active sequence" error**
- Open a sequence in Premiere before clicking Import Latest.

**ElevenLabs API error in Docs**
- Double-check your API key in Settings. Make sure your ElevenLabs account has available credits.

**Folder picker doesn't work**
- The File System Access API requires Chrome or Edge (not Safari or Firefox). Make sure you're using Google Docs in Chrome.
