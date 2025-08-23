document.addEventListener("DOMContentLoaded", () => {
  loadPopupData();

  document
    .getElementById("toggleButton")
    .addEventListener("click", toggleExtension);
  document
    .getElementById("settingsButton")
    .addEventListener("click", openSettings);
  document.getElementById("helpButton").addEventListener("click", showHelp);
});

function loadPopupData() {
  chrome.storage.sync.get(
    {
      extensionEnabled: true,
      gestureStats: {
        today: 0,
        total: 0,
        lastDate: new Date().toDateString(),
      },
    },
    (items) => {
      updateUI(items.extensionEnabled, items.gestureStats);
    }
  );
}

function updateUI(enabled, stats) {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const toggleButton = document.getElementById("toggleButton");

  if (enabled) {
    statusDot.classList.remove("disabled");
    statusText.textContent = "扩展已启用";
    toggleButton.textContent = "禁用扩展";
    toggleButton.classList.remove("disabled");
  } else {
    statusDot.classList.add("disabled");
    statusText.textContent = "扩展已禁用";
    toggleButton.textContent = "启用扩展";
    toggleButton.classList.add("disabled");
  }

  // Update stats
  const today = new Date().toDateString();
  if (stats.lastDate !== today) {
    stats.today = 0;
    stats.lastDate = today;
  }

  document.getElementById("gestureCount").textContent = stats.today;
  document.getElementById("totalGestures").textContent = stats.total;
}

function toggleExtension() {
  chrome.storage.sync.get(["extensionEnabled"], (items) => {
    const newState = !items.extensionEnabled;

    chrome.storage.sync.set({ extensionEnabled: newState }, () => {
      // Update badge
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
                // Ignore errors for tabs without content script
              }
            }
          );
        });
      });

      loadPopupData();
    });
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

function showHelp() {
  const helpText = `LiteMouse 手势说明：

• 向左滑动：返回上一页
• 向右滑动：前进到下一页  
• 向上滑动：滚动到页面顶部
• 向下滑动：滚动到页面底部
• L型手势：关闭当前标签页
• 圆形手势：刷新页面
• Z字形手势：重新打开关闭的标签页

其他功能：
• 拖拽链接：打开新标签页
• Ctrl+点击：打开新标签页
• Ctrl+Shift+M：切换扩展开关`;

  alert(helpText);
}
