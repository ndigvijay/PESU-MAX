import { load, remove, save } from "../utils/storage.js";

const TTL = 24 * 60 * 60 * 1000;
const STORAGE_KEY = "librarySearchCacheV4";
const LEGACY_STORAGE_KEYS = ["librarySearchCacheV3", "librarySearchCacheV2", "libraryAuth"];
const MAX_ENTRIES = 30;
const MAX_BYTES = 2 * 1024 * 1024;
const pending = new Map();
let libraryQueue = Promise.resolve();
let legacyCleanup = null;

export function singleFlight(key, operation) {
  if (!pending.has(key)) {
    const promise = Promise.resolve().then(operation).finally(() => pending.delete(key));
    pending.set(key, promise);
  }
  return pending.get(key);
}

export function serializeLibraryRequest(operation) {
  const task = libraryQueue.then(operation);
  libraryQueue = task.catch(() => {});
  return task;
}

function freshEntries(stored) {
  return Object.entries(stored || {}).filter(
    ([, entry]) => entry && Date.now() - entry.savedAt < TTL
  );
}

export async function readCachedSearch(key) {
  const stored = await load(STORAGE_KEY).catch(() => null);
  const entry = stored?.[key];
  return entry && Date.now() - entry.savedAt < TTL ? entry.value : null;
}

export async function writeCachedSearch(key, value) {
  if (!legacyCleanup) legacyCleanup = remove(LEGACY_STORAGE_KEYS).catch(() => {});
  try {
    const entries = freshEntries(await load(STORAGE_KEY))
      .filter(([entryKey]) => entryKey !== key);
    entries.unshift([key, { savedAt: Date.now(), value }]);
    const bounded = {};
    let size = 0;
    for (const [entryKey, entry] of entries.slice(0, MAX_ENTRIES)) {
      size += JSON.stringify(entry).length * 2;
      if (size > MAX_BYTES) break;
      bounded[entryKey] = entry;
    }
    await save(STORAGE_KEY, bounded);
  } catch {
    // A cache quota failure must not discard a successful library response.
  }
}

let activeFiles = 0;
const fileWaiters = [];
export async function withFileSlot(operation) {
  if (activeFiles >= 3) await new Promise((resolve) => fileWaiters.push(resolve));
  else activeFiles += 1;
  try {
    return await operation();
  } finally {
    const next = fileWaiters.shift();
    if (next) next();
    else activeFiles -= 1;
  }
}
