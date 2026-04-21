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

export const searchCoursePyqs = ({ query, year, encodedMemberId, encodedPassword }) => {
  return sendRuntimeMessage({
    action: "searchLibraryPyqs",
    query,
    year,
    encodedMemberId,
    encodedPassword
  });
};

export const loadMoreCoursePyqs = ({ query, year, cursor, loadedCount, encodedMemberId, encodedPassword }) => {
  return sendRuntimeMessage({
    action: "loadMoreLibraryPyqs",
    query,
    year,
    cursor,
    loadedCount,
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

export const downloadSelectedCoursePyqsZip = ({
  items,
  query,
  encodedMemberId,
  encodedPassword
}) => {
  return sendRuntimeMessage({
    action: "downloadLibraryPyqsZip",
    items,
    query,
    encodedMemberId,
    encodedPassword
  });
};
