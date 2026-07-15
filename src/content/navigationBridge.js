(() => {
  if (window.__pesuMaxNavigationBridge) {
    return;
  }
  window.__pesuMaxNavigationBridge = true;

  const EVENT_NAME = "pesu-max-navigation";

  function sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, (response) => {
        resolve(response || {});
      });
    });
  }

  function dispatchRestore(entry) {
    if (!entry?.path) {
      return;
    }
    window.dispatchEvent(new CustomEvent("pesu-max-restore-navigation", { detail: { path: entry.path } }));
  }

  window.addEventListener(EVENT_NAME, async (event) => {
    const detail = event.detail || {};
    if (detail.type === "record") {
      await sendMessage({ action: "recordNavigation", entry: detail.entry });
      return;
    }

    if (detail.type === "activate") {
      await sendMessage({ action: "activateNavigation", entryId: detail.entryId });
      return;
    }

    if (detail.type === "logout") {
      await sendMessage({ action: "clearNavigation" });
      return;
    }

    if (detail.type === "recover-login") {
      const response = await sendMessage({ action: "recoverPreviousNavigation" });
      if (response.entry) {
        location.assign("/Academy/s/studentProfilePESU");
      }
    }
  });

  if (location.pathname.startsWith("/Academy/s/")) {
    sendMessage({ action: "consumePendingNavigation" }).then((response) => dispatchRestore(response.entry));
  }
})();
