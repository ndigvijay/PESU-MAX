function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response?.error) {
        reject(new Error(response.error));
        return;
      }

      resolve(response?.data);
    });
  });
}

export const initializeLibraryLogin = ({ encodedMemberId, encodedPassword }) => {
  return sendRuntimeMessage({
    action: "libraryLogin",
    encodedMemberId,
    encodedPassword
  });
};

export const fetchPyqCatalog = () => {
  return sendRuntimeMessage({ action: "getPYQCourseCatalog" });
};

export const searchCoursePyqs = ({ query, encodedMemberId, encodedPassword }) => {
  return sendRuntimeMessage({
    action: "searchLibraryPyqs",
    query,
    encodedMemberId,
    encodedPassword
  });
};

export const downloadCoursePyq = ({
  downloadPath,
  title,
  encodedMemberId,
  encodedPassword
}) => {
  return sendRuntimeMessage({
    action: "downloadLibraryPyq",
    downloadPath,
    title,
    encodedMemberId,
    encodedPassword
  });
};
