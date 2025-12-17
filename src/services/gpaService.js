export const getGpaData = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get("gpaData", (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result.gpaData || null);
    });
  });
};

export const fetchGpaForSemester = (semesterId) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "getGpaForSemester",
      semesterId
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.error) {
        reject(new Error(response.error));
        return;
      }
      resolve(response?.data || null);
    });
  });
};
