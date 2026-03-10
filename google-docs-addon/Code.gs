/**
 * Auto Narration Bridge — Google Docs Add-on
 * Server-side Apps Script (Code.gs)
 *
 * Adds the add-on menu, opens the sidebar, and provides a
 * server-side function to read the user's active text selection.
 */

function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Open Auto Narration', 'showSidebar')
    .addToUi();
}

function onInstall(e) {
  onOpen(e);
}

function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Auto Narration');
  DocumentApp.getUi().showSidebar(html);
}

/**
 * Returns the currently selected text in the document.
 * Called from the sidebar via google.script.run.
 */
function getSelectedText() {
  var doc = DocumentApp.getActiveDocument();
  var selection = doc.getSelection();

  if (!selection) {
    return { success: false, text: '', error: 'No text selected. Highlight some narration text first.' };
  }

  var elements = selection.getRangeElements();
  var text = '';

  for (var i = 0; i < elements.length; i++) {
    var el = elements[i];
    var elem = el.getElement();

    // Only process text-bearing elements
    if (elem.editAsText) {
      var rawText = elem.asText().getText();
      if (el.isPartial()) {
        rawText = rawText.substring(
          el.getStartOffset(),
          el.getEndOffsetInclusive() + 1
        );
      }
      // Preserve whitespace between elements (e.g. across paragraphs)
      if (text.length > 0) text += ' ';
      text += rawText;
    }
  }

  text = text.trim();

  if (!text) {
    return { success: false, text: '', error: 'Selected text is empty.' };
  }

  return { success: true, text: text };
}

/**
 * Persist settings to Google's PropertiesService.
 * PropertiesService survives sidebar close/reopen — unlike sessionStorage.
 * Values are stored per Google account (UserProperties).
 */
function setUserProperties(props) {
  const store = PropertiesService.getUserProperties();
  store.setProperties(props);
}

function getUserProperties() {
  const store = PropertiesService.getUserProperties();
  return store.getProperties();
}
