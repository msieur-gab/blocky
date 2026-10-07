// ══════════════════════════════════════════
// Face Renderer
// Draws from shape catalog + expression data
// Independent per-eye rendering
//
// This file is the way in: start-up, settings, and the frame (update, then draw).
// The parts live in face/ — state, motion, touch, radio, draw-eyes, draw-signs, draw-scanner, pixel-grid.
// Everything that moves on its own is in the engine, so every expression gets it for free:
//   bounce   — the eyes squash and spring back on any change
//   gaze     — where the eyes look; each behavior can give it a habit
//   lids     — top and bottom lids close over the pill (see data/eyes.js)
//   signs    — small drawings around the eyes (blush, hearts, tears…)
// ══════════════════════════════════════════

import { mouths as mouthShapes } from './shapes.js';
import { colors, line, easedLerp, lerpObj, PROPORTIONS, prop, wide, tall, face, bounce, GAZE_X, GAZE_Y, eyeL, eyeR, S } from './face/state.js';
import { updateSwap, updateBounce, updateBlink, updateGaze, updateHabits } from './face/motion.js';
import { onStrokeStart, onStrokeMove, onStrokeEnd, onCanvasTap } from './face/touch.js';
import { drawNormalEyes } from './face/draw-eyes.js';
import { drawScanner } from './face/draw-scanner.js';
import { drawSigns } from './face/draw-signs.js';
import { pixelCanvas, showPixels } from './face/pixel-grid.js';

export { nudge, lookAt, setHabits, emit } from './face/motion.js';
export { setRadioMode, isRadioPlaying } from './face/radio.js';
export { onPet } from './face/touch.js';

// ── Init ──

export function init(canvasEl) {
  S.canvas = canvasEl;
  S.ctx = S.canvas.getContext('2d');
  resize();

  S.canvas.addEventListener('click', onCanvasTap);
  S.canvas.addEventListener('touchend', onCanvasTap);

  S.canvas.style.touchAction = 'none';     // a finger rubbing the face must not scroll the page
  S.canvas.addEventListener('pointerdown', onStrokeStart);
  S.canvas.addEventListener('pointermove', onStrokeMove);
  S.canvas.addEventListener('pointerup', onStrokeEnd);
  S.canvas.addEventListener('pointercancel', onStrokeEnd);
}

// ── Settings ──

export function setTheme(dark) { S.darkTheme = dark; }
export function setPalette(p) { S.palette = p && p.fg && p.bg ? { fg: p.fg, bg: p.bg } : null; }
export function setPixelGrid(cells) { S.gridCells = Math.max(0, cells | 0); }
export function setProportions(p) { Object.assign(prop, p || PROPORTIONS); resize(); }
export function getProportions() { return { ...prop }; }
export function setScanning(on) { S.scanning = on; }
export function setHead(h) { S.head = h; }

export function resize() {
  if (!S.canvas) return;
  const parent = S.canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  S.W = parent.clientWidth;
  S.H = parent.clientHeight;
  S.canvas.width = S.W * dpr;
  S.canvas.height = S.H * dpr;
  S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.cx = S.W / 2;
  S.cy = S.H / 2;
  S.scale = Math.min(S.W, S.H) / 560 * prop.zoom;
  // …but never so big that the two eyes (or two symbols) run off the sides, as on a phone held upright
  const across = prop.gap + Math.max(prop.eyeW, 190 * prop.symbol);
  S.scale = Math.min(S.scale, S.W / (across * 1.12));
}

// ── Update ──

export function update(dt, target) {
  S.time += dt;

  // Eased interpolation everywhere — ease-out cubic
  // Eyes/mouth: smooth (6). Face transforms: snappy (12) so nods/shakes land.
  const tL = target.left;
  const tR = target.right;
  face.eyeGap = easedLerp(face.eyeGap, target.gap, 6, dt);
  lerpObj(face.leftEye, tL, 6, dt);
  lerpObj(face.rightEye, tR, 6, dt);
  lerpObj(face.mouth, target.mouth, 6, dt);
  lerpObj(face.face, target.face, 12, dt);

  updateSwap(dt, tL.shape ?? null, tR.shape ?? null);
  updateBounce(dt);
  updateBlink(dt);
  updateGaze(dt);
  updateHabits(dt);

  S.breathPhase += dt * 1.2;
  S.driftPhase += dt;

  // Radio groove — head sway + mouth pulse
  if (S.radioPlaying) {
    S.radioPulse += dt * 3;
    S.radioGroove += dt * 1.8; // ~108 BPM feel
  }

  // Scan transition
  if (S.scanning) {
    S.scanAmt = Math.min(1, S.scanAmt + dt * 3); // ~330ms to enter scan
    S.scanY += S.scanDir * dt * 1.4;
    if (S.scanY > 1)  { S.scanY = 1;  S.scanDir = -1; }
    if (S.scanY < -1) { S.scanY = -1; S.scanDir = 1;  }
  } else {
    S.scanAmt = Math.max(0, S.scanAmt - dt * 2.5); // ~400ms to exit scan
  }
}

// ── Draw ──

export function draw() {
  if (!S.ctx) return;
  const { fg, bg } = colors();

  if (!S.gridCells) { paint(fg, bg); return; }

  // Pixel grid: the face is painted straight onto a tiny canvas, one canvas pixel per cell,
  // so there is never a big picture to read back. Then each cell is made fully on or off.
  const main = S.ctx;
  const small = pixelCanvas();
  S.ctx = small.ctx;
  S.ctx.setTransform(small.cols / S.W, 0, 0, small.rows / S.H, 0, 0);
  paint(fg, bg);
  S.ctx = main;
  showPixels(small, fg, bg);
}

function paint(fg, bg) {
  S.ctx.clearRect(0, 0, S.W, S.H);

  S.ctx.fillStyle = bg;
  S.ctx.fillRect(0, 0, S.W, S.H);

  // Face transform
  const breath = Math.sin(S.breathPhase) * 2 * S.scale;
  const skX = (face.face.skewX || 0) + S.head.turn;
  const skY = face.face.skewY || 0;

  // Radio groove: head sways left-right, bobs up-down at double freq
  const grooveX = S.radioPlaying ? Math.sin(S.radioGroove) * 8 * S.scale : 0;
  const grooveY = S.radioPlaying ? Math.sin(S.radioGroove * 2) * 3 * S.scale : 0;
  const grooveTilt = S.radioPlaying ? Math.sin(S.radioGroove) * 6 : 0; // degrees

  // Shaken: the whole face rattles, then calms down
  const rattleX = Math.sin(S.time * 17) * 26 * S.wobble * S.scale;
  const rattleY = Math.cos(S.time * 13) * 10 * S.wobble * S.scale;

  S.ctx.save();
  S.ctx.translate(
    S.cx + (face.face.x + S.head.x) * S.scale + grooveX + rattleX,
    S.cy + (face.face.y + S.head.y) * S.scale + breath + grooveY + rattleY
  );
  S.ctx.rotate((face.face.tilt + S.head.tilt + grooveTilt) * Math.PI / 180);
  const size = face.face.scale * (1 + S.head.scale);
  S.ctx.scale(size * (1 - face.face.squash * 0.15), size * (1 + face.face.squash * 0.15));

  // ── Eyes / Scan ──
  if (S.scanAmt > 0.01) drawScanner(fg);

  if (S.scanAmt < 0.99) {
    // Normal eyes (with fade when transitioning to scan)
    if (S.scanAmt > 0.01) S.ctx.globalAlpha = 1 - S.scanAmt;
    drawNormalEyes(fg, bg, skX, skY);
    if (S.scanAmt > 0.01) S.ctx.globalAlpha = 1;
  }

  if (S.scanAmt < 0.5) drawSigns(fg);

  // ── Mouth ── (hidden during scan)
  // prop.mouth 0 = a face without a mouth (the radio button still needs one)
  const mouthSize = prop.mouth > 0.01 ? prop.mouth : (S.radioMode ? 1.5 : 0);
  if (mouthSize && face.mouth.show > 0.01 && S.scanAmt < 0.5) {
    const mouthAlpha = face.mouth.show * (1 - S.scanAmt * 2);
    if (mouthAlpha > 0.01) {
      const m = face.mouth;
      const big = mouthSize;

      // The mouth belongs to the face: it sits under the eyes whatever their height,
      // and goes most of the way with them when they look somewhere
      const my = m.y * tall() * S.scale + (eyeL.y + eyeR.y) / 2 * GAZE_Y * tall() * 0.7 * S.scale;
      const mx = (eyeL.x + eyeR.x) / 2 * GAZE_X * wide() * 0.7 * S.scale;

      // Radio mode: mouth pulses gently when playing
      const pulse = S.radioPlaying ? 1 + Math.sin(S.radioPulse) * 0.15 : 1;
      const mw = m.w * big * S.scale / 2 * pulse * (1 + bounce.x * 0.4);
      const mh = m.h * big * S.scale / 2 * pulse;

      S.ctx.save();
      S.ctx.translate(mx + skX * -6 * S.scale, my + skY * -3 * S.scale);
      S.ctx.globalAlpha = mouthAlpha;
      S.ctx.fillStyle = fg;
      S.ctx.strokeStyle = fg;
      S.ctx.lineWidth = line(2.5 * big * S.scale);
      S.ctx.lineCap = 'round';
      S.ctx.lineJoin = 'round';

      const drawFn = mouthShapes[m.shape] || mouthShapes.none;
      drawFn(S.ctx, mw, mh, {
        curve: (m.curve || 0) * big * S.scale,
        open: m.open || 0,
        round: (m.round || 2) * S.scale / 2,
      });

      // Radio mode: draw pause bars or play triangle inside the circle mouth
      if (S.radioMode && m.shape === 'circle') {
        const r = Math.min(mw, mh) * 0.5;
        S.ctx.fillStyle = bg; // inverted color inside the button
        if (S.radioPlaying) {
          // Pause icon: two vertical bars
          const barW = r * 0.22;
          const barH = r * 0.7;
          S.ctx.fillRect(-r * 0.28 - barW / 2, -barH / 2, barW, barH);
          S.ctx.fillRect(r * 0.28 - barW / 2, -barH / 2, barW, barH);
        } else {
          // Play icon: triangle pointing right
          const s = r * 0.45;
          S.ctx.beginPath();
          S.ctx.moveTo(-s * 0.4, -s);
          S.ctx.lineTo(-s * 0.4, s);
          S.ctx.lineTo(s * 0.8, 0);
          S.ctx.closePath();
          S.ctx.fill();
        }
      }

      S.ctx.globalAlpha = 1;
      S.ctx.restore();
    }
  }

  S.ctx.restore();
}
