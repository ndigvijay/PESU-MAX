import { save } from "../utils/storage.js";

function fetchAndStorePESUSessionId() {
  chrome.cookies.get(
    { url: "https://www.pesuacademy.com/Academy/", name: "JSESSIONID" },
    (cookie) => {
      if (cookie) {
        save("JSESSIONID", cookie.value);
      }
    }
  );
}


// async function getSubjectCodes() {
  
  
// }

// Example: trigger immediately when background loads
fetchAndStorePESUSessionId();

// Export if needed
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_SESSION") {
    fetchAndStorePESUSessionId();
    sendResponse({ status: "ok" });
  }
});