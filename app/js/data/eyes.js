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
  // Carving (Figma units, see carveEye in face.js) — round bites out of the pill
  brow: 0,    // + inner corners cut (sulky) · − outer corners cut (sad)
  lower: 0,   // disc rising from below → happy crescent
  upper: 0,   // heavy lid from above → sleepy, bored
  shape: null,
};

export const catalog = {

  // ── Awake states ──
  awake:        { ...DEFAULT },
  calm:         { ...DEFAULT, h: 190 },

  // ── Emotions — carved values from the face lab, to tune by eye ──
  happy:        { ...DEFAULT, h: 180, lower: 80 },
  sad:          { ...DEFAULT, h: 170, tilt: 8, brow: -40, upper: 10 },
  scared:       { ...DEFAULT, w: 95, h: 215, brow: -25 },
  excited:      { ...DEFAULT, w: 105, h: 205, lower: 45 },
  bored:        { ...DEFAULT, h: 160, upper: 80 },
  angry:        { ...DEFAULT, w: 110, h: 140, tilt: -6, brow: 55, upper: 10 },
  surprise:     { ...DEFAULT, w: 110, h: 230 },
  love:         { ...DEFAULT, h: 170, tilt: 6, lower: 60 },
  embarrassed:  { ...DEFAULT, h: 150, lower: 65, upper: 25 },
  shocked:      { ...DEFAULT, w: 115, h: 240 },
  suspicious_l: { ...DEFAULT, h: 170, tilt: -4, upper: 85, brow: 20 },
  suspicious_r: { ...DEFAULT, h: 170, tilt: 5, upper: 55, brow: 10 },
  determined:   { ...DEFAULT, h: 160, tilt: -8, brow: 40, upper: 10 },
  thinking_l:   { ...DEFAULT, h: 180, upper: 35, brow: 15 },
  thinking_r:   { ...DEFAULT, h: 205, tilt: 5 },
  worried:      { ...DEFAULT, h: 155, tilt: 6, brow: -40 },
  attentive_l:  { ...DEFAULT, h: 195, tilt: 3 },
  attentive_r:  { ...DEFAULT, h: 185, tilt: -5 },
  silly_l:      { ...DEFAULT, h: 180, tilt: 10, lower: 60 },
  silly_r:      { ...DEFAULT, h: 160, tilt: -6, lower: 70, upper: 30 },
  curious_l:    { ...DEFAULT, h: 210, tilt: -5 },
  curious_r:    { ...DEFAULT, h: 165, tilt: 8, upper: 20 },
  annoyed:      { ...DEFAULT, h: 150, tilt: -4, upper: 70, brow: 30 },
  wink_closed:  { ...DEFAULT, h: 140, lower: 118 },
  sleepy:       { ...DEFAULT, h: 150, upper: 95 },
  yawn:         { ...DEFAULT, h: 120, upper: 30, lower: 40 },

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
