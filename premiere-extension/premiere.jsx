/**
 * premiere.jsx  —  ExtendScript for Auto Narration Bridge
 *
 * These functions are called from the CEP panel via evalScript().
 * They run inside Premiere Pro's scripting engine and have full
 * access to the Premiere DOM (app.project, sequences, bins, etc.)
 */

// ─────────────────────────────────────────────────────────────
//  Entry point called from the panel
// ─────────────────────────────────────────────────────────────
/**
 * Import an audio file, place it in the specified bin,
 * and insert it at the playhead on the specified audio track.
 *
 * @param {string}  filePath   - Absolute path to the .mp3 / .wav file
 * @param {string}  binPath    - Slash-separated bin path, e.g. "VO/Temp"
 *                                Empty string = project root
 * @param {number}  trackIndex - 0-based audio track index
 * @param {boolean} reimport   - If true, always import (current behaviour).
 *                                If false, reuse existing item in bin if found.
 * @returns {string} "OK" on success, or an error message
 */
function importAndPlace(filePath, binPath, trackIndex, reimport) {
  try {
    var project = app.project;
    var sequence = project.activeSequence;

    if (!sequence) {
      return 'ERROR: No active sequence. Open a sequence in Premiere first.';
    }

    // Make sure Premiere can find the file
    var file = new File(filePath);
    if (!file.exists) {
      return 'ERROR: File not found: ' + filePath;
    }

    // Resolve / create target bin
    var targetBin = binPath && binPath.trim()
      ? getOrCreateBin(project.rootItem, binPath.trim())
      : project.rootItem;

    var fileName = filePath.replace(/.*[\/\\]/, ''); // basename
    var projectItem = null;

    if (reimport !== true) {
      // Try to find an already-imported item in the target bin (same file path)
      projectItem = findItemByFilePath(targetBin, filePath);
    }

    if (!projectItem) {
      // Import the file into the target bin
      project.importFiles(
        [filePath],
        true,   // suppressUI
        targetBin,
        false   // not as numbered stills
      );

      // Locate the newly imported item by filename
      projectItem = findItemByName(targetBin, fileName);

      if (!projectItem) {
        // Fallback: search the whole project
        projectItem = findItemByName(project.rootItem, fileName);
      }
    }

    if (!projectItem) {
      return 'ERROR: File imported but could not be located in the project. Check the bin.';
    }

    // Validate the requested audio track
    var tracks = sequence.audioTracks;
    if (trackIndex < 0 || trackIndex >= tracks.numTracks) {
      return 'ERROR: Audio track ' + (trackIndex + 1) + ' does not exist. ' +
        'The sequence has ' + tracks.numTracks + ' audio track(s).';
    }

    var track = tracks[trackIndex];
    var playhead = sequence.getPlayerPosition();

    // Insert clip at playhead (pushes downstream clips forward)
    track.insertClip(projectItem, playhead.seconds);

    return 'OK';

  } catch (e) {
    return 'ERROR: ' + (e.message || String(e));
  }
}

// ─────────────────────────────────────────────────────────────
//  Utility: Recursively find or create a bin by path
//  e.g. "Audio/VO/Temp" creates all three levels if needed
// ─────────────────────────────────────────────────────────────
function getOrCreateBin(parentItem, path) {
  var parts = path.split('/');
  var current = parentItem;

  for (var i = 0; i < parts.length; i++) {
    var name = parts[i].trim();
    if (!name) continue;

    var found = null;
    for (var j = 0; j < current.children.numItems; j++) {
      var child = current.children[j];
      // ProjectItemType.BIN === 2
      if (child.type === ProjectItemType.BIN && child.name === name) {
        found = child;
        break;
      }
    }

    current = found ? found : current.createBin(name);
  }

  return current;
}

// ─────────────────────────────────────────────────────────────
//  Utility: Find a project item by (exact) name inside a bin
// ─────────────────────────────────────────────────────────────
function findItemByName(bin, name) {
  // Strip extension for loose matching (Premiere may show name without it)
  var nameNoExt = name.replace(/\.[^.]+$/, '');

  for (var i = 0; i < bin.children.numItems; i++) {
    var item = bin.children[i];
    if (item.name === name || item.name === nameNoExt) {
      return item;
    }
    if (item.type === ProjectItemType.BIN) {
      var result = findItemByName(item, name);
      if (result) return result;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
//  Utility: Find a project item in bin that matches the given file path.
//  Uses findItemsMatchingMediaPath when available, else falls back to
//  matching by filename in the target bin.
// ─────────────────────────────────────────────────────────────
function findItemByFilePath(bin, filePath) {
  var project = app.project;
  var normalizedPath = filePath.replace(/\\/g, '/');

  try {
    if (project.rootItem.findItemsMatchingMediaPath) {
      var matches = project.rootItem.findItemsMatchingMediaPath(filePath, false);
      if (matches && matches.length > 0) {
        for (var m = 0; m < matches.length; m++) {
          var item = matches[m];
          if (itemIsInBin(item, bin)) return item;
        }
      }
    }
  } catch (e) { /* API not available or failed */ }

  // Fallback: find by filename in target bin (first match)
  var fileName = filePath.replace(/.*[\/\\]/, '');
  return findItemByName(bin, fileName);
}

//  Check if a project item is a direct or indirect child of the given bin
function itemIsInBin(item, bin) {
  var current = item;
  while (current) {
    if (current === bin) return true;
    try {
      current = current.parent;
    } catch (e) {
      break;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────
//  Import only — add to bin, do NOT place on timeline
// ─────────────────────────────────────────────────────────────
/**
 * Import an audio file into the specified bin without
 * inserting it into any sequence.
 *
 * @param {string} filePath - Absolute path to the audio file
 * @param {string} binPath  - Slash-separated bin path (empty = root)
 * @returns {string} "OK" or error message
 */
function importOnly(filePath, binPath) {
  try {
    var project = app.project;

    var file = new File(filePath);
    if (!file.exists) {
      return 'ERROR: File not found: ' + filePath;
    }

    var targetBin = binPath && binPath.trim()
      ? getOrCreateBin(project.rootItem, binPath.trim())
      : project.rootItem;

    project.importFiles(
      [filePath],
      true,      // suppressUI
      targetBin,
      false      // not as numbered stills
    );

    return 'OK';

  } catch (e) {
    return 'ERROR: ' + (e.message || String(e));
  }
}

// ─────────────────────────────────────────────────────────────
//  Folder picker — opens a native dialog
// ─────────────────────────────────────────────────────────────
function browseForFolder() {
  try {
    var folder = Folder.selectDialog('Select the folder containing your audio files');
    if (folder) {
      return folder.fsName;   // native OS path
    }
    return '';  // user cancelled
  } catch (e) {
    return 'ERROR: ' + (e.message || String(e));
  }
}

// ─────────────────────────────────────────────────────────────
//  Health check — called once on panel load to confirm JSX is live
// ─────────────────────────────────────────────────────────────
function ping() {
  return 'pong';
}

// ─────────────────────────────────────────────────────────────
//  Dispatch CSXS events to the CEP panel (for menu/shortcut triggers)
//  Used when the user invokes "AN: Import Latest" or "AN: Insert Latest"
//  from the menu or via a keyboard shortcut assigned in Premiere/macOS.
// ─────────────────────────────────────────────────────────────
function dispatchANImport() {
  try {
    var xLib = new ExternalObject('lib:\\PlugPlugExternalObject');
    if (xLib) {
      var evt = new CSXSEvent();
      evt.type = 'AN_CMD_IMPORT';
      evt.dispatch();
    }
  } catch (e) { }
}

function dispatchANInsert() {
  try {
    var xLib = new ExternalObject('lib:\\PlugPlugExternalObject');
    if (xLib) {
      var evt = new CSXSEvent();
      evt.type = 'AN_CMD_INSERT';
      evt.dispatch();
    }
  } catch (e) { }
}
