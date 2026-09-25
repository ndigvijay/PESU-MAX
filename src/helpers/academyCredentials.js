import { load, remove, save } from "../utils/storage.js";
import { ACADEMY_CREDENTIAL_KEY } from "../utils/storageKeys.js";

const SITE_USERNAME_STORAGE_KEY = "clientusername";
const SITE_PASSWORD_STORAGE_KEY = "clientpassword";

export async function readStoredCredentials() {
  const stored = await load(ACADEMY_CREDENTIAL_KEY);
  if (!stored || !stored.username || !stored.password) {
    return null;
  }

  try {
    return { username: atob(stored.username), password: atob(stored.password) };
  } catch (error) {
    return null;
  }
}

async function storeCredentials(username, password) {
  await save(ACADEMY_CREDENTIAL_KEY, {
    username: btoa(username),
    password: btoa(password),
    updatedAt: Date.now()
  });
}

export async function forgetStoredCredentials() {
  await remove(ACADEMY_CREDENTIAL_KEY);
}

// username and pass is taken from the place where the site itself writes it.
export async function captureCredentials() {
  const username = localStorage.getItem(SITE_USERNAME_STORAGE_KEY);
  const password = localStorage.getItem(SITE_PASSWORD_STORAGE_KEY);
  if (!username || !password) return;

  const stored = await readStoredCredentials();
  if (stored && stored.username === username && stored.password === password) return;

  await storeCredentials(username, password);
}
