// ══════════════════════════════════════════
// Face Renderer
// Draws from shape catalog + expression data
// Independent per-eye rendering
//
// Everything that moves on its own lives here, so every expression gets it for free:
//   bounce   — the eyes squash and spring back on any change
//   gaze     — where the eyes look; each behavior can give it a habit
//   lids     — top and bottom lids close over the pill (see data/eyes.js)
//   signs    — small drawings around the eyes (blush, hearts, tears…)
// ══════════════════════════════════════════

import { lerp, clamp } from './utils/math.js';
import { eyes as symbolShapes, mouths as mouthShapes, heartPath } from './shapes.js';
import { DEFAULT as DEFAULT_EYE } from './data/eyes.js';
import { DEFAULT as DEFAULT_MOUTH } from './data/mouths.js';

const DEFAULT_FACE = { x: 0, y: 0, scale: 1, tilt: 0, squash: 0, skewX: 0, skewY: 0 };
const NEUTRAL = {
  eyeGap: 400, gap: 400,
  leftEye: { ...DEFAULT_EYE }, left: { ...DEFAULT_EYE },
  rightEye: { ...DEFAULT_EYE }, right: { ...DEFAULT_EYE },
  mouth: { ...DEFAULT_MOUTH },
  face: { ...DEFAULT_FACE },
};

let canvas, ctx;
let W, H, cx, cy, scale;
let darkTheme = true;

// ── Look ──

const DARK  = { fg: '#C6F3E5', bg: '#0B1110' };
const LIGHT = { fg: '#28261f', bg: '#f0efe8' };
let palette = null;       // { fg, bg } overrides the theme
let gridCells = 0;        // pixel grid: cells along the short side of the screen, 0 = smooth
let grid = null;          // { small, smallCtx, lines } working canvases for the grid

// ── Proportions ──
// The catalog is written for an eye 100 wide, 200 high, centres 400 apart.
// These say what those three numbers are drawn as, so the whole face can be re-proportioned at once.
// Values chosen by Gab in workbench/face-tuner.html, 2026-10-07.

const PROPORTIONS = { eyeW: 140, eyeH: 250, gap: 460, zoom: 1.4, symbol: 1, stroke: 1, mouth: 1.5 };
const prop = { ...PROPORTIONS };
const wide = () => prop.eyeW / 100;
const tall = () => prop.eyeH / 200;
const gapNow = () => face.eyeGap * prop.gap / 400;

// ── Interpolated state ──

const face = {
  eyeGap: NEUTRAL.eyeGap,
  leftEye:  { ...DEFAULT_EYE },
  rightEye: { ...DEFAULT_EYE },
  mouth:    { ...DEFAULT_MOUTH },
  face:     { ...DEFAULT_FACE },
};
let head = { x: 0, y: 0, tilt: 0, scale: 0, turn: 0 };   // gesture overlay, applied as is (no easing)

// Blink
let blinkAmt = 0;
let blinkPhase = 0;
let blinkTimer = 3;
let blinksRemaining = 0;
let blinkPause = 0;
let breathPhase = 0;

// A change of shape (pill → heart, digit → digit) happens behind closed eyes
const shown = { left: null, right: null };
let swapPhase = 0;        // 0 idle · 1 closing · 2 opening
let swapAmt = 0;

// Bounce — one spring shared by both eyes. x > 0 squashed (wide, short), x < 0 stretched.
const bounce = { x: 0, v: 0 };
const BOUNCE_W = 2 * Math.PI * 2.6;   // rings at 2.6 Hz
const BOUNCE_Z = 0.3;                 // damping ratio: two visible rebounds, then still

// Micro-drift — eyes never perfectly still
let driftPhase = Math.random() * 100;
let time = 0;

// Gaze — where the eyes look, −1…1 on each axis. The right eye follows a touch late.
const GAZE_X = 36, GAZE_Y = 20;       // reach, in catalog units
const aim = { x: 0, y: 0 };
const eyeL = { x: 0, y: 0 };
const eyeR = { x: 0, y: 0 };
let gazeTimer = 0;
let gazeAway = false;
let gazeSide = 1;
let glance = 0;           // how fast the eyes are moving right now → a slight stretch
let lookUntil = 0;        // a tap holds the gaze on one point until this time

// Habits — what the current behavior does on its own (see data/behaviors.js)
let habits = {};
let signsAmt = 0;
let nextEmit = Infinity;
let droop = 0;            // tired lids sinking: 0 as designed … 1 nearly shut
let spin = 0;             // symbol rotation, radians
let wobble = 0;           // whole-face shake, fades out
const floaters = [];      // hearts, tears, Zs… on their way

// Scan mode — eyes become the scanner
let scanning = false;
let scanAmt = 0;     // 0 = normal eyes, 1 = fully scan mode
let scanY = 0;        // -1 to 1, sweep position
let scanDir = 1;

// Radio mode
let radioMode = false;
let radioPlaying = false;
let radioPulse = 0;     // mouth pulse animation
let radioGroove = 0;    // head sway phase
let radioAudio = null;
// Mon petit France Inter — "c'est pas pour les grands !"
const RADIO_URL = 'https://icecast.radiofrance.fr/monpetitfranceinter-midfi.aac';

// Touch — a tap makes it look, a rub is a stroke
let stroke = null;        // { x, y, dist } while a finger is down
let petting = false;
let petHandler = null;
let tapQuietUntil = 0;

// External
let audioRms = 0;

// ── Init ──

export function init(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();

  canvas.addEventListener('click', onCanvasTap);
  canvas.addEventListener('touchend', onCanvasTap);

  canvas.style.touchAction = 'none';     // a finger rubbing the face must not scroll the page
  canvas.addEventListener('pointerdown', onStrokeStart);
  canvas.addEventListener('pointermove', onStrokeMove);
  canvas.addEventListener('pointerup', onStrokeEnd);
  canvas.addEventListener('pointercancel', onStrokeEnd);
}

// Called with true when a stroke begins and false when the hand leaves
export function onPet(fn) { petHandler = fn; }

function pointerAt(e) {
  const rect = canvas.getBoundingClientRect();
  const k = W / rect.width;
  return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
}

function onStrokeStart(e) {
  stroke = { ...pointerAt(e), dist: 0 };
}

function onStrokeMove(e) {
  if (!stroke) return;
  const p = pointerAt(e);
  stroke.dist += Math.hypot(p.x - stroke.x, p.y - stroke.y);
  stroke.x = p.x; stroke.y = p.y;

  // Rubbed about half the screen's short side: that is a stroke, not a tap
  if (!petting && stroke.dist > Math.min(W, H) * 0.5) {
    petting = true;
    petHandler?.(true);
  }
  if (petting) {
    // the eyes lean toward the hand
    aim.x = clamp((p.x - cx) / (W / 2), -1, 1) * 0.6;
    aim.y = clamp((p.y - cy) / (H / 2), -1, 1) * 0.6;
    lookUntil = time + 0.6;
  }
}

function onStrokeEnd() {
  if (petting) {
    petting = false;
    tapQuietUntil = performance.now() + 400;   // the lift of the hand is not a tap
    petHandler?.(false);
  }
  stroke = null;
}

function onCanvasTap(e) {
  if (performance.now() < tapQuietUntil) return;
  const rect = canvas.getBoundingClientRect();
  const k = W / rect.width;     // the canvas may be shown scaled
  const x = ((e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0) - rect.left) * k;
  const y = ((e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0) - rect.top) * k;

  if (radioMode) {
    e.preventDefault();
    // Mouth zone: center-x ± 40px, center-y + mouth offset ± 40px
    const mouthY = cy + (face.mouth.y || 35) * tall() * scale;
    const hitRadius = 40 * scale;
    if (Math.abs(x - cx) < hitRadius && Math.abs(y - mouthY) < hitRadius) toggleRadio();
    return;
  }

  // Tap anywhere: blocky looks at the finger
  lookAt((x - cx) / (W / 2), (y - cy) / (H / 2), 1.6);
}

export function setTheme(dark) { darkTheme = dark; }
export function setPalette(p) { palette = p && p.fg && p.bg ? { fg: p.fg, bg: p.bg } : null; }
export function setPixelGrid(cells) { gridCells = Math.max(0, cells | 0); }
export function setProportions(p) { Object.assign(prop, p || PROPORTIONS); resize(); }
export function getProportions() { return { ...prop }; }
export function setAudioRms(rms) { audioRms = rms; }
export function setScanning(on) { scanning = on; }
export function setHead(h) { head = h; }

// A push on the spring. amount ≈ how far the eyes deform (0.1 = 10 %); negative stretches.
export function nudge(amount = 0.1) { bounce.v += amount * BOUNCE_W * 1.4; }

// Hold the gaze on a point (−1…1 from the centre of the screen) for a while
export function lookAt(x, y, seconds = 1.5) {
  aim.x = clamp(x, -1, 1) * 1.2;
  aim.y = clamp(y, -1, 1) * 1.2;
  lookUntil = time + seconds;
  nudge(-0.05);
}

const between = ([a, b]) => (a + Math.random() * (b - a)) / 1000;

export function setHabits(h) {
  habits = h || {};
  signsAmt = 0;
  gazeTimer = 0;
  gazeAway = false;
  droop = 0;
  wobble = habits.wobble ? 1 : 0;
  nextEmit = habits.emit ? time + between(habits.emit.every) : Infinity;
}

// Let one sign go: 'heart' | 'z' | 'tear' | 'sweat' | 'puff'
export function emit(kind) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const life = { heart: 2.2, z: 2.6, tear: 1.3, sweat: 1.5, puff: 1.0 }[kind];
  if (!life) return;
  floaters.push({ kind, side, life, age: 0, seed: Math.random() * 6.28, spread: 0.3 + Math.random() * 0.7 });
  if (kind === 'puff') nudge(0.08);
}

export function setRadioMode(on, autoPlay = false) {
  radioMode = on;
  if (on && autoPlay && !radioPlaying) toggleRadio();
  if (!on && radioPlaying) toggleRadio();
}

export function isRadioPlaying() { return radioPlaying; }

function toggleRadio() {
  if (!radioAudio) {
    radioAudio = new Audio(RADIO_URL);
    radioAudio.crossOrigin = 'anonymous';
  }

  if (radioPlaying) {
    radioAudio.pause();
    radioPlaying = false;
    console.log('[face] Radio paused');
  } else {
    radioAudio.play().catch(e => console.warn('[face] Radio play failed:', e));
    radioPlaying = true;
    console.log('[face] Radio playing');
  }
}

export function resize() {
  if (!canvas) return;
  const parent = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  W = parent.clientWidth;
  H = parent.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2;
  cy = H / 2;
  scale = Math.min(W, H) / 560 * prop.zoom;
  // …but never so big that the two eyes (or two symbols) run off the sides, as on a phone held upright
  const across = prop.gap + Math.max(prop.eyeW, 190 * prop.symbol);
  scale = Math.min(scale, W / (across * 1.12));
}

// ── Eased interpolation ──

function easedFactor(speed, dt) {
  const t = clamp(speed * dt, 0, 1);
  return 1 - (1 - t) * (1 - t) * (1 - t); // ease-out cubic
}

function easedLerp(current, target, speed, dt) {
  return lerp(current, target, easedFactor(speed, dt));
}

function lerpObj(current, target, speed, dt) {
  const f = easedFactor(speed, dt);
  for (const k of Object.keys(target)) {
    if (typeof target[k] === 'number' && typeof current[k] === 'number') {
      current[k] = lerp(current[k], target[k], f);
    } else {
      current[k] = target[k]; // shapes, nulls — snap instantly
    }
  }
}

// ── Update ──

export function update(dt, target) {
  time += dt;

  // Eased interpolation everywhere — ease-out cubic
  // Eyes/mouth: smooth (6). Face transforms: snappy (12) so nods/shakes land.
  // Support both old format (leftEye/rightEye/eyeGap) and new (left/right/gap)
  const tL = target.left ?? target.leftEye;
  const tR = target.right ?? target.rightEye;
  face.eyeGap = easedLerp(face.eyeGap, target.gap ?? target.eyeGap ?? NEUTRAL.eyeGap, 6, dt);
  lerpObj(face.leftEye, tL, 6, dt);
  lerpObj(face.rightEye, tR, 6, dt);
  lerpObj(face.mouth, target.mouth, 6, dt);
  lerpObj(face.face, target.face, 12, dt);

  updateSwap(dt, tL.shape ?? null, tR.shape ?? null);
  updateBounce(dt);
  updateBlink(dt);
  updateGaze(dt);
  updateHabits(dt);

  breathPhase += dt * 1.2;
  driftPhase += dt;

  // Radio groove — head sway + mouth pulse
  if (radioPlaying) {
    radioPulse += dt * 3;
    radioGroove += dt * 1.8; // ~108 BPM feel
  }

  // Scan transition
  if (scanning) {
    scanAmt = Math.min(1, scanAmt + dt * 3); // ~330ms to enter scan
    scanY += scanDir * dt * 1.4;
    if (scanY > 1)  { scanY = 1;  scanDir = -1; }
    if (scanY < -1) { scanY = -1; scanDir = 1;  }
  } else {
    scanAmt = Math.max(0, scanAmt - dt * 2.5); // ~400ms to exit scan
  }
}

// The eyes shut, the shape changes while nobody can see, they open stretched and settle
function updateSwap(dt, wantL, wantR) {
  if (swapPhase !== 1 && (wantL !== shown.left || wantR !== shown.right)) swapPhase = 1;
  if (swapPhase === 1) {
    swapAmt = Math.min(1, swapAmt + dt * 13);
    if (swapAmt >= 1) {
      shown.left = wantL;
      shown.right = wantR;
      swapPhase = 2;
      nudge(-0.12);
    }
  } else if (swapPhase === 2) {
    swapAmt = Math.max(0, swapAmt - dt * 8);
    if (swapAmt <= 0) swapPhase = 0;
  }
}

function updateBounce(dt) {
  // small fixed steps: the spring feels the same at 30 or 120 frames a second
  let left = Math.min(dt, 0.1);
  while (left > 0) {
    const h = Math.min(left, 1 / 240);
    bounce.v += (-BOUNCE_W * BOUNCE_W * bounce.x - 2 * BOUNCE_Z * BOUNCE_W * bounce.v) * h;
    bounce.x += bounce.v * h;
    left -= h;
  }
  bounce.x = clamp(bounce.x, -0.3, 0.3);
}

// Blink — single (70%) or double (30%), disabled during scan
function updateBlink(dt) {
  if (scanAmt >= 0.5 || swapPhase !== 0 || habits.blink === false) return;
  blinkTimer -= dt;

  if (blinkPhase === 0) {
    if (blinkPause > 0) {
      blinkPause -= dt;
      if (blinkPause <= 0) blinkPhase = 1;
    } else if (blinkTimer <= 0) {
      blinksRemaining = Math.random() < 0.3 ? 2 : 1;
      blinkPhase = 1;
    }
  }

  const isDouble = blinksRemaining > 0;
  const closeSpeed = isDouble ? 28 : 16;
  const openSpeed = isDouble ? 22 : 12;

  if (blinkPhase === 1) {
    blinkAmt = Math.min(1, blinkAmt + dt * closeSpeed);
    if (blinkAmt >= 1) blinkPhase = 2;
  } else if (blinkPhase === 2) {
    blinkAmt = Math.max(0, blinkAmt - dt * openSpeed);
    if (blinkAmt <= 0) {
      blinkAmt = 0;
      blinkPhase = 0;
      blinksRemaining--;
      if (blinksRemaining > 0) {
        blinkPause = 0.04 + Math.random() * 0.03;
      } else {
        blinkTimer = 2 + Math.random() * 4;
        nudge(0.03);    // the lids land
      }
    }
  }
}

// Gaze habits: wander (default) · hold · up · down · aside · dart
function updateGaze(dt) {
  let speed = 5;
  gazeTimer -= dt;

  if (time < lookUntil) {
    speed = 9;                                   // a tap: the aim was set by lookAt
  } else switch (habits.gaze) {
    case 'hold':
      aim.x = 0; aim.y = 0;
      break;
    case 'up':                                   // looking for the answer on the ceiling
      if (gazeTimer <= 0) { aim.x = 0.3 + Math.random() * 0.5; aim.y = -0.9; gazeTimer = 1.5 + Math.random() * 2; }
      speed = 3;
      break;
    case 'down':
      if (gazeTimer <= 0) { aim.x = (Math.random() - 0.5) * 0.7; aim.y = 0.85; gazeTimer = 2 + Math.random() * 3; }
      speed = 2;
      break;
    case 'aside':                                // sulking: looks away, steals a glance back
      if (gazeTimer <= 0) {
        gazeAway = !gazeAway;
        if (gazeAway) gazeSide = -gazeSide;
        gazeTimer = gazeAway ? 2.5 + Math.random() * 2.5 : 0.7;
      }
      aim.x = gazeAway ? gazeSide : 0; aim.y = gazeAway ? 0.3 : 0;
      speed = 6;
      break;
    case 'dart':                                 // caught out: left, right, sometimes straight at you
      if (gazeTimer <= 0) {
        gazeSide = -gazeSide;
        aim.x = Math.random() < 0.25 ? 0 : gazeSide; aim.y = 0.15;
        gazeTimer = 0.45 + Math.random() * 0.8;
      }
      speed = 12;
      break;
    default:                                     // wander: a look somewhere, often back to the middle
      if (gazeTimer <= 0) {
        const home = Math.random() < 0.35;
        aim.x = home ? 0 : (Math.random() * 2 - 1);
        aim.y = home ? 0 : (Math.random() * 2 - 1) * 0.7;
        gazeTimer = 1.2 + Math.random() * 2.8;
      }
  }

  const before = eyeL.x;
  eyeL.x = easedLerp(eyeL.x, aim.x, speed, dt);
  eyeL.y = easedLerp(eyeL.y, aim.y, speed, dt);
  eyeR.x = easedLerp(eyeR.x, aim.x, speed * 0.7, dt);
  eyeR.y = easedLerp(eyeR.y, aim.y, speed * 0.7, dt);

  // A quick look stretches the eyes sideways for an instant
  const moving = dt > 0 ? Math.abs(eyeL.x - before) / dt : 0;
  glance = lerp(glance, clamp(moving * 0.045, 0, 0.14), clamp(dt * 20, 0, 1));
}

function updateHabits(dt) {
  signsAmt = Math.min(1, signsAmt + dt * 3);

  if (habits.emit && time >= nextEmit) {
    emit(habits.emit.sign);
    nextEmit = time + between(habits.emit.every);
  }
  for (const f of floaters) f.age += dt / f.life;
  for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].age >= 1) floaters.splice(i, 1);

  // Tired: the lids sink slowly, then it catches itself and they fly open
  if (habits.droop) {
    droop += dt * 0.26;
    if (droop > 1) { droop = 0; nudge(-0.14); }
  } else {
    droop = Math.max(0, droop - dt * 2);
  }

  spin += (habits.spin || 0) * 2 * Math.PI * dt;
  wobble *= Math.exp(-dt * 1.1);
}

// ── Draw ──

function colors() {
  return palette || (darkTheme ? DARK : LIGHT);
}

// Thin lines disappear on the pixel grid: nothing is drawn thinner than about a cell and a half
function line(width) {
  if (!gridCells) return width;
  return Math.max(width, Math.min(W, H) / gridCells * 1.5);
}

export function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  const { fg, bg } = colors();

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Face transform
  const breath = Math.sin(breathPhase) * 2 * scale;
  const skX = (face.face.skewX || 0) + head.turn;
  const skY = face.face.skewY || 0;

  // Radio groove: head sways left-right, bobs up-down at double freq
  const grooveX = radioPlaying ? Math.sin(radioGroove) * 8 * scale : 0;
  const grooveY = radioPlaying ? Math.sin(radioGroove * 2) * 3 * scale : 0;
  const grooveTilt = radioPlaying ? Math.sin(radioGroove) * 6 : 0; // degrees

  // Shaken: the whole face rattles, then calms down
  const rattleX = Math.sin(time * 17) * 26 * wobble * scale;
  const rattleY = Math.cos(time * 13) * 10 * wobble * scale;

  ctx.save();
  ctx.translate(
    cx + (face.face.x + head.x) * scale + grooveX + rattleX,
    cy + (face.face.y + head.y) * scale + breath + grooveY + rattleY
  );
  ctx.rotate((face.face.tilt + head.tilt + grooveTilt) * Math.PI / 180);
  const size = face.face.scale * (1 + head.scale);
  ctx.scale(size * (1 - face.face.squash * 0.15), size * (1 + face.face.squash * 0.15));

  // ── Eyes / Scan ──
  if (scanAmt > 0.01) drawScanner(fg);

  if (scanAmt < 0.99) {
    // Normal eyes (with fade when transitioning to scan)
    if (scanAmt > 0.01) ctx.globalAlpha = 1 - scanAmt;
    drawNormalEyes(fg, bg, skX, skY);
    if (scanAmt > 0.01) ctx.globalAlpha = 1;
  }

  if (scanAmt < 0.5) drawSigns(fg);

  // ── Mouth ── (hidden during scan)
  // prop.mouth 0 = a face without a mouth (the radio button still needs one)
  const mouthSize = prop.mouth > 0.01 ? prop.mouth : (radioMode ? 1.5 : 0);
  if (mouthSize && face.mouth.show > 0.01 && scanAmt < 0.5) {
    const mouthAlpha = face.mouth.show * (1 - scanAmt * 2);
    if (mouthAlpha > 0.01) {
      const m = face.mouth;
      const big = mouthSize;

      // The mouth belongs to the face: it sits under the eyes whatever their height,
      // and goes most of the way with them when they look somewhere
      const my = m.y * tall() * scale + (eyeL.y + eyeR.y) / 2 * GAZE_Y * tall() * 0.7 * scale;
      const mx = (eyeL.x + eyeR.x) / 2 * GAZE_X * wide() * 0.7 * scale;

      // Radio mode: mouth pulses gently when playing
      const pulse = radioPlaying ? 1 + Math.sin(radioPulse) * 0.15 : 1;
      const mw = m.w * big * scale / 2 * pulse * (1 + bounce.x * 0.4);
      const mh = m.h * big * scale / 2 * pulse;

      ctx.save();
      ctx.translate(mx + skX * -6 * scale, my + skY * -3 * scale);
      ctx.globalAlpha = mouthAlpha;
      ctx.fillStyle = fg;
      ctx.strokeStyle = fg;
      ctx.lineWidth = line(2.5 * big * scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const drawFn = mouthShapes[m.shape] || mouthShapes.none;
      drawFn(ctx, mw, mh, {
        curve: (m.curve || 0) * big * scale,
        open: m.open || 0,
        round: (m.round || 2) * scale / 2,
      });

      // Radio mode: draw pause bars or play triangle inside the circle mouth
      if (radioMode && m.shape === 'circle') {
        const r = Math.min(mw, mh) * 0.5;
        ctx.fillStyle = bg; // inverted color inside the button
        if (radioPlaying) {
          // Pause icon: two vertical bars
          const barW = r * 0.22;
          const barH = r * 0.7;
          ctx.fillRect(-r * 0.28 - barW / 2, -barH / 2, barW, barH);
          ctx.fillRect(r * 0.28 - barW / 2, -barH / 2, barW, barH);
        } else {
          // Play icon: triangle pointing right
          const s = r * 0.45;
          ctx.beginPath();
          ctx.moveTo(-s * 0.4, -s);
          ctx.lineTo(-s * 0.4, s);
          ctx.lineTo(s * 0.8, 0);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  ctx.restore();

  if (gridCells) drawPixelGrid(fg, bg);
}

// ── Normal eye drawing ──

function eyePosition(side, eye, skX, skY) {
  const driftSeed = side * 1.7;
  const microX = Math.sin(driftPhase * 2.3 + driftSeed) * 1.5 * scale
                + Math.sin(driftPhase * 5.1 + driftSeed * 3) * 0.6 * scale;
  const microY = Math.sin(driftPhase * 1.9 + driftSeed * 2) * 1.0 * scale
                + Math.cos(driftPhase * 4.3 + driftSeed) * 0.4 * scale;
  const perspShift = skX * side * -8 * scale;
  const g = side < 0 ? eyeL : eyeR;
  return {
    x: side * gapNow() * scale / 2 + (eye.x || 0) * scale + perspShift + microX + g.x * GAZE_X * wide() * scale,
    y: (eye.y || 0) * scale + skY * side * -4 * scale + microY + g.y * GAZE_Y * tall() * scale,
  };
}

function drawNormalEyes(fg, bg, skX, skY) {
  [
    { side: -1, eye: face.leftEye,  shape: shown.left },
    { side:  1, eye: face.rightEye, shape: shown.right },
  ].forEach(({ side, eye, shape }) => {
    const symbol = shape && symbolShapes[shape] ? shape : null;
    const perspScale = 1 + skX * side * 0.4;

    // Symbols keep their own proportions; pills follow the tuned eye
    const kw = symbol ? prop.symbol : wide();
    const kh = symbol ? prop.symbol : tall();
    const ew = eye.w * kw * scale / 2 * perspScale * (1 + bounce.x * 0.6) * (1 + glance);
    const ehOpen = eye.h * kh * scale / 2 * perspScale * (1 - bounce.x) * (1 - glance * 0.6);

    // Blink (or a change of shape) squashes height — but skip if eyes already nearly closed (sleeping)
    const eyeAlreadyClosed = ehOpen < 8 * scale;
    const shut = Math.max(blinkAmt * 0.92, swapAmt * 0.95);
    const blinkScale = eyeAlreadyClosed ? 1 : (1 - shut);
    const eh = Math.max(1.5 * scale, ehOpen * blinkScale);

    const pos = eyePosition(side, eye, skX, skY);
    const tilt = (eye.tilt || 0) * Math.PI / 180;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(tilt);

    // Per-eye skew
    if (eye.skewX || eye.skewY) {
      ctx.transform(1, eye.skewY || 0, eye.skewX || 0, 1, 0, 0);
    }

    ctx.fillStyle = fg;
    ctx.strokeStyle = fg;
    ctx.lineWidth = line(3 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if ((!eyeAlreadyClosed && blinkScale < 0.12) || eh < ew * 0.15) {
      // Eyes too thin for pill — draw a line (blink or squished expression)
      ctx.beginPath();
      ctx.moveTo(-ew * 0.75, 0);
      ctx.lineTo(ew * 0.75, 0);
      ctx.stroke();
    } else if (symbol) {
      // Symbol override (star, heart, digit, game piece…): solid, with strokes thick enough to read from afar
      if (habits.spin) ctx.rotate(spin * -side);
      ctx.lineWidth = line(Math.min(ew, ehOpen) * 0.22 * prop.stroke);
      symbolShapes[symbol](ctx, ew, eh, Math.min(ew, eh), { bg, open: ehOpen });
    } else {
      // Pill with 4 independent corner radii + independent top/bottom shift
      const st = (eye.shiftTop || 0) * kw * scale / 2;
      const sb = (eye.shiftBot || 0) * kw * scale / 2;

      // Clamp radii against RENDERED half-dimensions (after blink squash)
      const ctl = Math.min((eye.tl ?? 50) * scale * perspScale * kw, ew, eh);
      const ctr = Math.min((eye.tr ?? 50) * scale * perspScale * kw, ew, eh);
      const cbr = Math.min((eye.br ?? 50) * scale * perspScale * kw, ew, eh);
      const cbl = Math.min((eye.bl ?? 50) * scale * perspScale * kw, ew, eh);

      closeLids(eye, side, ew, eh, Math.max(Math.abs(st), Math.abs(sb)));

      ctx.beginPath();
      ctx.moveTo(st, -eh);
      ctx.arcTo( ew + st, -eh,  ew + sb,  eh, ctr);
      ctx.arcTo( ew + sb,  eh, -ew + sb,  eh, cbr);
      ctx.arcTo(-ew + sb,  eh, -ew + st, -eh, cbl);
      ctx.arcTo(-ew + st, -eh,  ew + st, -eh, ctl);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  });
}

// ── Lids ──
// Only the part of the pill between the two lids is drawn.
//   lidTop 0…1  how far the upper lid has come down (sleepy, bored, sulking)
//   lidBot 0…1  how far the lower lid has come up; it rises as an arch, so the eye turns into a smile
//   slant  deg  the upper lid leans: + down toward the nose (cross), − down toward the ear (sad)
// The upper edge sags a little in the middle, so no lid ever looks like a blade.

function closeLids(eye, side, ew, eh, shift) {
  const rest = eye.lidTop || 0;
  const top = clamp(rest + Math.max(0, 0.84 - rest) * droop, 0, 0.96);
  const bot = clamp(eye.lidBot || 0, 0, 0.96);
  const slant = eye.slant || 0;
  if (top < 0.005 && bot < 0.005 && Math.abs(slant) < 0.5) return;

  const X = ew * 1.5 + shift;                              // well past the eye on both sides
  // With no upper lid at all, its edge stays clear above the eye instead of grazing the top
  const lidInUse = clamp(top * 8 + Math.abs(slant) / 6, 0, 1);
  const yTop = -eh + 2 * eh * top - (1 - lidInUse) * eh * 0.5;
  const lean = Math.tan(slant * Math.PI / 180) * X * -side;  // the nose is at +x for the left eye
  const sag = eh * 0.1 * lidInUse;

  const yMid = eh - 2 * eh * bot;                          // top of the arch
  const yEnd = eh - 2 * eh * bot * 0.25;                   // where it meets the sides

  ctx.beginPath();
  ctx.moveTo(-X, yTop - lean);
  ctx.quadraticCurveTo(0, yTop + sag * 2, X, yTop + lean);
  ctx.lineTo(X, yEnd);
  ctx.quadraticCurveTo(0, 2 * yMid - yEnd, -X, yEnd);
  ctx.closePath();
  ctx.clip();
}

// ── Scanner ──
// When blocky looks at something through the camera, the eyes give way to a viewfinder:
// four corners, a bar sweeping up and down with a trail behind it, a blinking light.

function drawScanner(fg) {
  const t = scanAmt;
  const halfW = lerp(face.leftEye.w * wide() / 2, gapNow() / 2 + face.leftEye.w * wide() * 0.9, t) * scale;
  const halfH = lerp(10, face.leftEye.h * tall() * 0.62, t) * scale;
  const arm = Math.min(halfW, halfH) * 0.32;
  const y = scanY * (halfH - arm * 0.5);

  ctx.save();
  ctx.globalAlpha = t;
  ctx.strokeStyle = fg;
  ctx.fillStyle = fg;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Corners
  ctx.lineWidth = line(12 * scale);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * (halfW - arm), sy * halfH);
    ctx.lineTo(sx * halfW, sy * halfH);
    ctx.lineTo(sx * halfW, sy * (halfH - arm));
    ctx.stroke();
  }

  // Trail: rows of dashes thinning out on the side the bar just left.
  // Dashes, not transparency, so the trail is still there on the pixel grid.
  const inner = halfW - arm * 0.7;
  ctx.lineWidth = line(7 * scale);
  ctx.lineCap = 'butt';
  [[16, 14], [10, 22], [5, 30]].forEach(([dash, space], i) => {
    const ty = y - scanDir * (i + 1) * 20 * scale;
    if (Math.abs(ty) > halfH - arm * 0.3) return;
    ctx.setLineDash([dash * scale, space * scale]);
    ctx.lineDashOffset = i * 9 * scale;
    ctx.beginPath(); ctx.moveTo(-inner, ty); ctx.lineTo(inner, ty); ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.lineCap = 'round';

  // The bar
  ctx.lineWidth = line(13 * scale);
  ctx.beginPath(); ctx.moveTo(-inner, y); ctx.lineTo(inner, y); ctx.stroke();

  // "I'm looking" light, top right, blinking
  if (Math.floor(time * 2.5) % 2 === 0) {
    ctx.beginPath();
    ctx.arc(halfW - arm * 1.1, -halfH + arm * 1.1, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Signs ──
// Small drawings around the eyes, positioned from the eyes themselves so they follow any proportion.
//   habits.signs — stay as long as the behavior: 'blush' | 'question' | 'dots' | 'sparks'
//   floaters     — let go one at a time (habits.emit, or a frame's `emit`): heart, z, tear, sweat, puff

function drop(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.2);
  ctx.quadraticCurveTo(x + r * 1.5, y + r * 0.2, x, y + r);
  ctx.quadraticCurveTo(x - r * 1.5, y + r * 0.2, x, y - r * 2.2);
  ctx.fill();
}

function drawSigns(fg) {
  const u = scale;
  const eyeX = gapNow() / 2;
  const eyeW = face.leftEye.w * wide(), eyeH = face.leftEye.h * tall();
  const outer = eyeX + eyeW / 2;                       // outside edge of an eye
  const inOut = (a) => clamp(Math.min(a * 6, (1 - a) * 3), 0, 1);

  ctx.save();
  ctx.fillStyle = fg;
  ctx.strokeStyle = fg;
  ctx.lineCap = 'round';
  ctx.lineWidth = line(5 * u);

  const signs = habits.signs || [];
  ctx.globalAlpha = signsAmt;

  if (signs.includes('blush')) {
    // three slanted strokes on each cheek, just outside and below the eyes
    ctx.save();
    ctx.lineWidth = line(7 * u);
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        const x = side * (outer + 34) + i * 20, y = eyeH * 0.42;
        ctx.beginPath();
        ctx.moveTo((x - 7) * u, (y + 15) * u);
        ctx.lineTo((x + 7) * u, (y - 15) * u);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  if (signs.includes('question')) {
    const size = eyeH * 0.5;
    ctx.font = `800 ${size * u}px ui-rounded, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate((outer + 70) * u, (-eyeH * 0.42 + Math.sin(time * 3) * 8) * u);
    ctx.rotate(0.2 + Math.sin(time * 1.5) * 0.08);
    ctx.fillText('?', 0, 0);
    ctx.restore();
  }
  if (signs.includes('dots')) {
    // one, two, three… and again
    const n = Math.floor(time * 2.4) % 4;
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc((outer + 24 + i * 34) * u, (-eyeH * 0.5 - 30 - i * 14) * u, (9 + i * 2) * u, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (signs.includes('sparks')) {
    // little crosses circling over the head; they go round the back
    for (let i = 0; i < 3; i++) {
      const a = time * 3.2 + i * Math.PI * 2 / 3;
      if (Math.sin(a) < -0.55) continue;
      const x = Math.cos(a) * (outer + 30), y = -eyeH * 0.5 - 55 + Math.sin(a) * 22;
      const r = 13 + Math.sin(a) * 4;
      ctx.beginPath();
      ctx.moveTo((x - r) * u, y * u); ctx.lineTo((x + r) * u, y * u);
      ctx.moveTo(x * u, (y - r) * u); ctx.lineTo(x * u, (y + r) * u);
      ctx.stroke();
    }
  }

  for (const f of floaters) {
    const a = f.age;
    ctx.globalAlpha = inOut(a);
    if (f.kind === 'heart') {
      // the same heart as the heart eyes, smaller, drifting up
      const x = f.side * (eyeX * f.spread + eyeW * 0.3) + Math.sin(a * 7 + f.seed) * 14;
      const y = -eyeH * 0.5 - 30 - a * 150;
      ctx.save();
      ctx.translate(x * u, y * u);
      heartPath(ctx, (20 + a * 12) * u);
      ctx.fill();
      ctx.restore();
    } else if (f.kind === 'z') {
      ctx.font = `800 ${(34 + a * 40) * u}px ui-rounded, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Z', (outer + 30 + a * 80) * u, (-eyeH * 0.35 - a * 160) * u);
    } else if (f.kind === 'tear') {
      drop(f.side * (eyeX + eyeW * 0.15) * u, (eyeH * 0.5 + 22 + a * a * 170) * u, 11 * u);
    } else if (f.kind === 'sweat') {
      drop(f.side * (outer + 34) * u, (-eyeH * 0.32 + a * 60) * u, 12 * u);
    } else if (f.kind === 'puff') {
      // a huff of air, growing as it leaves
      const x = f.side * (outer + 40 + a * 80), y = eyeH * 0.2 - a * 24;
      const r = 13 + a * 12;
      for (const [dx, dy, k] of [[0, 0, 1], [20, -12, 0.75], [34, 6, 0.55]]) {
        ctx.beginPath();
        ctx.arc((x + f.side * dx) * u, (y + dy) * u, r * k * u, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

// ── Pixel grid ──
// The finished picture is shrunk to a coarse grid, every cell becomes fully on or fully off,
// and it is shown again with hard-edged cells and a thin dark line between them.

function drawPixelGrid(fg, bg) {
  const cell = Math.min(canvas.width, canvas.height) / gridCells;      // in device pixels
  const cols = Math.max(1, Math.round(canvas.width / cell));
  const rows = Math.max(1, Math.round(canvas.height / cell));

  if (!grid) {
    const small = document.createElement('canvas');
    grid = { small, smallCtx: small.getContext('2d', { willReadFrequently: true }), lines: null, key: '' };
  }
  if (grid.small.width !== cols || grid.small.height !== rows) { grid.small.width = cols; grid.small.height = rows; }

  grid.smallCtx.drawImage(canvas, 0, 0, cols, rows);
  const image = grid.smallCtx.getImageData(0, 0, cols, rows);
  const px = new Uint32Array(image.data.buffer);
  const on = rgba(fg), off = rgba(bg);
  const mid = (brightness(on) + brightness(off)) / 2;
  const lit = brightness(on) > brightness(off);
  for (let i = 0; i < px.length; i++) px[i] = (brightness(px[i]) > mid) === lit ? on : off;
  grid.smallCtx.putImageData(image, 0, 0);

  // The lines between cells never change for a given size: draw them once
  const key = `${canvas.width}x${canvas.height}/${cols}/${bg}`;
  if (grid.key !== key) {
    grid.key = key;
    grid.lines = document.createElement('canvas');
    grid.lines.width = canvas.width; grid.lines.height = canvas.height;
    if (cell >= 4) {
      const g = grid.lines.getContext('2d');
      g.fillStyle = bg;
      g.globalAlpha = 0.5;
      for (let c = 1; c < cols; c++) g.fillRect(Math.round(c * canvas.width / cols), 0, 1, canvas.height);
      for (let r = 1; r < rows; r++) g.fillRect(0, Math.round(r * canvas.height / rows), canvas.width, 1);
    }
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(grid.small, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(grid.lines, 0, 0);
  ctx.restore();
}

// '#rrggbb' → the 32-bit value a canvas stores for that colour (little-endian ABGR)
function rgba(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h, 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | (n >>> 16 & 0xff)) >>> 0;
}

function brightness(abgr) {
  return (abgr & 0xff) * 0.3 + (abgr >>> 8 & 0xff) * 0.6 + (abgr >>> 16 & 0xff) * 0.1;
}
