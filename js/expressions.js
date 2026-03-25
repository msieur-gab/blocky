// ══════════════════════════════════════════
// Expression Library
// Compositions: leftEye + rightEye + mouth + body
// Shapes come from shapes.js
// ══════════════════════════════════════════

// ── Default eye ──

const DEFAULT_EYE = {
  shape: 'pill',
  w: 40,
  h: 80,
  round: 50,
  x: 0,           // offset from gap position
  y: -10,
  tilt: 0,
};

// ── Default mouth ──

const DEFAULT_MOUTH = {
  shape: 'none',
  show: 0,
  w: 24,
  h: 4,
  y: 35,
  curve: 2,
  round: 2,
  open: 0,
};

// ── Default face (tilt, scale, squash) ──

const DEFAULT_FACE = {
  x: 0,
  y: 0,
  scale: 1,
  tilt: 0,
  squash: 0,
  skewX: 0,        // horizontal perspective (-1 to 1)
  skewY: 0,        // vertical perspective (-1 to 1)
};

// ── Full neutral expression ──

export const NEUTRAL = {
  eyeGap: 200,
  leftEye:  { ...DEFAULT_EYE },
  rightEye: { ...DEFAULT_EYE },
  mouth:    { ...DEFAULT_MOUTH },
  face:     { ...DEFAULT_FACE },
};

// Helper: symmetric eyes (both same)
function sym(eye, mouth, faceXform, gap) {
  return {
    ...(gap !== undefined ? { eyeGap: gap } : {}),
    leftEye:  { ...DEFAULT_EYE, ...eye },
    rightEye: { ...DEFAULT_EYE, ...eye },
    mouth:    { ...DEFAULT_MOUTH, ...mouth },
    face:     { ...DEFAULT_FACE, ...faceXform },
  };
}

// Helper: asymmetric eyes
function asym(left, right, mouth, faceXform, gap) {
  return {
    ...(gap !== undefined ? { eyeGap: gap } : {}),
    leftEye:  { ...DEFAULT_EYE, ...left },
    rightEye: { ...DEFAULT_EYE, ...right },
    mouth:    { ...DEFAULT_MOUTH, ...mouth },
    face:     { ...DEFAULT_FACE, ...faceXform },
  };
}

// ── Presets ──

export const PRESETS = {

  idle: sym(
    {},
    {},
    {},
  ),

  calm: sym(
    { h: 60 },
    { shape: 'line', show: 1, curve: 4, w: 22 },
    {},
  ),

  happy: sym(
    { shape: 'arc', w: 36, h: 36 },
    { shape: 'smile', show: 1, w: 32, curve: 14 },
    { scale: 1.02 },
  ),

  sad: sym(
    { w: 30, h: 40, round: 8, tilt: -8, y: -6 },
    { shape: 'frown', show: 1, w: 22, curve: 8 },
    { y: 4, scale: 0.97 },
  ),

  scared: sym(
    { w: 44, h: 56, round: 12, y: -8 },
    { shape: 'circle', show: 1, w: 14, h: 14, open: 1 },
    { scale: 0.92, squash: -0.1 },
    140,
  ),

  excited: sym(
    { w: 46, h: 88, round: 50 },
    { shape: 'rect', show: 1, w: 36, h: 8, open: 0.6, round: 4 },
    { scale: 1.06, squash: 0.1 },
  ),

  bored: sym(
    { w: 38, h: 16, round: 8, y: -6 },
    {},
    { y: 6, scale: 0.98 },
  ),

  angry: sym(
    { w: 38, h: 30, round: 4, tilt: 12, y: -8 },
    { shape: 'line', show: 1, w: 26, curve: -4 },
    { scale: 1.04 },
    160,
  ),

  curious: sym(
    { round: 50 },
    {},
    { skewX: 0.5, tilt: 5 },
  ),

  curious_b: sym(
    { round: 50 },
    {},
    { skewX: -0.5, tilt: -5 },
  ),

  look_bl: sym(
    {},
    {},
    { tilt: -10, skewX: 0.5 },
  ),

  look_tl: sym(
    {},
    {},
    { tilt: 10, skewX: 0.5 },
  ),

  look_tr: sym(
    {},
    {},
    { tilt: -10, skewX: -0.5 },
  ),

  look_br: sym(
    {},
    {},
    { tilt: 10, skewX: -0.5 },
  ),

  silly: asym(
    { shape: 'round', w: 36, h: 36, y: -12 },
    { shape: 'round', w: 30, h: 30, y: -10 },
    { shape: 'smile', show: 1, w: 38, curve: 16 },
    { tilt: -4, scale: 1.03, squash: 0.05 },
    210,
  ),

  // ── Extended expressions ──

  surprise: sym(
    { w: 48, h: 90, round: 50 },
    { shape: 'circle', show: 1, w: 16, h: 16, open: 1 },
    { scale: 1.08, squash: 0.15 },
  ),

  sleepy: sym(
    { w: 36, h: 8, round: 4, y: -4 },
    {},
    { y: 8, scale: 0.95 },
  ),

  embarrassed: sym(
    { w: 30, h: 24, round: 6, y: -6 },
    { shape: 'zigzag', show: 1, w: 28, h: 6 },
    { scale: 0.96 },
  ),

  love: sym(
    { shape: 'arc', w: 36, h: 36, y: -10 },
    { shape: 'three', show: 1, w: 14, h: 18, y: 32 },
    { scale: 1.04, squash: 0.06 },
  ),

  shocked: sym(
    { w: 52, h: 64, round: 12, y: -16 },
    { shape: 'circle', show: 1, w: 20, h: 20, open: 1 },
    { scale: 1.1, squash: 0.2 },
    160,
  ),

  suspicious: asym(
    { w: 36, h: 20, round: 4, tilt: 4, y: -8 },
    { w: 36, h: 12, round: 4, tilt: 4, y: -6 },
    { shape: 'line', show: 1, w: 16, curve: -2 },
    { tilt: -3 },
  ),

  determined: sym(
    { w: 36, h: 34, round: 4, tilt: 6, y: -10 },
    { shape: 'line', show: 1, w: 24, curve: 0 },
    { scale: 1.05 },
    170,
  ),

  thinking: asym(
    { w: 32, h: 44, round: 10, y: -14 },
    { w: 38, h: 50, round: 12, y: -14 },
    { shape: 'line', show: 1, w: 10, curve: 0 },
    { tilt: 8, x: 6 },
  ),

  yawn: sym(
    { w: 34, h: 10, round: 5, y: -4 },
    { shape: 'circle', show: 1, w: 22, h: 22, open: 1 },
    { scale: 1.04, squash: 0.1 },
  ),

  dizzy: asym(
    { shape: 'whirl', w: 30, h: 30, y: -8 },
    { shape: 'whirl', w: 26, h: 26, y: -10 },
    { shape: 'wave', show: 1, w: 24, h: 8 },
    { tilt: -6, x: -4 },
  ),

  annoyed: asym(
    { shape: 'angleRight', w: 28, h: 28, y: -8 },
    { shape: 'angleLeft', w: 28, h: 28, y: -8 },
    { shape: 'line', show: 1, w: 20, curve: -3 },
    {},
    170,
  ),

  starry: sym(
    { shape: 'star', w: 32, h: 32, y: -10 },
    { shape: 'smile', show: 1, w: 28, curve: 12 },
    { scale: 1.06 },
  ),

  musical: asym(
    { shape: 'musicNote', w: 28, h: 34, y: -10 },
    { shape: 'musicNote', w: 24, h: 30, y: -8 },
    { shape: 'smile', show: 1, w: 24, curve: 10 },
    { tilt: 4 },
  ),

  radio: asym(
    { shape: 'musicNote', w: 28, h: 34, y: -10 },
    { shape: 'musicNote', w: 24, h: 30, y: -8 },
    { shape: 'circle', show: 1, w: 28, h: 28, open: 1, y: 40 },
    { tilt: 2 },
  ),

  dead: sym(
    { shape: 'cross', w: 26, h: 26, y: -8 },
    { shape: 'line', show: 1, w: 20, curve: 0 },
    { scale: 0.9 },
  ),

  wink: asym(
    { w: 40, h: 80, round: 50 },             // open eye (default)
    { shape: 'arc', w: 32, h: 32, y: -8 },   // closed/arc eye
    { shape: 'smile', show: 1, w: 28, curve: 10 },
    {},
  ),
};

// ── Resolve a preset to full expression ──

export function resolve(name) {
  const preset = PRESETS[name];
  if (!preset) return { ...NEUTRAL };
  return {
    eyeGap: preset.eyeGap ?? NEUTRAL.eyeGap,
    leftEye:  { ...DEFAULT_EYE, ...preset.leftEye },
    rightEye: { ...DEFAULT_EYE, ...preset.rightEye },
    mouth:    { ...DEFAULT_MOUTH, ...preset.mouth },
    face:     { ...DEFAULT_FACE, ...preset.face },
  };
}

// ── All preset names ──

export function list() {
  return Object.keys(PRESETS);
}

// ── Exports for renderer ──

export { DEFAULT_EYE, DEFAULT_MOUTH, DEFAULT_FACE };
