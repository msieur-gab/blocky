// ══════════════════════════════════════════
// Eye Shapes Catalog
// Raw geometry from workbench — no animation, no sound
// Each entry is what the workbench exports
// ══════════════════════════════════════════

const DEFAULT = {
  w: 100, h: 200,
  tl: 50, tr: 50, br: 50, bl: 50,
  shiftTop: 0, shiftBot: 0,
  tilt: 0, x: 0, y: 0,
  shape: null,
};

export { DEFAULT };

export const catalog = {

  // ── Awake states ──
  awake:        { ...DEFAULT },
  calm:         { ...DEFAULT, h: 190 },
  happy:        { ...DEFAULT, h: 160 },
  surprise:     { ...DEFAULT },

  // ── Drowsy variants ──
  drowsy:       { ...DEFAULT, h: 100, tl: 20, tr: 20, shiftTop: 80 },
  drowsy_open:  { ...DEFAULT, h: 140, tl: 25, tr: 25, shiftTop: 50 },
  drowsy_shut:  { ...DEFAULT, h: 60,  tl: 15, tr: 15, shiftTop: 90 },

  // ── Sleep states ──
  asleep:       { ...DEFAULT, h: 20,  tl: 20, tr: 20, shiftTop: 80 },
  exhale:       { ...DEFAULT, h: 22,  tl: 20, tr: 20, shiftTop: 80 },
  inhale:       { ...DEFAULT, h: 22,  tl: 20, tr: 20, shiftTop: 80, tilt: -10, x: -5 },

  // ── Symbols (bypass pill renderer) ──
  star:         { ...DEFAULT, shape: 'star',      w: 64, h: 64 },
  heart:        { ...DEFAULT, shape: 'heart',     w: 64, h: 60 },
  musicNote:    { ...DEFAULT, shape: 'musicNote', w: 56, h: 68 },
  whirl:        { ...DEFAULT, shape: 'whirl',     w: 60, h: 60 },
};
