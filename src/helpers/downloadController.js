import { createBulkDownloadZip } from './downloadHelper.js';

export async function handleBulkDownload(selectedItems, options, sender, sendResponse) {
  if (!selectedItems || selectedItems.length === 0) {
    sendResponse({ error: "No items selected" });
    return;
  }

  // Extract options with defaults
  const mergeBySubject = options?.mergeBySubject || false;

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
    const result = await createBulkDownloadZip(selectedItems, progressCallback, { mergeBySubject });
    
    // Convert blob to data URL 
    const arrayBuffer = await result.blob.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const dataUrl = `data:application/zip;base64,${base64}`;
    
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

