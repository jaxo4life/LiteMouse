document.addEventListener("DOMContentLoaded", () => {
  loadSettings();

  document.querySelectorAll(".toggle-switch").forEach((toggle) => {
    toggle.addEventListener("click", function () {
      this.classList.toggle("active");
    });
  });

  document
    .getElementById("saveSettings")
    .addEventListener("click", saveSettings);
  document
    .getElementById("resetSettings")
    .addEventListener("click", resetSettings);

  document.getElementById("sensitivity").addEventListener("input", () => {
    // Could add real-time preview here
  });

  document.getElementById("pathColor").addEventListener("change", () => {
    // Could add real-time preview here
  });

  document.getElementById("lineWidth").addEventListener("input", () => {
    // Could add real-time preview here
  });
});

function loadSettings() {
  chrome.storage.local.get(
    {
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
    },
    (items) => {
      Object.keys(items.gestures).forEach((gesture) => {
        const toggle = document.querySelector(`[data-gesture="${gesture}"]`);
        if (toggle) {
          toggle.classList.toggle("active", items.gestures[gesture]);
        }
      });

      document.getElementById("sensitivity").value = items.sensitivity;
      document.getElementById("pathColor").value = items.pathColor;
      document.getElementById("lineWidth").value = items.lineWidth;

      const showPathToggle = document.querySelector(
        '[data-setting="showPath"]'
      );
      if (showPathToggle) {
        showPathToggle.classList.toggle("active", items.showPath);
      }

      const dragLinksToggle = document.querySelector(
        '[data-setting="dragLinks"]'
      );
      if (dragLinksToggle) {
        dragLinksToggle.classList.toggle("active", items.dragLinks);
      }

      const ctrlClickToggle = document.querySelector(
        '[data-setting="ctrlClick"]'
      );
      if (ctrlClickToggle) {
        ctrlClickToggle.classList.toggle("active", items.ctrlClick);
      }
    }
  );
}

function saveSettings() {
  const gestures = {};
  document.querySelectorAll("[data-gesture]").forEach((toggle) => {
    const gesture = toggle.getAttribute("data-gesture");
    gestures[gesture] = toggle.classList.contains("active");
  });

  const settings = {
    gestures: gestures,
    sensitivity: Number.parseInt(document.getElementById("sensitivity").value),
    showPath: document
      .querySelector('[data-setting="showPath"]')
      .classList.contains("active"),
    pathColor: document.getElementById("pathColor").value,
    lineWidth: Number.parseInt(document.getElementById("lineWidth").value),
    dragLinks: document
      .querySelector('[data-setting="dragLinks"]')
      .classList.contains("active"),
    ctrlClick: document
      .querySelector('[data-setting="ctrlClick"]')
      .classList.contains("active"),
  };

  chrome.storage.local.set(settings, () => {
    showStatusMessage("设置已保存");

    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "settingsUpdated",
            settings: settings,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              // Ignore errors for tabs that don't have content script
            }
          }
        );
      });
    });
  });
}

function resetSettings() {
  const defaultSettings = {
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

  chrome.storage.local.set(defaultSettings, () => {
    loadSettings();
    showStatusMessage("已恢复默认设置");
  });
}

function showStatusMessage(message) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = message;
  statusMessage.classList.add("show");

  setTimeout(() => {
    statusMessage.classList.remove("show");
  }, 3000);
}
