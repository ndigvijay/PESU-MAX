export const fetchPesuData = ({ search, semester, page, limit }) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: "getPESUDataPagination",
      type: "nested",
      search,
      semester,
      page,
      limit
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


export const fetchAllPesuData = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "getAllPESUData" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.data) {
        reject(new Error("No data received"));
        return;
      }
      resolve(response.data);
    });
  });
};


export const fetchSemesters = () => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: "getSemestersData" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response?.data || [{ value: "all", label: "All Semesters" }]);
    });
  });
};


export const downloadMaterials = (selectedItems, contentTypes, onProgress) => {
  return new Promise((resolve, reject) => {
    // Set up progress listener
    const progressListener = (port) => {
      if (port.name === "downloadProgress") {
        port.onMessage.addListener((progress) => {
          if (onProgress) {
            onProgress(progress);
          }
        });
        port.onDisconnect.addListener(() => {
          chrome.runtime.onConnect.removeListener(progressListener);
        });
      }
    };
    chrome.runtime.onConnect.addListener(progressListener);

    // Send download request
    chrome.runtime.sendMessage({
      action: "downloadSelectedMaterials",
      selectedItems,
      contentTypes
    }, (response) => {
      chrome.runtime.onConnect.removeListener(progressListener);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response?.success) {
        resolve({
          success: true,
          stats: response.stats
        });
      } else {
        reject(new Error(response?.error || "Download failed"));
      }
    });
  });
};


export const getBackgroundFetchStatus = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get("fetchStatus", (result) => {
      resolve(result.fetchStatus?.pesuData === true);
    });
  });
};


export const subscribeToStorageChanges = (onStatusChange, onDataChange) => {
  const listener = (changes) => {
    if (changes.fetchStatus && onStatusChange) {
      onStatusChange(changes.fetchStatus.newValue?.pesuData === true);
    }
    if (changes.pesuData && onDataChange) {
      onDataChange();
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
};
