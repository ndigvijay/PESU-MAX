import { save } from "../utils/storage.js";
import {
  RESOURCE_CHECK_RUNNING_KEY,
  RESOURCE_NOTIFICATIONS_KEY,
  RESOURCE_NOTIFICATIONS_READ_KEY
} from "../utils/storageKeys.js";

export const getResourceNotifications = () => {
  return new Promise((resolve, reject) => {
    const keys = [RESOURCE_NOTIFICATIONS_KEY, RESOURCE_NOTIFICATIONS_READ_KEY, RESOURCE_CHECK_RUNNING_KEY];
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve({
        notifications: result[RESOURCE_NOTIFICATIONS_KEY] || [],
        readIds: result[RESOURCE_NOTIFICATIONS_READ_KEY] || [],
        checking: result[RESOURCE_CHECK_RUNNING_KEY] === true
      });
    });
  });
};

// Read ids are kept apart from the notification list so background checks never overwrite them.
export const markResourceNotificationsRead = async (ids) => {
  const { notifications, readIds } = await getResourceNotifications();
  const existingIds = new Set(notifications.map((notification) => notification.id));
  const nextReadIds = Array.from(new Set([...readIds, ...ids].filter((id) => existingIds.has(id))));
  await save(RESOURCE_NOTIFICATIONS_READ_KEY, nextReadIds);
  return nextReadIds;
};

export const subscribeToResourceNotifications = (onChange) => {
  const listener = (changes, areaName) => {
    if (areaName !== "local") {
      return;
    }
    if (changes[RESOURCE_NOTIFICATIONS_KEY] || changes[RESOURCE_NOTIFICATIONS_READ_KEY] || changes[RESOURCE_CHECK_RUNNING_KEY]) {
      onChange();
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
};

export const downloadResourceNotification = (notification) => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "downloadResourceNotification",
        notification
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response);
      }
    );
  });
};
