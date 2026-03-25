// ══════════════════════════════════════════
// Storage Service
// Raw IndexedDB — Blocky's memory
// ══════════════════════════════════════════

// Stores: face embeddings, preferences.
// Hospital mode: in-memory only, wipes on reset.
// Home mode: persists to IndexedDB.

import { bus } from '../utils/events.js';

const DB_NAME = 'blocky-memory';
const DB_VERSION = 1;

let db = null;
let mode = 'home'; // 'home' | 'hospital'

// In-memory fallback for hospital mode
const memStore = { faces: new Map(), prefs: new Map() };

// ── IndexedDB helpers ──

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('faces')) {
        const store = db.createObjectStore('faces', { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('role', 'role', { unique: false });
      }
      if (!db.objectStoreNames.contains('prefs')) {
        db.createObjectStore('prefs', { keyPath: 'key' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const result = fn(store);

    transaction.oncomplete = () => resolve(result._value);
    transaction.onerror = () => reject(transaction.error);

    // Capture the request result
    if (result instanceof IDBRequest) {
      result.onsuccess = () => { result._value = result.result; };
    } else {
      result._value = undefined;
    }
  });
}

function idbGetAll(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(storeName, record) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function idbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbClear(storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Public API ──

export async function init(m = 'home') {
  mode = m;

  if (mode === 'home') {
    try {
      db = await openDB();
      console.log('[storage] IndexedDB ready (home mode)');
    } catch (e) {
      console.warn('[storage] IndexedDB failed, falling back to memory:', e);
      mode = 'hospital'; // fallback
    }
  } else {
    console.log('[storage] In-memory only (hospital mode)');
  }

  bus.emit('storage:ready', { mode });
}

// ── Faces ──

export async function getFaces() {
  if (mode === 'hospital') {
    return [...memStore.faces.values()];
  }
  return idbGetAll('faces');
}

export async function getFace(id) {
  if (mode === 'hospital') {
    return memStore.faces.get(id) || null;
  }
  const result = await idbGet('faces', id);
  return result || null;
}

export async function putFace(record) {
  if (mode === 'hospital') {
    memStore.faces.set(record.id, record);
    return;
  }
  await idbPut('faces', record);
}

export async function deleteFace(id) {
  if (mode === 'hospital') {
    memStore.faces.delete(id);
    return;
  }
  await idbDelete('faces', id);
}

// ── Preferences ──

export async function getPref(key) {
  if (mode === 'hospital') {
    return memStore.prefs.get(key) ?? null;
  }
  const record = await idbGet('prefs', key);
  return record ? record.value : null;
}

export async function setPref(key, value) {
  if (mode === 'hospital') {
    memStore.prefs.set(key, value);
    return;
  }
  await idbPut('prefs', { key, value });
}

// ── Wipe ──

export async function clear() {
  memStore.faces.clear();
  memStore.prefs.clear();

  if (db) {
    await idbClear('faces');
    await idbClear('prefs');
  }

  console.log('[storage] All data cleared');
  bus.emit('storage:cleared');
}

export function getMode() { return mode; }
