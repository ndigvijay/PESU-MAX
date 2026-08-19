/**
 * Single entry point for handing a generated file to the browser's downloader.
 *
 * The two engines need opposite things here:
 *   - Chrome MV3 runs the background as a service worker, which has no DOM and
 *     therefore no URL.createObjectURL, so a base64 `data:` URL is the only way out.
 *   - Firefox MV3 runs the background as an event page (DOM available), and its
 *     downloads.download() flatly rejects `data:` URLs with "Access denied for URL".
 *     Blob URLs are the supported path, and they avoid buffering the whole file
 *     as a base64 string, which matters for big course-material zips.
 *
 * __TARGET_BROWSER__ is injected by webpack (see webpack.config.cjs).
 */

const IS_FIREFOX = __TARGET_BROWSER__ === "firefox";

function arrayBufferToBase64(arrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

// Blob URLs stay alive until revoked; hold each one until its download settles.
function revokeWhenSettled(downloadId, objectUrl) {
  const listener = (delta) => {
    if (delta.id !== downloadId) return;
    const state = delta.state?.current;
    if (state === "complete" || state === "interrupted") {
      chrome.downloads.onChanged.removeListener(listener);
      URL.revokeObjectURL(objectUrl);
    }
  };

  chrome.downloads.onChanged.addListener(listener);

  // Safety net in case the download never reports a terminal state.
  setTimeout(() => {
    chrome.downloads.onChanged.removeListener(listener);
    URL.revokeObjectURL(objectUrl);
  }, 10 * 60 * 1000);
}

/**
 * @param {Blob} blob
 * @param {string} filename  Relative to the browser's download directory.
 * @param {{ saveAs?: boolean }} [options]
 * @returns {Promise<number>} the download id
 */
export async function downloadBlob(blob, filename, options = {}) {
  const { saveAs = false } = options;

  let url;
  let objectUrl = null;

  if (IS_FIREFOX) {
    objectUrl = URL.createObjectURL(blob);
    url = objectUrl;
  } else {
    const base64 = arrayBufferToBase64(await blob.arrayBuffer());
    url = `data:${blob.type || "application/octet-stream"};base64,${base64}`;
  }

  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename, saveAs }, (downloadId) => {
      if (chrome.runtime.lastError) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (objectUrl) revokeWhenSettled(downloadId, objectUrl);
      resolve(downloadId);
    });
  });
}

/**
 * Convenience wrapper for callers that already hold an ArrayBuffer.
 */
export function downloadBuffer(arrayBuffer, mimeType, filename, options = {}) {
  return downloadBlob(new Blob([arrayBuffer], { type: mimeType }), filename, options);
}
