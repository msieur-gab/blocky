// ══════════════════════════════════════════
// Face Renderer
// Draws from shape catalog + expression data
// Independent per-eye rendering
// ══════════════════════════════════════════

import { lerp, clamp } from './utils/math.js';
import { eyes as symbolShapes, mouths as mouthShapes } from './shapes.js';
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

// ── Interpolated state ──

const face = {
  eyeGap: NEUTRAL.eyeGap,
  leftEye:  { ...DEFAULT_EYE },
  rightEye: { ...DEFAULT_EYE },
  mouth:    { ...DEFAULT_MOUTH },
  face:     { ...DEFAULT_FACE },
};

// Animation
let blinkAmt = 0;
let blinkPhase = 0;
let blinkTimer = 3;
let blinksRemaining = 0;
let blinkPause = 0;
let breathPhase = 0;

// Micro-drift — eyes never perfectly still
let driftPhase = Math.random() * 100;

// Gaze — autonomous look direction, independent from expression
let gazeX = 0;         // current gaze offset (-1 to 1)
let gazeY = 0;
let gazeTargetX = 0;   // where gaze is drifting toward
let gazeTargetY = 0;
let gazeTimer = 0;     // time until next gaze shift

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

// External
let audioRms = 0;

// ── Init ──

export function init(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  resize();

  // Tap on mouth area → toggle radio when in radio mode
  canvas.addEventListener('click', onCanvasTap);
  canvas.addEventListener('touchend', onCanvasTap);
}

function onCanvasTap(e) {
  if (!radioMode) return;
  e.preventDefault();

  // Get tap position relative to canvas
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0) - rect.left;
  const y = (e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0) - rect.top;

  // Mouth zone: center-x ± 40px, center-y + mouth offset ± 40px
  const mouthY = cy + (face.mouth.y || 35) * scale;
  const dx = Math.abs(x - cx);
  const dy = Math.abs(y - mouthY);
  const hitRadius = 40 * scale;

  if (dx < hitRadius && dy < hitRadius) {
    toggleRadio();
  }
}

export function setTheme(dark) { darkTheme = dark; }
export function setAudioRms(rms) { audioRms = rms; }
export function setScanning(on) { scanning = on; }

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
  scale = Math.min(W, H) / 560;
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
  // Eased interpolation everywhere — ease-out cubic
  // Eyes/mouth: smooth (6). Face transforms: snappy (12) so nods/shakes land.
  // Support both old format (leftEye/rightEye/eyeGap) and new (left/right/gap)
  face.eyeGap = easedLerp(face.eyeGap, target.gap ?? target.eyeGap ?? NEUTRAL.eyeGap, 6, dt);
  lerpObj(face.leftEye, target.left ?? target.leftEye, 6, dt);
  lerpObj(face.rightEye, target.right ?? target.rightEye, 6, dt);
  lerpObj(face.mouth, target.mouth, 6, dt);
  lerpObj(face.face, target.face, 12, dt);

  // Blink — single (70%) or double (30%), disabled during scan
  if (scanAmt < 0.5) {
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
        }
      }
    }
  }

  breathPhase += dt * 1.2;
  driftPhase += dt;

  // Gaze wandering — pick a new target every 2-5s
  gazeTimer -= dt;
  if (gazeTimer <= 0) {
    gazeTargetX = (Math.random() - 0.5) * 1.4;
    gazeTargetY = (Math.random() - 0.5) * 0.8;
    gazeTimer = 2 + Math.random() * 3;
  }
  // Ease toward gaze target (slow, organic)
  gazeX = easedLerp(gazeX, gazeTargetX, 1.5, dt);
  gazeY = easedLerp(gazeY, gazeTargetY, 1.5, dt);

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

// ── Draw ──

export function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  const fg = darkTheme ? '#d7d0c8' : '#28261f';
  const bg = darkTheme ? '#0a0a0f' : '#f0efe8';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Face transform
  const breath = Math.sin(breathPhase) * 2 * scale;
  const skX = face.face.skewX || 0;
  const skY = face.face.skewY || 0;

  // Radio groove: head sways left-right, bobs up-down at double freq
  const grooveX = radioPlaying ? Math.sin(radioGroove) * 8 * scale : 0;
  const grooveY = radioPlaying ? Math.sin(radioGroove * 2) * 3 * scale : 0;
  const grooveTilt = radioPlaying ? Math.sin(radioGroove) * 6 : 0; // degrees

  ctx.save();
  ctx.translate(
    cx + face.face.x * scale + grooveX,
    cy + face.face.y * scale + breath + grooveY
  );
  ctx.rotate((face.face.tilt + grooveTilt) * Math.PI / 180);
  const sx = face.face.scale * (1 - face.face.squash * 0.15);
  const sy = face.face.scale * (1 + face.face.squash * 0.15);
  ctx.scale(sx, sy);

  // ── Eyes / Scan line ──
  const gap = face.eyeGap * scale / 2;

  if (scanAmt > 0.01) {
    // Scan mode: eyes merge into a sweeping horizontal line
    drawScanEyes(fg, gap, skX, skY);
  }

  if (scanAmt < 0.99) {
    // Normal eyes (with fade when transitioning to scan)
    if (scanAmt > 0.01) ctx.globalAlpha = 1 - scanAmt;
    drawNormalEyes(fg, gap, skX, skY);
    if (scanAmt > 0.01) ctx.globalAlpha = 1;
  }

  // ── Mouth ── (hidden during scan)
  if (face.mouth.show > 0.01 && scanAmt < 0.5) {
    const mouthAlpha = face.mouth.show * (1 - scanAmt * 2);
    if (mouthAlpha > 0.01) {
      const m = face.mouth;
      const my = m.y * scale;

      // Radio mode: mouth pulses gently when playing
      const pulse = radioPlaying ? 1 + Math.sin(radioPulse) * 0.15 : 1;
      const mw = m.w * scale / 2 * pulse;
      const mh = m.h * scale / 2 * pulse;

      ctx.save();
      ctx.translate(skX * -6 * scale, my + skY * -3 * scale);
      ctx.globalAlpha = mouthAlpha;
      ctx.fillStyle = fg;
      ctx.strokeStyle = fg;
      ctx.lineWidth = 2.5 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const drawFn = mouthShapes[m.shape] || mouthShapes.none;
      drawFn(ctx, mw, mh, {
        curve: (m.curve || 0) * scale,
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
}

// ── Normal eye drawing ──

function eyePosition(side, eye, skX, skY) {
  const driftSeed = side * 1.7;
  const microX = Math.sin(driftPhase * 2.3 + driftSeed) * 1.5 * scale
                + Math.sin(driftPhase * 5.1 + driftSeed * 3) * 0.6 * scale;
  const microY = Math.sin(driftPhase * 1.9 + driftSeed * 2) * 1.0 * scale
                + Math.cos(driftPhase * 4.3 + driftSeed) * 0.4 * scale;
  const perspShift = skX * side * -8 * scale;
  return {
    x: side * face.eyeGap * scale / 2 + (eye.x || 0) * scale + perspShift + microX + gazeX * 10 * scale,
    y: (eye.y || 0) * scale + skY * side * -4 * scale + microY + gazeY * 5 * scale,
  };
}

function drawNormalEyes(fg, gap, skX, skY) {
  [
    { side: -1, eye: face.leftEye },
    { side:  1, eye: face.rightEye },
  ].forEach(({ side, eye }) => {
    const perspScale = 1 + skX * side * 0.4;
    const ew = eye.w * scale / 2 * perspScale;
    let eh = eye.h * scale / 2 * perspScale;

    // Blink squashes height — but skip if eyes already nearly closed (sleeping)
    const eyeAlreadyClosed = eh < 8 * scale;
    const blinkScale = eyeAlreadyClosed ? 1 : (1 - blinkAmt * 0.92);
    eh = Math.max(1.5 * scale, eh * blinkScale);

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
    ctx.lineWidth = 3 * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if ((!eyeAlreadyClosed && blinkScale < 0.12) || eh < ew * 0.15) {
      // Eyes too thin for pill — draw a line (blink or squished expression)
      ctx.beginPath();
      ctx.moveTo(-ew * 0.75, 0);
      ctx.lineTo(ew * 0.75, 0);
      ctx.stroke();
    } else if (eye.shape && symbolShapes[eye.shape]) {
      // Symbol override (star, musicNote, digit, etc.)
      symbolShapes[eye.shape](ctx, ew, eh, Math.min(ew, eh));
    } else {
      // Pill with 4 independent corner radii + independent top/bottom shift
      const st = (eye.shiftTop || 0) * scale / 2;
      const sb = (eye.shiftBot || 0) * scale / 2;

      // Clamp radii against RENDERED half-dimensions (after blink squash)
      const ctl = Math.min((eye.tl ?? 50) * scale * perspScale, ew, eh);
      const ctr = Math.min((eye.tr ?? 50) * scale * perspScale, ew, eh);
      const cbr = Math.min((eye.br ?? 50) * scale * perspScale, ew, eh);
      const cbl = Math.min((eye.bl ?? 50) * scale * perspScale, ew, eh);

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

// ── Scan eye drawing ──
// Eyes flatten into a single horizontal line that sweeps vertically

function drawScanEyes(fg, gap, skX, skY) {
  const t = scanAmt; // 0→1 transition

  // Sweep range: ±35% of face area
  const sweepRange = 80 * scale;
  const lineY = scanY * sweepRange;

  // Line width: starts from eye width, grows to span both eyes + gap
  const eyeW = face.leftEye.w * scale / 2;
  const normalSpan = eyeW;              // one eye width
  const fullSpan = gap + eyeW * 2;      // both eyes + gap
  const span = lerp(normalSpan, fullSpan, t);

  // Line thickness: eyes squash from full height to thin line
  const thickness = lerp(3 * scale, 2.5 * scale, t);

  ctx.save();
  ctx.globalAlpha = t;
  ctx.strokeStyle = fg;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';

  // Main scan line
  ctx.beginPath();
  ctx.moveTo(-span, lineY);
  ctx.lineTo(span, lineY);
  ctx.stroke();

  // Subtle glow trail behind the line
  const glowAlpha = 0.15 * t;
  const trailH = 8 * scale;
  const grad = ctx.createLinearGradient(0, lineY - trailH, 0, lineY + trailH);
  const col = darkTheme ? '215, 208, 200' : '40, 38, 31'; // same as fg but rgb
  grad.addColorStop(0, `rgba(${col}, 0)`);
  grad.addColorStop(0.35, `rgba(${col}, ${glowAlpha})`);
  grad.addColorStop(0.5, `rgba(${col}, ${glowAlpha * 1.5})`);
  grad.addColorStop(0.65, `rgba(${col}, ${glowAlpha})`);
  grad.addColorStop(1, `rgba(${col}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(-span * 1.1, lineY - trailH, span * 2.2, trailH * 2);

  ctx.globalAlpha = 1;
  ctx.restore();
}
