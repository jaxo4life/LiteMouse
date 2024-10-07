chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);

  if (request.action === "closeTab") {
    console.log('Attempting to close tab:', sender.tab.id);
    chrome.tabs.remove(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        console.error('Error closing tab:', chrome.runtime.lastError);
      } else {
        console.log('Tab closed successfully');
      }
    });
  } else if (request.action === "goBack") {
    chrome.tabs.goBack(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        console.error('Error going back:', chrome.runtime.lastError);
      }
    });
  } else if (request.action === "goForward") {
    chrome.tabs.goForward(sender.tab.id, () => {
      if (chrome.runtime.lastError) {
        console.error('Error going forward:', chrome.runtime.lastError);
      }
    });
  } else if (request.action === "openNewTab") {
    console.log('Attempting to open new tab:', request.url);
    chrome.tabs.create({ url: request.url }, (tab) => {
      if (chrome.runtime.lastError) {
        console.error('Error opening new tab:', chrome.runtime.lastError);
      } else {
        console.log('New tab opened successfully');
      }
    });
  }

  sendResponse({received: true});
  return true;
});