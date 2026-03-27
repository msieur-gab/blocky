// ══════════════════════════════════════════
// Mouth Catalog
// Each entry defines a mouth state
// shape = drawing function name from renderer
// ══════════════════════════════════════════

export const DEFAULT = {
  shape: 'none',
  show: 0,
  w: 24,
  h: 4,
  y: 55,
  curve: 0,
  open: 0,
};

export const catalog = {

  none:     { ...DEFAULT },

  // ── Breathing ──
  sleep_exhale: { ...DEFAULT, shape: 'circle', show: 1, w: 6,  h: 6,  open: 0.3 },
  sleep_inhale: { ...DEFAULT, shape: 'circle', show: 1, w: 14, h: 14, open: 0.8 },

  // ── Emotions ──
  smile:    { ...DEFAULT, shape: 'smile', show: 1, w: 32, curve: 14 },
  frown:    { ...DEFAULT, shape: 'frown', show: 1, w: 22, curve: 8 },
  line:     { ...DEFAULT, shape: 'line',  show: 1, w: 22, curve: 4 },
  open:     { ...DEFAULT, shape: 'circle', show: 1, w: 16, h: 16, open: 1 },
  yawn:     { ...DEFAULT, shape: 'circle', show: 1, w: 22, h: 22, open: 1 },
  zigzag:   { ...DEFAULT, shape: 'zigzag', show: 1, w: 28, h: 6 },
};
