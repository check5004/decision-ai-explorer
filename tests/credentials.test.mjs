import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY_STORAGE_NAME, isApiKey, readSavedKey, saveKey, deleteSavedKey } from '../public/credentials.js';

const SYNTHETIC_KEY = 'sk-or-v1-TEST_ONLY_MOCK_NOT_A_REAL_KEY';
function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.has(key) ? values.get(key) : null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
}
test('credential storage saves only the explicit synthetic key and restores it on a new read', () => {
  const storage = memoryStorage(); const get = () => storage;
  assert.deepEqual(readSavedKey(get), { status: 'empty', key: '' });
  assert.equal(saveKey(SYNTHETIC_KEY, get).ok, true);
  assert.deepEqual(readSavedKey(get), { status: 'saved', key: SYNTHETIC_KEY });
  assert.equal(storage.getItem(KEY_STORAGE_NAME), SYNTHETIC_KEY);
});
test('credential deletion removes only this app entry and verifies removal', () => {
  const storage = memoryStorage(); storage.setItem('unrelated-app', 'keep');
  saveKey(SYNTHETIC_KEY, () => storage);
  assert.equal(deleteSavedKey(() => storage).ok, true);
  assert.deepEqual(readSavedKey(() => storage), { status: 'empty', key: '' });
  assert.equal(storage.getItem('unrelated-app'), 'keep');
});
test('blocked browser storage and exceptions never produce success or expose their text', () => {
  const error = new Error('TEST-ONLY-MOCK sensitive failure ' + SYNTHETIC_KEY);
  const denied = () => { throw error; };
  assert.deepEqual(readSavedKey(denied), { status: 'unavailable', key: '' });
  assert.deepEqual(saveKey(SYNTHETIC_KEY, denied), { ok: false });
  assert.deepEqual(deleteSavedKey(denied), { ok: false });
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    const storage = memoryStorage(); storage[method] = () => { throw error; };
    const outputs = [readSavedKey(() => storage), saveKey(SYNTHETIC_KEY, () => storage), deleteSavedKey(() => storage)];
    assert(!JSON.stringify(outputs).includes(SYNTHETIC_KEY));
  }
});
test('silent storage write/delete failures are verified instead of claiming success', () => {
  const storage = memoryStorage();
  storage.setItem = () => {};
  assert.equal(saveKey(SYNTHETIC_KEY, () => storage).ok, false);
  const stored = memoryStorage(); stored.setItem(KEY_STORAGE_NAME, SYNTHETIC_KEY); stored.removeItem = () => {};
  assert.equal(deleteSavedKey(() => stored).ok, false);
});
test('malformed stored credentials never become active and invalid input is never written', () => {
  for (const value of ['', 'not-a-key', null, undefined, 42, ' sk-or-v1-TEST_ONLY_MOCK_NOT_A_REAL_KEY']) {
    assert.equal(isApiKey(value), false);
    let writes = 0;
    assert.equal(saveKey(value, () => ({ setItem() { writes++; } })).ok, false);
    assert.equal(writes, 0);
  }
  const storage = memoryStorage(); storage.setItem(KEY_STORAGE_NAME, 'invalid');
  assert.deepEqual(readSavedKey(() => storage), { status: 'invalid', key: '' });
});
