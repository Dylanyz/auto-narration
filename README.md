# 🎙️ Auto Narration Bridge

Highlight text. Click a button. The voiceover drops into your Premiere timeline. That's it.

---

## ✨ What does it do?

Two extensions that work together to give you instant AI voiceovers:

**Step 1 — Chrome Extension (Generate Audio)**

- 🌐 Works on **Google Docs**, webpages, PDFs — literally anything in Chrome.
- 📝 On Google Docs, a sidebar can open right next to your script (optional in Settings).
- 🪄 Highlight text, hit **Generate Audio**, and the voiceover downloads instantly.
- 🖱️ Or right-click any selected text → **"Generate Narration"**.

**Step 2 — Premiere Pro Extension (Import & Insert)**

- ⏸️ Put your playhead where you want the audio.
- ⬇️ Click **Insert Latest** (or use a keyboard shortcut).
- 🎉 Done. The audio is on your timeline.

---

## 📋 Before you start

Check these once — then you can forget about them:

- **Chrome** (or another Chromium browser) installed.
- **Premiere Pro 2021 or newer**, on **Mac only** (the Premiere extension is Mac-only).
- **5–10 minutes** for first-time setup. No coding, no command line experience needed.

---

## 🛠️ Setup — follow the steps in order

### Step 0: Download the project

1. Open this link in your browser: [**Releases**](https://github.com/Dylanyz/auto-narration/releases).
2. On the latest release, click **"Source code (zip)"** to download.
3. Unzip the file (double-click it). Put the folder somewhere easy to find (e.g. **Desktop**).
4. Open that folder. You should see two folders inside: **`chrome-extension`** and **`premiere-extension`**.

**You’re good when:** You have one folder on your Desktop (or wherever) with `chrome-extension` and `premiere-extension` inside it.

---

### Step 1: Install the Chrome extension

Do these one at a time:

1. Open **Google Chrome**.
2. In the address bar at the top, type: `chrome://extensions/` and press **Enter**.
3. On the **top right**, find the switch that says **"Developer mode"**. Turn it **ON**.
4. On the **top left**, click **"Load unpacked"**.
5. A window will open. Go to the folder you unzipped (the one that has `chrome-extension` inside it).
6. **Open** the **`chrome-extension`** folder (double-click it). Do **not** open any file inside it — stay in the folder that contains files like `manifest.json` and `popup.html`.
7. Click **"Select"** or **"Open"** (depending on your Mac).
8. In the extensions page, find **"Auto Narration"**. Click the **pin icon** so it appears in your toolbar — that way you can always see it.

**You’re good when:** You see "Auto Narration" in your Chrome extensions list and its icon in the toolbar. Open any Google Doc — you can use the extension from the icon or, if you turned it on in Settings, a sidebar may open automatically.

---

### Step 2: Get your AI voice (free)

1. Go to [**elevenlabs.io**](https://elevenlabs.io/) and create a **free account**.
2. Click your **profile icon** (bottom left) → **"Profile + API key"** (or go to [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys)).
3. **Reveal** your API key and **copy** it.
4. In Chrome, click the **Auto Narration** icon in the toolbar (or open the sidebar in a Google Doc).
5. Click the **⚙ Settings** (gear) button.
6. **Paste** your API key in the box.
7. Click **"Load"** next to the Voice dropdown — your voices will appear. **Pick one** from the list.
8. (Optional) Choose a **Model** (e.g. "Multilingual v2" or "Turbo v2.5" for speed).
9. (Optional) Check **"Open sidebar automatically on Docs pages"** if you want the sidebar to open every time you open a Doc.
10. Click **"Save Settings"**.

**You’re good when:** You can highlight some text, click **Generate Audio**, and an audio file appears in your **Downloads** folder.

---

### Step 3: Install the Premiere Pro extension (Mac only)

Do these one at a time. You’ll use **Terminal** once — you only type one thing (and we tell you exactly what).

1. **Quit Premiere Pro** if it’s open (so the extension loads correctly when you reopen it).
2. On your Mac, press **Cmd + Space**, type **Terminal**, then press **Enter**. A window with a black or white background will open — that’s Terminal.
3. Type: **`sh `** (the letters s and h, then a **space**). Do **not** press Enter yet.
4. Open **Finder**. Go to the folder you unzipped → open the **`premiere-extension`** folder.
5. Find the file named **`install.sh`**. **Drag** that file from Finder **into** the Terminal window. Terminal will type the path for you.
6. Press **Enter**.
7. You should see messages like "Enabling CEP debug mode…" and "✅ Installation complete!"
8. **Open Premiere Pro**. Go to **Window → Extensions → Auto Narration Bridge**. The panel will open — dock it wherever you like.

**You’re good when:** You see the "Auto Narration" panel in Premiere with "Import Latest" and "Insert Latest" buttons. If you don’t see it, make sure Premiere was fully quit before you ran the installer, then try **Window → Extensions → Auto Narration Bridge** again.

---

## 📖 How to use

### Chrome extension

| What you want to do | How to do it |
|---------------------|--------------|
| Generate from Google Docs | Highlight text in your doc → click **Generate Audio** in the sidebar (or in the popup). |
| Generate from any webpage | Highlight text → right-click → **"Generate Narration"**. |
| Generate from the popup | Click the extension icon → it shows your current selection → click **Generate Audio**. |

Audio files are saved to your browser’s **Downloads** folder.

> **Google Docs note:** The extension reads your selection by briefly copying it, which replaces your clipboard. A warning is shown in the sidebar.

---

### Premiere Pro extension

| What you want to do | How to do it |
|---------------------|--------------|
| Import a file to your project bin | Click **Import Latest** (or the **+** button next to a file in the list). |
| Import and place on timeline at playhead | Click **Insert Latest** (or the **→** button next to a file in the list). |
| Change where audio files are read from | **Settings** tab → **Audio Files Folder** (default is your Downloads folder). |
| Change the bin in Premiere where files go | **Settings** tab → **Target Bin** (e.g. `Audio/VO` — created automatically if missing). |
| Change which audio track is used | **Settings** tab → **Audio Track** (1 = first track A1, 2 = A2, etc.). |

**You need a sequence open and selected** before importing or inserting — otherwise you’ll see a "No active sequence" message.

**Optional settings** (in the Premiere panel’s Settings tab): **Max Files to Scan** (faster list for big folders), **Refresh file list before Import/Insert Latest**, and **Re-import audio for every insert** (vs reusing an already-imported clip).

---

### Keyboard shortcuts (Premiere)

**Panel shortcuts** — work when the Auto Narration panel is focused (you’ve clicked inside it):

1. Open the **Settings** tab in the panel.
2. Find **Panel Shortcuts**.
3. Click the **shortcut button** next to "Import Latest" or "Insert Latest" (it may say "None").
4. Press the key you want (e.g. **I** for Import, **P** for Insert). It saves automatically.  
   *(Note: only single keys work when the panel is focused, not Cmd+key combos.)*

**Global shortcuts** — work from anywhere (timeline, bins, etc.), even when the panel isn’t focused:

1. In the panel’s **Settings**, find **Global Shortcuts**.
2. Click **Copy** next to **"AN: Import Latest"** or **"AN: Insert Latest"**.
3. On your Mac: **System Settings → Keyboard → Keyboard Shortcuts → App Shortcuts**.
4. Click **+**, choose **Adobe Premiere Pro**, paste the menu title exactly, and assign your key combo (e.g. **Cmd+Shift+I**).
5. **Each time you open Premiere**, click **Activate** in the Auto Narration panel once (or open **Window → Extensions** and open the panel). After that, your global shortcut will work until you quit Premiere.

---

## ❓ Troubleshooting

**"No active sequence" in Premiere?**  
Open a sequence and click on it so it’s the active tab, then try Import or Insert again.

**ElevenLabs API error?**  
Check your API key in the Chrome extension Settings. Make sure you have credits left at [elevenlabs.io](https://elevenlabs.io/).

**Premiere extension not showing up?**  
Quit Premiere completely, run `install.sh` again (Step 3), then open Premiere and go to **Window → Extensions → Auto Narration Bridge**.

**Chrome extension not reading Google Docs text?**  
At `chrome://extensions/`, click the **refresh** icon on the Auto Narration extension. Reload your Google Doc tab and try again.

**Global shortcut doesn’t do anything?**  
Click **Activate** in the Auto Narration panel once after opening Premiere (or open the panel from Window → Extensions). The shortcut only works after that until you quit Premiere.
