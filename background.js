chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "captureVisibleTab") {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("captureVisibleTab 错误:", chrome.runtime.lastError.message);
        sendResponse({ dataUrl: null }); // 明确发送 null
        return;
      }
      sendResponse({ dataUrl: dataUrl });
    });
    return true; // 异步响应
  }
});
