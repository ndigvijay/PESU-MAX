import { getSubjectsCode, getAllSemesters } from "../helpers/pesuAPI.js";
import { parseSubjectsCode } from "../helpers/parser.js";
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
  chrome.storage.local.set({ subjectsChunk: data });
  // parseSubjectsCode(data);
  console.log("subjects ---------");
  // console.log(subjects);
});

getAllSemesters().then(data => {
  console.log(data);
  chrome.storage.local.set({ semestersChunk: data });
});


//auth 
fetchAndStorePESUSessionId();




// Export if needed
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "FETCH_SESSION") {
    fetchAndStorePESUSessionId();
    sendResponse({ status: "ok" });
  }
});
