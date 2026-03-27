// ══════════════════════════════════════════
// Expression Library
// Compositions: leftEye + rightEye + mouth + body
// Eyes are pill shapes with 4 independent corner radii
// Symbol shapes (star, musicNote, digits, etc.) override via shape field
// ══════════════════════════════════════════

// ── Default eye — pill with uniform corners ──

// Values match Figma coordinate space directly:
// w/h = full width/height, radii = Figma corner radius, gap = center-to-center
const DEFAULT_EYE = {
  w: 100,
  h: 200,
  tl: 50, tr: 50, br: 50, bl: 50,  // Figma corner radii
  shiftTop: 0,   // horizontal offset of top edge (Figma units)
  shiftBot: 0,   // horizontal offset of bottom edge (Figma units)
  x: 0,
  y: 0,
  tilt: 0,
  skewX: 0,
  skewY: 0,
  shape: null,   // null = pill, string = symbol override (star, musicNote, etc.)
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
  skewX: 0,
  skewY: 0,
};

// ── Full neutral expression ──

export const NEUTRAL = {
  eyeGap: 400,  // Figma center-to-center distance
  leftEye:  { ...DEFAULT_EYE },
  rightEye: { ...DEFAULT_EYE },
  mouth:    { ...DEFAULT_MOUTH },
  face:     { ...DEFAULT_FACE },
};

// Helper: symmetric eyes (both same, right eye mirrors tilt)
function sym(eye, mouth, faceXform, gap) {
  const left = { ...DEFAULT_EYE, ...eye };
  // Mirror: swap tl↔tr, bl↔br, negate tilt + shifts for right eye
  const right = {
    ...left,
    tl: left.tr, tr: left.tl,
    bl: left.br, br: left.bl,
    tilt: -(left.tilt || 0),
    shiftTop: -(left.shiftTop || 0),
    shiftBot: -(left.shiftBot || 0),
    x: -(left.x || 0),
  };
  return {
    ...(gap !== undefined ? { eyeGap: gap } : {}),
    leftEye:  left,
    rightEye: right,
    mouth:    { ...DEFAULT_MOUTH, ...mouth },
    face:     { ...DEFAULT_FACE, ...faceXform },
  };
}

// Helper: asymmetric eyes (each defined independently)
function asym(left, right, mouth, faceXform, gap) {
  return {
    ...(gap !== undefined ? { eyeGap: gap } : {}),
    leftEye:  { ...DEFAULT_EYE, ...left },
    rightEye: { ...DEFAULT_EYE, ...right },
    mouth:    { ...DEFAULT_MOUTH, ...mouth },
    face:     { ...DEFAULT_FACE, ...faceXform },
  };
}

// ── Dynamic expressions (symbols in eyes) ──

const DIGIT_SHAPES = ['zero','one','two','three','four','five','six','seven','eight','nine'];

export function makeTimeExpression(hours) {
  const h1 = Math.floor(hours / 10);
  const h0 = hours % 10;
  return {
    eyeGap: 400,
    leftEye:  { ...DEFAULT_EYE, shape: DIGIT_SHAPES[h1] || 'zero', w: 65, h: 100 },
    rightEye: { ...DEFAULT_EYE, shape: DIGIT_SHAPES[h0] || 'zero', w: 65, h: 100 },
    mouth:    { ...DEFAULT_MOUTH, show: 0 },
    face:     { ...DEFAULT_FACE, scale: 1.1 },
  };
}

export function makeMinuteExpression(minutes) {
  const m1 = Math.floor(minutes / 10);
  const m0 = minutes % 10;
  return {
    eyeGap: 400,
    leftEye:  { ...DEFAULT_EYE, shape: DIGIT_SHAPES[m1] || 'zero', w: 65, h: 100 },
    rightEye: { ...DEFAULT_EYE, shape: DIGIT_SHAPES[m0] || 'zero', w: 65, h: 100 },
    mouth:    { ...DEFAULT_MOUTH, show: 0 },
    face:     { ...DEFAULT_FACE, scale: 1.1 },
  };
}

// ══════════════════════════════════════════
// Presets — all from Figma workbench designs
// Eyes are pill deformations (corner radii + dimensions)
// ══════════════════════════════════════════

export const PRESETS = {

  // ══════════════════════════════════════════
  // Expressions — pill eyes with safe deformations
  // Designed to look correct with arcTo pill renderer
  // Replace with workbench values as each is designed in Figma
  // ══════════════════════════════════════════

  // ── Core emotions ──

  idle: sym({}, {}, {}),

  calm: sym(
    { h: 190 },
    { shape: 'line', show: 1, curve: 4, w: 22 },
    {},
  ),

  happy: sym(
    { w: 110, h: 140, shiftBot: 10 },
    { shape: 'smile', show: 1, w: 36, curve: 16 },
    { scale: 1.04, y: -4 },
  ),

  sad: asym(
    { h: 160, tilt: 10, shiftTop: 15 },
    { h: 160, tilt: -10, shiftTop: -15 },
    { shape: 'frown', show: 1, w: 24, curve: 10 },
    { y: 8, scale: 0.95 },
  ),

  scared: sym(
    { w: 120, h: 250 },
    { shape: 'circle', show: 1, w: 16, h: 16, open: 1 },
    { scale: 0.90, squash: -0.12, y: -6 },
    500,
  ),

  excited: sym(
    { w: 120, h: 240 },
    { shape: 'rect', show: 1, w: 36, h: 8, open: 0.6, round: 4 },
    { scale: 1.08, squash: 0.12 },
    440,
  ),

  bored: sym(
    { w: 110, h: 70, shiftTop: 20 },
    {},
    { y: 10, scale: 0.96 },
  ),

  angry: asym(
    { h: 110, tilt: -15, shiftTop: -20 },
    { h: 110, tilt: 15, shiftTop: 20 },
    { shape: 'line', show: 1, w: 28, curve: -6 },
    { scale: 1.06 },
    360,
  ),

  // ── Curiosity / Attention ──

  curious: asym(
    { w: 110, h: 220, tilt: -6 },
    { w: 90, h: 170, tilt: 10 },
    {},
    { skewX: 0.5, tilt: 6 },
  ),

  curious_b: asym(
    { w: 90, h: 170, tilt: -10 },
    { w: 110, h: 220, tilt: 6 },
    {},
    { skewX: -0.5, tilt: -6 },
  ),

  look_bl: sym({}, {}, { tilt: -10, skewX: 0.5 }),
  look_tl: sym({}, {}, { tilt: 10, skewX: 0.5 }),
  look_tr: sym({}, {}, { tilt: -10, skewX: -0.5 }),
  look_br: sym({}, {}, { tilt: 10, skewX: -0.5 }),

  // ── Extended emotions ──

  silly: asym(
    { w: 110, h: 180, tilt: 12 },
    { w: 95, h: 155, tilt: -8 },
    { shape: 'smile', show: 1, w: 40, curve: 18 },
    { tilt: -5, scale: 1.04, squash: 0.06 },
    430,
  ),

  surprise: sym(
    { w: 130, h: 250 },
    { shape: 'circle', show: 1, w: 18, h: 18, open: 1 },
    { scale: 1.10, squash: 0.16, y: -4 },
    470,
  ),

  sleepy: sym(
    { h: 50, shiftTop: 30 },
    {},
    { y: 10, scale: 0.94 },
  ),

  embarrassed: sym(
    { h: 80, shiftTop: 10 },
    { shape: 'zigzag', show: 1, w: 30, h: 6 },
    { scale: 0.95, y: 4 },
  ),

  love: asym(
    { w: 110, h: 170, tilt: 8 },
    { w: 110, h: 170, tilt: -8 },
    { shape: 'three', show: 1, w: 16, h: 20, y: 34 },
    { scale: 1.06, squash: 0.08 },
  ),

  shocked: sym(
    { w: 130, h: 180 },
    { shape: 'circle', show: 1, w: 22, h: 22, open: 1 },
    { scale: 1.12, squash: 0.2, y: -6 },
    380,
  ),

  suspicious: asym(
    { h: 60, tilt: -4, shiftTop: -15 },
    { h: 75, tilt: 5, shiftTop: 15 },
    { shape: 'line', show: 1, w: 18, curve: -3 },
    { tilt: -4 },
  ),

  determined: asym(
    { h: 130, tilt: -10, shiftTop: -18 },
    { h: 130, tilt: 10, shiftTop: 18 },
    { shape: 'line', show: 1, w: 26, curve: -2 },
    { scale: 1.06 },
    380,
  ),

  thinking: asym(
    { h: 175 },
    { w: 105, h: 210, tilt: 6 },
    { shape: 'line', show: 1, w: 12, curve: 0 },
    { tilt: 10, x: 14 },
  ),

  worried: asym(
    { h: 155, tilt: 8, shiftTop: 12 },
    { h: 155, tilt: -8, shiftTop: -12 },
    { shape: 'frown', show: 1, w: 22, curve: 8 },
    { scale: 0.96, y: 6 },
  ),

  attentive: asym(
    { tilt: 4, h: 195 },
    { tilt: -6, h: 185 },
    {},
    {},
  ),

  yawn: sym(
    { h: 50, shiftTop: 30 },
    { shape: 'circle', show: 1, w: 24, h: 24, open: 1 },
    { scale: 1.04, squash: 0.1, y: 4 },
  ),

  annoyed: asym(
    { h: 75, tilt: -10, shiftTop: -15 },
    { h: 75, tilt: 10, shiftTop: 15 },
    { shape: 'line', show: 1, w: 22, curve: -4 },
    {},
    390,
  ),

  wink: asym(
    { h: 20, shiftTop: 30 },
    { h: 215, w: 105 },
    { shape: 'smile', show: 1, w: 30, curve: 12 },
    { tilt: -3 },
  ),

  // ── Sleep states ──

  drowsy: sym(
    { h: 100, tl: 20, tr: 20, shiftTop: 80 },
    {},
    {},
  ),

  asleep: sym(
    { h: 20, tl: 20, tr: 20, shiftTop: 80 },
    {},
    {},
  ),

  sleep_exhale: sym(
    { h: 22, tl: 20, tr: 20, shiftTop: 80 },
    {},
    {},
  ),

  sleep_inhale: sym(
    { h: 22, tl: 20, tr: 20, shiftTop: 80, tilt: -10, x: -5 },
    {},
    {},
  ),

  // ── Symbol overrides (snap, don't morph) ──

  dizzy: asym(
    { shape: 'whirl', w: 30, h: 30, y: -8 },
    { shape: 'whirl', w: 26, h: 26, y: -10 },
    { shape: 'wave', show: 1, w: 24, h: 8 },
    { tilt: -6, x: -4 },
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

  // ── Game: Countdown ──

  countdown_3: sym(
    { shape: 'three', w: 30, h: 44 },
    { show: 0 },
    { scale: 1.1 },
  ),

  countdown_2: sym(
    { shape: 'two', w: 30, h: 44 },
    { show: 0 },
    { scale: 1.1 },
  ),

  countdown_1: sym(
    { shape: 'one', w: 30, h: 44 },
    { show: 0 },
    { scale: 1.15 },
  ),

  // ── Game: RPS moves ──

  rps_rock: sym(
    { shape: 'rock', w: 36, h: 36 },
    { show: 0 },
    { scale: 1.05 },
  ),

  rps_paper: sym(
    { shape: 'paper', w: 44, h: 30 },
    { show: 0 },
    { scale: 1.05 },
  ),

  rps_scissors: sym(
    { shape: 'scissors', w: 30, h: 40 },
    { show: 0 },
    { scale: 1.05 },
  ),

  dead: sym(
    { shape: 'cross', w: 26, h: 26, y: -8 },
    { shape: 'line', show: 1, w: 20, curve: 0 },
    { scale: 0.9 },
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

export function list() {
  return Object.keys(PRESETS);
}

export { DEFAULT_EYE, DEFAULT_MOUTH, DEFAULT_FACE };
