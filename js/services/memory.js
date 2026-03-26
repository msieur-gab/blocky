// ══════════════════════════════════════════
// Memory Service — ami.b's brain
// Dexie.js over IndexedDB
// Source tracking, parental review, journal
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';

// ── Database ──

const db = new Dexie('ami-memory');

db.version(1).stores({
  config:      'key',
  faces:       'id, name, role, approved, createdAt',
  voicePrints: 'id, role',
  journal:     '++id, timestamp, category, skillId',
  skills:      'id, active',
});

// ── Init ──

let ready = false;

export async function init() {
  await db.open();

  // Ensure mode exists (default: home)
  const mode = await getConfig('mode');
  if (!mode) await setConfig('mode', 'home');

  // Hospital mode: auto-wipe on page unload
  if (await getMode() === 'hospital') {
    window.addEventListener('beforeunload', () => {
      db.faces.clear();
      db.journal.clear();
      db.voicePrints.clear();
    });
  }

  ready = true;
  const m = await getMode();
  console.log(`[memory] Ready (${m} mode)`);
  bus.emit('memory:ready', { mode: m });
}

// ══════════════════════════════════════════
// Config
// ══════════════════════════════════════════

export async function getConfig(key) {
  const record = await db.config.get(key);
  return record ? record.value : null;
}

export async function setConfig(key, value) {
  await db.config.put({ key, value });
}

export async function getMode() {
  return (await getConfig('mode')) || 'home';
}

export async function setMode(mode) {
  await setConfig('mode', mode);
  console.log(`[memory] Mode set to ${mode}`);
}

export async function getCreatureName() {
  return (await getConfig('creatureName')) || null;
}

export async function setCreatureName(name) {
  await setConfig('creatureName', name);
  console.log(`[memory] Creature named: ${name}`);
}

// ══════════════════════════════════════════
// Faces
// ══════════════════════════════════════════

export async function getFaces() {
  return db.faces.toArray();
}

export async function getFace(id) {
  return db.faces.get(id) || null;
}

export async function putFace(record) {
  // Ensure metadata
  if (!record.createdAt) record.createdAt = Date.now();
  if (record.approved === undefined) record.approved = false;

  await db.faces.put(record);

  // Log to journal
  await log({
    category: 'face',
    skillId: 'face-recognition',
    data: { action: record.seeCount > 1 ? 'recognized' : 'enrolled', name: record.name, role: record.role },
  });
}

export async function deleteFace(id) {
  await db.faces.delete(id);
}

export async function getPendingFaces() {
  return db.faces.where('approved').equals(0).toArray();
}

export async function approveFace(id) {
  await db.faces.update(id, { approved: true });
}

// ══════════════════════════════════════════
// Journal — open schema, skill-defined
// ══════════════════════════════════════════

export async function log(entry) {
  await db.journal.add({
    timestamp: Date.now(),
    category: entry.category,
    skillId: entry.skillId || 'system',
    data: entry.data || {},
  });
}

export async function getJournal(filters = {}) {
  let collection = db.journal.orderBy('timestamp').reverse();

  if (filters.category) {
    collection = db.journal.where('category').equals(filters.category).reverse();
  }

  if (filters.skillId) {
    collection = db.journal.where('skillId').equals(filters.skillId).reverse();
  }

  let results = await collection.toArray();

  // Date range filter (post-query — Dexie compound index would be better but this is simple)
  if (filters.from) results = results.filter(e => e.timestamp >= filters.from);
  if (filters.to) results = results.filter(e => e.timestamp <= filters.to);

  if (filters.limit) results = results.slice(0, filters.limit);

  return results;
}

export async function exportJournal(format = 'json') {
  const entries = await db.journal.orderBy('timestamp').toArray();

  if (format === 'csv') {
    const header = 'timestamp,category,skillId,data\n';
    const rows = entries.map(e =>
      `${new Date(e.timestamp).toISOString()},${e.category},${e.skillId},"${JSON.stringify(e.data).replace(/"/g, '""')}"`
    ).join('\n');
    return header + rows;
  }

  return JSON.stringify(entries, null, 2);
}

// ══════════════════════════════════════════
// Skills registry
// ══════════════════════════════════════════

export async function registerSkill(id, name) {
  await db.skills.put({ id, name, active: true, registeredAt: Date.now() });
}

export async function getSkills() {
  return db.skills.toArray();
}

export async function setSkillActive(id, active) {
  await db.skills.update(id, { active });
}

// ══════════════════════════════════════════
// Voice prints
// ══════════════════════════════════════════

export async function getVoicePrint(role) {
  return db.voicePrints.where('role').equals(role).first() || null;
}

export async function putVoicePrint(record) {
  await db.voicePrints.put(record);
}

// ══════════════════════════════════════════
// Parental review
// ══════════════════════════════════════════

export async function getPending() {
  const faces = await db.faces.where('approved').equals(0).toArray();
  return { faces };
}

export async function approve(table, id) {
  if (table === 'faces') await db.faces.update(id, { approved: true });
}

export async function reject(table, id) {
  if (table === 'faces') await db.faces.delete(id);
}

// ══════════════════════════════════════════
// Wipe
// ══════════════════════════════════════════

export async function wipe(category) {
  if (category === 'faces') await db.faces.clear();
  else if (category === 'journal') await db.journal.clear();
  else if (category === 'voicePrints') await db.voicePrints.clear();
  else if (category === 'all') {
    await db.faces.clear();
    await db.journal.clear();
    await db.voicePrints.clear();
    await db.skills.clear();
    // Keep config (mode, creature name)
  }
  console.log(`[memory] Wiped: ${category}`);
  bus.emit('memory:wiped', { category });
}

// ── Compatibility aliases (old storage.js API) ──

export const getPref = getConfig;
export const setPref = setConfig;
export const clear = wipe;
export function isReady() { return ready; }
