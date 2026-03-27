// ══════════════════════════════════════════
// Mouth Catalog
// Each entry defines a mouth state
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

  none:          { ...DEFAULT },

  // ── Breathing ──
  sleep_exhale:  { ...DEFAULT, shape: 'circle', show: 1, w: 16, h: 16, open: 0.4 },
  sleep_inhale:  { ...DEFAULT, shape: 'circle', show: 1, w: 36, h: 36, open: 1 },

  // ── Emotions ──
  smile:         { ...DEFAULT, shape: 'smile', show: 1, w: 32, curve: 14 },
  smile_big:     { ...DEFAULT, shape: 'smile', show: 1, w: 38, curve: 16 },
  frown:         { ...DEFAULT, shape: 'frown', show: 1, w: 22, curve: 8 },
  frown_small:   { ...DEFAULT, shape: 'frown', show: 1, w: 20, curve: 6 },
  line:          { ...DEFAULT, shape: 'line',  show: 1, w: 22, curve: 4 },
  line_flat:     { ...DEFAULT, shape: 'line',  show: 1, w: 24, curve: 0 },
  line_down:     { ...DEFAULT, shape: 'line',  show: 1, w: 26, curve: -4 },
  line_small:    { ...DEFAULT, shape: 'line',  show: 1, w: 10, curve: 0 },
  open_small:    { ...DEFAULT, shape: 'circle', show: 1, w: 14, h: 14, open: 1 },
  open_medium:   { ...DEFAULT, shape: 'circle', show: 1, w: 16, h: 16, open: 1 },
  open_big:      { ...DEFAULT, shape: 'circle', show: 1, w: 20, h: 20, open: 1 },
  yawn:          { ...DEFAULT, shape: 'circle', show: 1, w: 24, h: 24, open: 1 },
  zigzag:        { ...DEFAULT, shape: 'zigzag', show: 1, w: 28, h: 6 },
  wave:          { ...DEFAULT, shape: 'wave',   show: 1, w: 24, h: 8 },
  three:         { ...DEFAULT, shape: 'three',  show: 1, w: 16, h: 20, y: 52 },

  // ── Radio ──
  radio_circle:  { ...DEFAULT, shape: 'circle', show: 1, w: 28, h: 28, open: 1, y: 60 },
};
