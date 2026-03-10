# 🎙️ Auto Narration Bridge

Welcome! This tool makes adding AI voiceovers to your videos **super fast** and **easy**. No more downloading files, dragging them into Premiere, and lining them up.

---

## ✨ What does it do?

It bridges the gap between your script and your video editor in two simple steps:

**1. The Google Docs Add-on (Primary Text to Speech)**
- 📝 Perfect for scriptwriting. Lives directly inside a handy sidebar right next to your Google Doc.
- 🪄 Highlight your script, smash "Generate Audio", and it instantly creates a high-quality AI voiceover using ElevenLabs that saves directly to your computer.

**1.5. The Chrome Extension (Optional Backup)**
- 🌐 Want to narrate a random webpage or PDF? Use the companion Chrome Extension to highlight text *anywhere* on the web and generate audio from the right-click menu.

**2. The Premiere Pro Extension (Auto Import/Insert)**
- 🎬 Open Premiere Pro
- ⏸️ Put your playhead exactly where you want the audio to start
- ⬇️ Click **"Insert Latest"**
- 🎉 The audio drops right into your timeline. Boom. Done.

---

## 🛠️ Installation Guide (Super Simple!)

Don't worry if you've never used code or the terminal before. Just follow these steps one by one. We will hold your hand!

### Part 1: Install the Google Docs Add-on

Since you write scripts in Google Docs, we built a custom native sidebar just for you! It's super fast to hook up:

1. 🔗 **Open this link:** [Auto Narration Docs Add-on](https://script.google.com/d/1mOMwLVAiIJYbG8XJv05JvePI5FMxP18GSjRonltXRmh48RLvrvtQXUqV/edit?usp=sharing)
2. 🚀 Click the blue **Deploy** button (top right) ➡️ **Test deployments**.
3. 🔄 Set **Version** to `Latest Code`.
4. ✅ Set **Config** to `Installed and enabled`.
5. 📄 Set **Test document** to whichever document you want it to be active on!
6. 💾 Click **Install**, then click **Done**.

*(Note: Google will ask you to authorize it since it's a custom app. Just click your account ➡️ Advanced ➡️ Go to Auto Narration ➡️ Allow!)*

### Part 1.5: Get Your Free AI Voice (API Key)

To make the voices talk, we use ElevenLabs. You just need to paste in a secret key to link your account!
1. Go to [ElevenLabs.io](https://elevenlabs.io/) and create a free account.
2. Click your profile icon in the bottom left corner and select **Profile + API key**.
3. Click the eye icon to reveal your **API Key**, and copy it.
4. Open the **Auto Narration** sidebar inside your Google Doc (Extensions ➡️ Auto Narration).
5. Paste your API Key into the Settings box and generate!

### Part 1.7: Install the Chrome Extension (Optional)

If you ever need to generate audio from a random webpage and not just Google Docs, install this backup tool:

1. Open **Google Chrome**.
2. Type `chrome://extensions/` into your address bar and press Enter.
3. Turn on **Developer mode** (toggle switch top right).
4. Click **Load unpacked** (top left).
5. Select the `auto-narration` ➡️ `chrome-extension` folder.
6. 🧩 **Pro Tip:** Pin it to your browser bar for easy access!

### Part 2: Install the Premiere Pro Extension

You only have to do this once! (Mac only, Premiere Pro 2021 or newer). 

1. Open the **Terminal** app on your Mac. (Press `Cmd + Space` on your keyboard, type "Terminal", and hit Enter).
2. Type `sh ` (make sure to include the space after it!).
3. Find the `auto-narration` ➡️ `premiere-extension` folder on your computer.
4. Drag the `install.sh` file from that folder directly into the Terminal window.
5. Press **Enter**.
6. 🔄 **Restart Premiere Pro** if it was already open.
7. In Premiere, go to the very top menu bar: **Window ➡️ Extensions ➡️ Auto Narration Bridge**.
8. The panel will open! You can drag and dock it wherever you like in your workspace.

---

## 📚 Full Documentation & Features

Here is exactly how to use every setting in the tool!

### 📄 The Google Docs Add-on
*   **The Sidebar:** Open it inside any Google Doc via `Extensions ➡️ Auto Narration`.
*   **Generate Audio:** Highlight your script text in the document and click the big blue Generate button.
*   **Auto-Save:** Audio files will automatically be downloaded and saved directly to your browser's default Downloads folder.

### 🌐 The Chrome Extension (Optional)
*   **Webpage Extraction:** Highlight text on any public webpage or PDF, right-click, and select "Generate Narration".
*   **Pop-up Text Pad:** Click the extension icon in your Chrome bar to paste custom text and generate it on the fly.

### 🎬 The Premiere Pro Extension
*   **Import Latest:** Grabs your newest audio file and adds it to your project bin, *without* putting it on the timeline so you can place it manually.
*   **Insert Latest:** The magic button! Grabs your newest audio file, imports it to the bin, AND drops it exactly where your playhead is on the timeline.
*   **Individual File Buttons:** You can also click "Import" or "Insert" next to any specific file in your recent history if you don't want the latest one.
*   **Settings (The Gear Icon ⚙️):**
    *   **Audio Files Folder:** Tell the extension where you save your files (e.g., your Downloads folder).
    *   **Target Bin:** Type in the name of the folder (bin) in Premiere where you want the audio to live (e.g., `Audio/Voiceovers`). It will magically create the folder if it doesn't exist yet!
    *   **Audio Track:** Choose which audio track (A1, A2, A3, etc.) the voiceover should be placed on in your sequence.
    *   **Max Files to Scan:** How many recent files to show in your list. Lower equals faster loading!
    *   **Refresh before Latest:** Checks for new files automatically before importing/inserting.
*   **Global Keyboard Shortcuts:** You can set native Premiere shortcuts! In Premiere, go to **Edit ➡️ Keyboard Shortcuts** (or Premiere Pro ➡️ Keyboard Shortcuts on Mac), search for `"AN: Insert Latest"` or `"AN: Import Latest"`, and add your favorite key combo.

---

## ❓ Troubleshooting

**"No active sequence" error in Premiere?**
Oops! You need to have a sequence open and clicked on before it can import the audio. 

**ElevenLabs API Error?**
Double-check that you entered your ElevenLabs API Key correctly in the Chrome extension settings and that you have enough credits in your ElevenLabs account!

**Extension doesn't appear in Premiere's Window menu?**
Make sure you ran the `install.sh` commands in the terminal correctly and completely restarted Premiere Pro.
