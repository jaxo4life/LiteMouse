let recentlyClosedTabs = [];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["extensionEnabled"], (items) => {
    const enabled = items.extensionEnabled !== false; // Default to true
    chrome.action.setBadgeText({
      text: enabled ? "" : "OFF",
    });
    chrome.action.setBadgeBackgroundColor({
      color: enabled ? "#10b981" : "#ef4444",
    });
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-extension") {
    chrome.storage.local.get(["extensionEnabled"], (items) => {
      const newState = !items.extensionEnabled;

      chrome.storage.local.set({ extensionEnabled: newState }, () => {
        chrome.action.setBadgeText({
          text: newState ? "" : "OFF",
        });

        chrome.action.setBadgeBackgroundColor({
          color: newState ? "#10b981" : "#ef4444",
        });

        // Notify content scripts
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: "extensionToggled",
                enabled: newState,
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  // Ignore errors
                }
              }
            );
          });
        });
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "closeTab") {
    chrome.tabs.get(sender.tab.id, (tab) => {
      if (
        !chrome.runtime.lastError &&
        tab.url &&
        !tab.url.startsWith("chrome://")
      ) {
        recentlyClosedTabs.unshift({
          url: tab.url,
          title: tab.title,
          timestamp: Date.now(),
        });
        // Keep only last 10 closed tabs
        if (recentlyClosedTabs.length > 10) {
          recentlyClosedTabs = recentlyClosedTabs.slice(0, 10);
        }
      }

      chrome.tabs.remove(sender.tab.id, () => {
        if (chrome.runtime.lastError) {
          console.error("Error closing tab:", chrome.runtime.lastError);
        } else {
          console.log("Tab closed successfully");
        }
      });
    });
  } else if (request.action === "goBack") {
    chrome.tabs.goBack(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || "";
        if (
          errorMessage.includes("Cannot find a next page in history") ||
          errorMessage.includes("No current navigation entry") ||
          errorMessage.includes("Cannot go back") ||
          errorMessage.includes("no previous entry")
        ) {
          // Send friendly message to content script
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "showFriendlyMessage",
            message: "已无法后退",
          });
        } else {
          console.error(errorMessage, chrome.runtime.lastError);
        }
      }
    });
  } else if (request.action === "goForward") {
    chrome.tabs.goForward(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || "";
        if (
          errorMessage.includes("Cannot find a next page in history") ||
          errorMessage.includes("No current navigation entry") ||
          errorMessage.includes("Cannot go forward") ||
          errorMessage.includes("no next entry")
        ) {
          // Send friendly message to content script
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "showFriendlyMessage",
            message: "已无法前进",
          });
        } else {
          console.error("Error going forward:", chrome.runtime.lastError);
        }
      }
    });
  } else if (request.action === "openNewTab") {
    chrome.tabs.create({ url: request.url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error("Error opening new tab:", chrome.runtime.lastError);
      } else {
        console.log("New tab opened successfully");
      }
    });
  } else if (request.action === "scrollToTop") {
    chrome.tabs.sendMessage(
      sender.tab.id,
      { action: "scrollToTop" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error scrolling to top:", chrome.runtime.lastError);
        }
      }
    );
  } else if (request.action === "scrollToBottom") {
    chrome.tabs.sendMessage(
      sender.tab.id,
      { action: "scrollToBottom" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error scrolling to bottom:", chrome.runtime.lastError);
        }
      }
    );
  } else if (request.action === "refreshPage") {
    chrome.tabs.reload(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        console.error("Error refreshing page:", chrome.runtime.lastError);
      } else {
        console.log("Page refreshed successfully");
      }
    });
  } else if (request.action === "reopenClosedTab") {
    if (recentlyClosedTabs.length > 0) {
      const lastClosedTab = recentlyClosedTabs.shift();
      chrome.tabs.create({ url: lastClosedTab.url }, (tab) => {
        if (chrome.runtime.lastError) {
          console.error("Error reopening tab:", chrome.runtime.lastError);
        } else {
          console.log("Tab reopened successfully:", lastClosedTab.title);
        }
      });
    }
  } else if (request.action === "updateStats") {
    chrome.storage.local.get(["gestureStats"], (items) => {
      const today = new Date().toDateString();
      const stats = items.gestureStats || {
        today: 0,
        total: 0,
        lastDate: today,
      };

      if (stats.lastDate !== today) {
        stats.today = 0;
        stats.lastDate = today;
      }

      stats.today++;
      stats.total++;

      chrome.storage.local.set({ gestureStats: stats });
    });
  }

  sendResponse({ received: true });
  return true;
});
