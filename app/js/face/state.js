// ══════════════════════════════════════════
// Face — shared state
// Everything the face modules read and write lives here, in one place:
// the canvas, the look, the proportions, and where every moving part is right now.
// ══════════════════════════════════════════

import { lerp, clamp } from '../utils/math.js';
import { DEFAULT as DEFAULT_EYE } from '../data/eyes.js';
import { DEFAULT as DEFAULT_MOUTH } from '../data/mouths.js';

export const DEFAULT_FACE = { x: 0, y: 0, scale: 1, tilt: 0, squash: 0, skewX: 0, skewY: 0 };

// ── Look ──

export const DARK  = { fg: '#C6F3E5', bg: '#0B1110' };
export const LIGHT = { fg: '#28261f', bg: '#f0efe8' };

// ── Proportions ──
// The catalog is written for an eye 100 wide, 200 high, centres 400 apart.
// These say what those three numbers are drawn as, so the whole face can be re-proportioned at once.
// Values chosen by Gab in workbench/face-tuner.html, 2026-10-07.

export const PROPORTIONS = { eyeW: 140, eyeH: 250, gap: 400, zoom: 1.4, symbol: 1, stroke: 1, mouth: 1.5 };
export const prop = { ...PROPORTIONS };
export const wide = () => prop.eyeW / 100;
export const tall = () => prop.eyeH / 200;
export const gapNow = () => face.eyeGap * prop.gap / 400;

// ── What is drawn right now (eased toward the target every frame) ──

export const face = {
  eyeGap: 400,
  leftEye:  { ...DEFAULT_EYE },
  rightEye: { ...DEFAULT_EYE },
  mouth:    { ...DEFAULT_MOUTH },
  face:     { ...DEFAULT_FACE },
};

// A change of shape (pill → heart, digit → digit) happens behind closed eyes
export const shown = { left: null, right: null };

// Bounce — one spring shared by both eyes. x > 0 squashed (wide, short), x < 0 stretched.
export const bounce = { x: 0, v: 0 };
export const BOUNCE_W = 2 * Math.PI * 2.6;   // rings at 2.6 Hz
export const BOUNCE_Z = 0.3;                 // damping ratio: two visible rebounds, then still

// Gaze — where the eyes look, −1…1 on each axis. The right eye follows a touch late.
export const GAZE_X = 36, GAZE_Y = 20;       // reach, in catalog units
export const aim = { x: 0, y: 0 };
export const eyeL = { x: 0, y: 0 };
export const eyeR = { x: 0, y: 0 };

export const floaters = [];      // hearts, tears, Zs… on their way

// Mon petit France Inter — "c'est pas pour les grands !"
export const RADIO_URL = 'https://icecast.radiofrance.fr/monpetitfranceinter-midfi.aac';

export const S = {
  // Canvas
  canvas: null, ctx: null,
  W: 0, H: 0, cx: 0, cy: 0, scale: 1,
  time: 0,

  // Look
  darkTheme: true,
  palette: null,          // { fg, bg } overrides the theme
  gridCells: 0,           // pixel grid: cells along the short side of the screen, 0 = smooth
  grid: null,             // the tiny canvas the pixel grid is painted on, and its cell lines

  // Gesture overlay, applied as is (no easing)
  head: { x: 0, y: 0, tilt: 0, scale: 0, turn: 0 },

  // Blink
  blinkAmt: 0, blinkPhase: 0, blinkTimer: 3, blinksRemaining: 0, blinkPause: 0,
  breathPhase: 0,
  driftPhase: Math.random() * 100,     // micro-drift: eyes never perfectly still

  // Shape swap: 0 idle · 1 closing · 2 opening
  swapPhase: 0, swapAmt: 0,

  // Gaze
  gazeTimer: 0, gazeAway: false, gazeSide: 1,
  glance: 0,              // how fast the eyes are moving right now → a slight stretch
  lookUntil: 0,           // a tap holds the gaze on one point until this time

  // Habits — what the current behavior does on its own (see data/behaviors.js)
  habits: {},
  signsAmt: 0,
  nextEmit: Infinity,
  droop: 0,               // tired lids sinking: 0 as designed … 1 nearly shut
  spin: 0,                // symbol rotation, radians
  wobble: 0,              // whole-face shake, fades out

  // Scan mode — eyes become the scanner
  scanning: false,
  scanAmt: 0,             // 0 = normal eyes, 1 = fully scan mode
  scanY: 0,               // -1 to 1, sweep position
  scanDir: 1,

  // Radio mode
  radioMode: false, radioPlaying: false, radioHeld: false,
  radioPulse: 0,          // mouth pulse animation
  radioGroove: 0,         // head sway phase
  radioAudio: null,

  // Touch — a tap makes it look, a rub is a stroke
  stroke: null,           // { x, y, dist } while a finger is down
  petting: false,
  petHandler: null,
  tapQuietUntil: 0,
};

export const between = ([a, b]) => (a + Math.random() * (b - a)) / 1000;

export function colors() {
  return S.palette || (S.darkTheme ? DARK : LIGHT);
}

// Thin lines disappear on the pixel grid: nothing is drawn thinner than about a cell and a half
export function line(width) {
  if (!S.gridCells) return width;
  return Math.max(width, Math.min(S.W, S.H) / S.gridCells * 1.5);
}

export function easedFactor(speed, dt) {
  const t = clamp(speed * dt, 0, 1);
  return 1 - (1 - t) * (1 - t) * (1 - t); // ease-out cubic
}

export function easedLerp(current, target, speed, dt) {
  return lerp(current, target, easedFactor(speed, dt));
}

export function lerpObj(current, target, speed, dt) {
  const f = easedFactor(speed, dt);
  for (const k of Object.keys(target)) {
    if (typeof target[k] === 'number' && typeof current[k] === 'number') {
      current[k] = lerp(current[k], target[k], f);
    } else {
      current[k] = target[k]; // shapes, nulls — snap instantly
    }
  }
}
