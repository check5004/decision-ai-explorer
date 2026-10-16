// The user explicitly saves a key for this browser. No network or logging here.
// localStorage is origin-scoped, plaintext browser storage, not an encrypted vault.
export const KEY_STORAGE_NAME = 'decision-atelier.openrouter-key.v1';
export function isApiKey(value) {
  return typeof value === 'string' && /^sk-or-v1-[A-Za-z0-9_-]{16,480}$/.test(value);
}
const browserStorage = () => window.localStorage;
export function readSavedKey(getStorage = browserStorage) {
  try {
    const key = getStorage().getItem(KEY_STORAGE_NAME);
    if (key === null) return { status: 'empty', key: '' };
    if (!isApiKey(key)) return { status: 'invalid', key: '' };
    return { status: 'saved', key };
  } catch { return { status: 'unavailable', key: '' }; }
}
export function saveKey(key, getStorage = browserStorage) {
  if (!isApiKey(key)) return { ok: false };
  try {
    const storage = getStorage();
    storage.setItem(KEY_STORAGE_NAME, key);
    return { ok: storage.getItem(KEY_STORAGE_NAME) === key };
  } catch { return { ok: false }; }
}
export function deleteSavedKey(getStorage = browserStorage) {
  try {
    const storage = getStorage();
    storage.removeItem(KEY_STORAGE_NAME);
    return { ok: storage.getItem(KEY_STORAGE_NAME) === null };
  } catch { return { ok: false }; }
}
