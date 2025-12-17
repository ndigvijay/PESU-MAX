export const fetchAttendance = (semesterId) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "getAttendance",
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
      resolve(response?.data || []);
    });
  });
};

export const fetchSemesters = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get("semestersData", (result) => {
      const data = result.semestersData || [];
      resolve(data);
    });
  });
};

export const getUserProfile = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get("userProfile", (result) => {
      resolve(result.userProfile || null);
    });
  });
};
