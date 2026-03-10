# 🎙️ Auto Narration Bridge

Highlight text. Click a button. The voiceover drops into your Premiere timeline. That's it.

---

## ✨ What does it do?

Two extensions that work together to give you instant AI voiceovers:

**Step 1 — Chrome Extension (Generate Audio)**

- 🌐 Works on **Google Docs**, webpages, PDFs — literally anything in Chrome.
- 📝 On Google Docs, a sidebar auto-opens right next to your script. No setup needed.
- 🪄 Highlight text, hit **Generate Audio**, and the voiceover downloads instantly.
- 🖱️ Or just right-click any selected text → **"Generate Narration"**.

**Step 2 — Premiere Pro Extension (Import & Insert)**

- ⏸️ Put your playhead where you want the audio.
- ⬇️ Click **"Insert Latest"**.
- 🎉 Done. The audio is on your timeline.

---

## 🛠️ Setup (5 minutes, no coding required!)

### 0. Download the Project

1. Go to the [**Releases page**](https://github.com/Dylanyz/auto-narration/releases).
2. Download the latest release (click the **Source code (zip)** link).
3. Unzip it somewhere easy to find, like your **Desktop**.

Now follow the steps below using the unzipped folder.

### 1. Install the Chrome Extension

1. Open **Google Chrome**.
2. Go to `chrome://extensions/` in the address bar.
3. Turn on **Developer mode** (top right toggle).
4. Click **Load unpacked** (top left).
5. Pick the `chrome-extension` folder from this project.
6. 📌 **Pin it** to your toolbar so you can always see the icon!

That's it — open any Google Doc and the sidebar will slide in automatically.

### 2. Get Your AI Voice (Free)

1. Create a free account at [elevenlabs.io](https://elevenlabs.io/).
2. Click your profile icon (bottom left) → **Profile + API key**.
3. Reveal and copy your **API Key**.
4. Back in Chrome, click the **Auto Narration** icon (or use the Google Docs sidebar).
5. Hit the **⚙ Settings** gear.
6. Paste your API key, click **Load** to fetch your voices, pick one, and click **Save**.

You're ready to generate!

### 3. Install the Premiere Pro Extension

Mac only. Premiere Pro 2021 or newer. One-time setup.

1. Open **Terminal** (`Cmd + Space`, type "Terminal", hit Enter).
2. Type `sh ` (with a space after it).
3. Drag the `install.sh` file from the `premiere-extension` folder into the Terminal window.
4. Hit **Enter**.
5. **Restart Premiere Pro** if it was already running.
6. Go to **Window → Extensions → Auto Narration Bridge**.
7. Dock the panel wherever you like!

---

## 📖 How To Use

### Chrome Extension


| What you want to do       | How to do it                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------- |
| Generate from Google Docs | Highlight text in your doc → click**Generate Audio** in the sidebar                |
| Generate from any webpage | Highlight text → right-click →**Generate Narration**                              |
| Generate from the popup   | Click the extension icon → it auto-reads your selection → click**Generate Audio** |

Audio files are saved to your browser's **Downloads** folder automatically.

> **Google Docs note:** The extension reads your selection by briefly copying it, which replaces your clipboard. A warning is shown in the sidebar.

### Premiere Pro Extension


| What you want to do          | How to do it                                                           |
| ------------------------------ | ------------------------------------------------------------------------ |
| Import a file to your bin    | Click**Import Latest** (or the **+** button next to any file)          |
| Import AND place on timeline | Click**Insert Latest** (or the **→** button next to any file)         |
| Change the watch folder      | Settings →**Audio Files Folder** (defaults to ~/Downloads)            |
| Change the target bin        | Settings →**Target Bin** (e.g. `Audio/VO` — auto-created if missing) |
| Change the audio track       | Settings →**Audio Track** (A1, A2, A3, etc.)                          |

### Keyboard Shortcuts (Premiere)

**Panel shortcuts** — work when the Auto Narration panel is focused:

1. Open Settings in the panel.
2. Click the **Record** button next to Import Latest or Insert Latest.
3. Press your desired key combo (e.g. `Cmd+I`). It saves automatically.

**Global shortcuts** — work even while editing the timeline:

1. In the panel's Settings, click **Copy** next to the menu title you want (`AN: Import Latest` or `AN: Insert Latest`).
2. On your Mac, go to **System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts**.
3. Click **+**, choose **Adobe Premiere Pro**, paste the menu title, and assign your shortcut.

---

## ❓ Troubleshooting

**"No active sequence" error in Premiere?**
You need a sequence open and selected before importing/inserting audio.

**ElevenLabs API error?**
Double-check your API key in the Chrome extension settings and make sure you have credits left on [elevenlabs.io](https://elevenlabs.io/).

**Premiere extension not showing up?**
Make sure you ran `install.sh` in Terminal and fully restarted Premiere Pro.

**Chrome extension not reading Google Docs text?**
Reload the extension at `chrome://extensions/` (click the refresh icon), then reload your Google Doc tab.
