import { CACHE_BUSTER, CACHE_MAX_AGE } from "../http/config";

// Persist text/metadata only. Binary images and image URLs never enter the cache.
export const textOnly = (value) => {
  if (Array.isArray(value)) return value.map(textOnly);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, ["imageUrl", "cover", "previewUrl"].includes(key) ? "" : textOnly(item)]));
  return typeof value === "string" && value.startsWith("data:image/") ? "" : value;
};
export const createTextCache = ({ scope, now = Date.now, maxAge = CACHE_MAX_AGE, buster = CACHE_BUSTER } = {}) => {
  let opening;
  const memory = new Map();
  const open = () => {
    if (!globalThis.indexedDB) return Promise.resolve(null);
    opening ??= new Promise((resolve) => {
      let request;
      try { request = indexedDB.open("monp-text-cache", 1); } catch { resolve(null); return; }
      request.onupgradeneeded = () => request.result.createObjectStore("cache");
      request.onsuccess = () => resolve(request.result);
      request.onerror = request.onblocked = () => resolve(null);
    });
    return opening;
  };
  const keyOf = (key) => `${scope}:${key}`;
  const access = async (operation, key, value) => {
    const db = await open();
    if (!db) {
      if (operation === "put") { memory.set(keyOf(key), value); return; }
      if (operation === "delete") { memory.delete(keyOf(key)); return; }
      return memory.get(keyOf(key));
    }
    return new Promise((resolve) => {
      const transaction = db.transaction("cache", operation === "get" ? "readonly" : "readwrite");
      const store = transaction.objectStore("cache");
      const request = operation === "put" ? store.put(value, keyOf(key)) : store[operation](keyOf(key));
      let result;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = transaction.onabort = () => resolve(undefined);
    });
  };
  return {
    async get(key) {
      const entry = await access("get", key);
      if (!entry || entry.buster !== buster || now() - entry.timestamp > maxAge || entry.timestamp > now()) {
        if (entry) await access("delete", key);
        return undefined;
      }
      return structuredClone(entry.value);
    },
    put: (key, value) => access("put", key, { buster, timestamp: now(), value: textOnly(value) }),
    remove: (key) => access("delete", key),
  };
};
