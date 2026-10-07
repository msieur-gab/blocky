// ══════════════════════════════════════════
// Simple event bus
// ══════════════════════════════════════════

const listeners = new Map();

export const bus = {
  on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event)?.delete(fn);
  },

  off(event, fn) {
    listeners.get(event)?.delete(fn);
  },

  emit(event, data) {
    // One listener failing must not stop the others, nor whoever sent the event
    listeners.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error(`[bus] "${event}" listener failed:`, e); }
    });
  },
};
