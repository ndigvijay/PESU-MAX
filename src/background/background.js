import { getSubjectsCode, getStudentSemesters } from "../helpers/pesuAPI";
import { parseSubjectsCode } from "../helpers/parser";
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

// test call get subjects code

getSubjectsCode().then(data => {
  console.log(data);
  const subjects = parseSubjectsCode(data);
  console.log(subjects);
});


getStudentSemesters().then(data => {
  console.log(data);
});
// Example: trigger immediately when background loads
fetchAndStorePESUSessionId();

// Export if needed
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_SESSION") {
    fetchAndStorePESUSessionId();
    sendResponse({ status: "ok" });
  }
});
