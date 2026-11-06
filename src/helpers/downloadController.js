import { createBulkDownloadZip, downloadNotificationFiles } from './downloadHelper.js';
import { blobToDataUrl } from './blobEncoding.js';
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

  try {
    const result = await createBulkDownloadZip(selectedItems, progressCallback, typesToDownload, {
      mergeOptions,
      mergeSlides
    });
    
    const dataUrl = await blobToDataUrl(result.blob, 'application/zip');

    chrome.downloads.download({
      url: dataUrl,
      filename: `PESU_Materials_${Date.now()}.zip`,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download error:", chrome.runtime.lastError);
        sendResponse({ 
          error: chrome.runtime.lastError.message,
          stats: result.stats 
        });
      } else {
        sendResponse({
          success: true,
          downloadId: downloadId,
          stats: result.stats
        });
      }
      
      if (port) {
        try {
          port.disconnect();
        } catch (e) {}
      }
    });
  } catch (error) {
    console.error("Bulk download error:", error);
    sendResponse({ error: error.message });
    
    if (port) {
      try {
        port.disconnect();
      } catch (e) {}
    }
  }
}


function triggerChromeDownload(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(downloadId);
      }
    );
  });
}

export async function handleNotificationDownload(notification, sendResponse) {
  if (!notification) {
    sendResponse({ error: "No notification provided" });
    return;
  }

  try {
    const files = await downloadNotificationFiles(notification);
    const downloadIds = [];

    for (const file of files) {
      const dataUrl = await blobToDataUrl(file.blob, file.mimeType || 'application/octet-stream');
      const downloadId = await triggerChromeDownload(dataUrl, file.filename);
      downloadIds.push(downloadId);
    }

    sendResponse({
      success: true,
      downloadedCount: downloadIds.length,
      downloadIds
    });
  } catch (error) {
    console.error("Notification download error:", error);
    sendResponse({ error: error.message || "Could not download file" });
  }
}
