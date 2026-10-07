// ══════════════════════════════════════════
// Eye Shapes Catalog
// Raw geometry from workbench — no animation, no sound
// All values in Figma coordinates (w:100 h:200 radii:50 gap:400)
// ══════════════════════════════════════════

export const DEFAULT = {
  w: 100, h: 200,
  tl: 50, tr: 50, br: 50, bl: 50,
  shiftTop: 0, shiftBot: 0,
  tilt: 0, x: 0, y: 0,
  shape: null,
};

export const catalog = {

  // ── Awake states ──
  awake:        { ...DEFAULT },
  calm:         { ...DEFAULT, h: 190 },

  // ── Emotions (placeholder pills — replace with workbench designs) ──
  happy:        { ...DEFAULT, h: 160 },
  sad:          { ...DEFAULT, h: 170, tilt: 8 },
  scared:       { ...DEFAULT },
  excited:      { ...DEFAULT },
  bored:        { ...DEFAULT, h: 80 },
  angry:        { ...DEFAULT, h: 120, tilt: -12 },
  surprise:     { ...DEFAULT },
  love:         { ...DEFAULT, h: 170, tilt: 6 },
  embarrassed:  { ...DEFAULT, h: 80 },
  shocked:      { ...DEFAULT },
  suspicious_l: { ...DEFAULT, h: 60, tilt: -4 },
  suspicious_r: { ...DEFAULT, h: 75, tilt: 5 },
  determined:   { ...DEFAULT, h: 130, tilt: -8 },
  thinking_l:   { ...DEFAULT, h: 175 },
  thinking_r:   { ...DEFAULT, h: 200, tilt: 5 },
  worried:      { ...DEFAULT, h: 155, tilt: 6 },
  attentive_l:  { ...DEFAULT, h: 195, tilt: 3 },
  attentive_r:  { ...DEFAULT, h: 185, tilt: -5 },
  silly_l:      { ...DEFAULT, h: 180, tilt: 10 },
  silly_r:      { ...DEFAULT, h: 160, tilt: -6 },
  curious_l:    { ...DEFAULT, h: 210, tilt: -5 },
  curious_r:    { ...DEFAULT, h: 170, tilt: 8 },
  annoyed:      { ...DEFAULT, h: 80, tilt: -8 },
  wink_closed:  { ...DEFAULT, h: 20 },
  sleepy:       { ...DEFAULT, h: 50 },
  yawn:         { ...DEFAULT, h: 50 },

  // ── Drowsy / Sleep (workbench-designed by Gab) ──
  drowsy:       { ...DEFAULT, h: 100, tl: 20, tr: 20, shiftTop: 80 },
  drowsy_open:  { ...DEFAULT, h: 140, tl: 25, tr: 25, shiftTop: 50 },
  drowsy_shut:  { ...DEFAULT, h: 60,  tl: 15, tr: 15, shiftTop: 90 },
  asleep:       { ...DEFAULT, h: 20,  tl: 20, tr: 20, shiftTop: 80 },
  exhale:       { ...DEFAULT, h: 22,  tl: 20, tr: 20, shiftTop: 80 },
  inhale:       { ...DEFAULT, h: 22,  tl: 20, tr: 20, shiftTop: 80, tilt: -10, x: -5 },

  // ── Symbols (bypass pill renderer) ──
  star:         { ...DEFAULT, shape: 'star',      w: 64, h: 64 },
  heart:        { ...DEFAULT, shape: 'heart',     w: 64, h: 60 },
  musicNote:    { ...DEFAULT, shape: 'musicNote', w: 56, h: 68 },
  whirl:        { ...DEFAULT, shape: 'whirl',     w: 60, h: 60 },
  cross:        { ...DEFAULT, shape: 'cross',     w: 52, h: 52 },

  // ── Digits (for time display) ──
  zero:  { ...DEFAULT, shape: 'zero',  w: 52, h: 80 },
  one:   { ...DEFAULT, shape: 'one',   w: 52, h: 80 },
  two:   { ...DEFAULT, shape: 'two',   w: 52, h: 80 },
  three: { ...DEFAULT, shape: 'three', w: 52, h: 80 },
  four:  { ...DEFAULT, shape: 'four',  w: 52, h: 80 },
  five:  { ...DEFAULT, shape: 'five',  w: 52, h: 80 },
  six:   { ...DEFAULT, shape: 'six',   w: 52, h: 80 },
  seven: { ...DEFAULT, shape: 'seven', w: 52, h: 80 },
  eight: { ...DEFAULT, shape: 'eight', w: 52, h: 80 },
  nine:  { ...DEFAULT, shape: 'nine',  w: 52, h: 80 },

  // ── RPS game shapes ──
  rock:     { ...DEFAULT, shape: 'rock',     w: 72, h: 72 },
  paper:    { ...DEFAULT, shape: 'paper',    w: 88, h: 60 },
  scissors: { ...DEFAULT, shape: 'scissors', w: 60, h: 80 },
};
