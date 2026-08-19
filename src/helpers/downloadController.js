import { createBulkDownloadZip } from './downloadHelper.js';
import { downloadBlob } from './browserDownload.js';
import { CONTENT_TYPE_IDS } from './pesuAPI.js';

const DEFAULT_CONTENT_TYPES = [CONTENT_TYPE_IDS.slides];

export async function handleBulkDownload(selectedItems, contentTypes, mergeOptions = {}, mergeSlides = false, sender, sendResponse) {
  if (!selectedItems || selectedItems.length === 0) {
    sendResponse({ error: "No items selected" });
    return;
  }

  const typesToDownload = (contentTypes && contentTypes.length > 0) 
    ? contentTypes 
    : DEFAULT_CONTENT_TYPES;

  // Track download progress
  let port = null;
  if (sender.tab?.id) {
    try {
      port = chrome.tabs.connect(sender.tab.id, { name: "downloadProgress" });
    } catch (e) {
      console.log("Could not establish progress port");
    }
  }

  const progressCallback = (progress) => {
    if (port) {
      try {
        port.postMessage(progress);
      } catch (e) {
        // Port may be disconnected
      }
    }
  };

  const closePort = () => {
    if (port) {
      try {
        port.disconnect();
      } catch (e) {}
    }
  };

  let result;
  try {
    result = await createBulkDownloadZip(selectedItems, progressCallback, typesToDownload, {
      mergeOptions,
      mergeSlides
    });
  } catch (error) {
    console.error("Bulk download error:", error);
    sendResponse({ error: error.message });
    closePort();
    return;
  }

  try {
    const downloadId = await downloadBlob(
      result.blob,
      `PESU_Materials_${Date.now()}.zip`,
      { saveAs: true }
    );

    sendResponse({
      success: true,
      downloadId: downloadId,
      stats: result.stats
    });
  } catch (error) {
    console.error("Download error:", error);
    sendResponse({
      error: error.message,
      stats: result.stats
    });
  } finally {
    closePort();
  }
}
