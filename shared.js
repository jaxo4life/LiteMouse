// Shared across content script, popup, options page, and service worker.
// Dependency-free (plain globals) so every Chrome extension context can load it
// directly — no modules, no bundler.

// --- Default settings: single source of truth ----------------------------
// Previously duplicated across content.js / options.js; defined once here.
var DEFAULT_SETTINGS = {
  gestures: {
    goBack: true,
    goForward: true,
    closeTab: true,
    scrollToTop: true,
    scrollToBottom: true,
    refreshPage: true,
    reopenClosedTab: true,
  },
  sensitivity: 20,
  showPath: true,
  pathColor: "#ff0000",
  lineWidth: 4,
  dragLinks: true,
  ctrlClick: true,
};

// Deep copy so callers can mutate freely without touching the constant.
function defaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}
