import { getSubjectsCode, getAllSemesters } from "../helpers/pesuAPI.js";
import { parseSubjectsCode ,parseSemesters } from "../helpers/parser.js";
import { filterEnggSubjectsCode ,getSubjectDetails } from "../helpers/enggSubjects.js"
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
  const subjects = parseSubjectsCode(data);
  chrome.storage.local.set({ subjects: subjects });
  const enggSubjects  = filterEnggSubjectsCode(subjects)
  chrome.storage.local.set({ enggSubjects: enggSubjects });
});

getAllSemesters().then(data => {
  const semesterData = parseSemesters(data) 
  chrome.storage.local.set({ semestersData: semesterData });
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
