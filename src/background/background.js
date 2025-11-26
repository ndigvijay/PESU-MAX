

function fetchAndStorePESUSessionId() {
  chrome.cookies.get(
    { url: "https://www.pesuacademy.com/Academy/", name: "JSESSIONID" },
    (cookie) => {
      if (cookie) {
        chrome.storage.local.set({ JSESSIONID: cookie.value });
        console.log("Stored JSESSIONID:", cookie.value);
      } else {
        console.log("JSESSIONID cookie not found");
      }
    }
  );
}

// Example: trigger immediately when background loads
fetchAndStorePESUSessionId();

// Export if needed
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_SESSION") {
    fetchAndStorePESUSessionId();
    sendResponse({ status: "ok" });
  }
});
