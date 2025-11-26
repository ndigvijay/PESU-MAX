export function save(key, value) {
  return chrome.storage.local.set({ [key]: value });
}

export function load(key) {
  return new Promise((res) => {
    chrome.storage.local.get(key, (data) => res(data[key]));
  });
}
