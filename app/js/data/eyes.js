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
  // Lids (see closeLids in face.js): fractions of the eye, so they hold at any size
  lidTop: 0,   // 0…1 upper lid down: sleepy, bored, sulking
  lidBot: 0,   // 0…1 lower lid up, as an arch: the eye becomes a smile
  slant: 0,    // degrees: + upper lid down toward the nose (cross), − toward the ear (sad)
  shape: null,
};

export const catalog = {

  // ── Awake states ──
  awake:        { ...DEFAULT },
  calm:         { ...DEFAULT, h: 190 },

  // ── Emotions — pill + lids. One line each; tune them in workbench/face-tuner.html ──
  happy:        { ...DEFAULT, h: 180, lidBot: 0.45 },
  sad:          { ...DEFAULT, h: 170, tilt: 6, lidTop: 0.12, slant: -14 },
  scared:       { ...DEFAULT, w: 95, h: 215, slant: -8 },
  excited:      { ...DEFAULT, w: 106, h: 205, lidBot: 0.22 },
  bored:        { ...DEFAULT, h: 170, lidTop: 0.5 },
  angry:        { ...DEFAULT, w: 108, h: 150, lidTop: 0.14, slant: 18 },
  surprise:     { ...DEFAULT, w: 108, h: 228 },
  love:         { ...DEFAULT, h: 175, lidBot: 0.35 },
  embarrassed:  { ...DEFAULT, h: 150, lidTop: 0.15, lidBot: 0.4 },
  shocked:      { ...DEFAULT, w: 114, h: 238 },
  suspicious_l: { ...DEFAULT, h: 170, lidTop: 0.52, slant: 8 },
  suspicious_r: { ...DEFAULT, h: 170, lidTop: 0.34, slant: 4 },
  determined:   { ...DEFAULT, h: 165, lidTop: 0.1, slant: 14 },
  thinking_l:   { ...DEFAULT, h: 180, lidTop: 0.22 },
  thinking_r:   { ...DEFAULT, h: 204, tilt: 5 },
  worried:      { ...DEFAULT, h: 160, tilt: 4, slant: -12 },
  attentive_l:  { ...DEFAULT, h: 195, tilt: 3 },
  attentive_r:  { ...DEFAULT, h: 185, tilt: -5 },
  silly_l:      { ...DEFAULT, h: 180, tilt: 10, lidBot: 0.32 },
  silly_r:      { ...DEFAULT, h: 160, tilt: -6, lidBot: 0.4 },
  curious_l:    { ...DEFAULT, h: 210, tilt: -5 },
  curious_r:    { ...DEFAULT, h: 168, tilt: 8, lidTop: 0.12 },
  annoyed:      { ...DEFAULT, h: 155, lidTop: 0.45, slant: 10 },
  wink_closed:  { ...DEFAULT, h: 130, lidBot: 0.5 },              // a thick arch at eye level
  sleepy:       { ...DEFAULT, h: 180, lidTop: 0.48 },             // half shut; `droop` does the rest
  petted:       { ...DEFAULT, h: 150, lidBot: 0.6 },              // two happy arches
  yawn:         { ...DEFAULT, h: 130, lidTop: 0.2, lidBot: 0.25 },

  // ── Drowsy / Sleep (workbench-designed by Gab) ──
  // Falling asleep: a heavy lid leaning toward the ears, opening and giving in
  // (the earlier slanted-pill versions are in git history)
  drowsy:       { ...DEFAULT, h: 180, lidTop: 0.5,  slant: -8 },
  drowsy_open:  { ...DEFAULT, h: 190, lidTop: 0.3,  slant: -6 },
  drowsy_shut:  { ...DEFAULT, h: 170, lidTop: 0.74, slant: -8 },
  // Asleep: only the bottom curve of the eye is left, a closed lid  ‿
  asleep:       { ...DEFAULT, h: 70, lidTop: 0.64 },
  exhale:       { ...DEFAULT, h: 70, lidTop: 0.64 },
  inhale:       { ...DEFAULT, h: 78, lidTop: 0.58, tilt: -10, x: -5 },

  // ── Symbols (bypass pill renderer) ──
  // As big as an eye: small thin symbols could not be seen on the screen
  star:         { ...DEFAULT, shape: 'star',      w: 160, h: 160 },
  heart:        { ...DEFAULT, shape: 'heart',     w: 170, h: 170 },
  musicNote:    { ...DEFAULT, shape: 'musicNote', w: 190, h: 190 },
  whirl:        { ...DEFAULT, shape: 'whirl',     w: 170, h: 170 },
  cross:        { ...DEFAULT, shape: 'cross',     w: 130, h: 130 },

  // ── Digits (for time display, countdown) ──
  zero:  { ...DEFAULT, shape: 'zero',  w: 130, h: 190 },
  one:   { ...DEFAULT, shape: 'one',   w: 130, h: 190 },
  two:   { ...DEFAULT, shape: 'two',   w: 130, h: 190 },
  three: { ...DEFAULT, shape: 'three', w: 130, h: 190 },
  four:  { ...DEFAULT, shape: 'four',  w: 130, h: 190 },
  five:  { ...DEFAULT, shape: 'five',  w: 130, h: 190 },
  six:   { ...DEFAULT, shape: 'six',   w: 130, h: 190 },
  seven: { ...DEFAULT, shape: 'seven', w: 130, h: 190 },
  eight: { ...DEFAULT, shape: 'eight', w: 130, h: 190 },
  nine:  { ...DEFAULT, shape: 'nine',  w: 130, h: 190 },

  // ── RPS game shapes ──
  rock:     { ...DEFAULT, shape: 'rock',     w: 180, h: 180 },
  paper:    { ...DEFAULT, shape: 'paper',    w: 180, h: 180 },
  scissors: { ...DEFAULT, shape: 'scissors', w: 180, h: 180 },
};
