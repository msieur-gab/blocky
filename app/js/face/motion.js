// ══════════════════════════════════════════
// Face — motion
// What moves on its own: the bounce, the blink, the change of shape behind closed eyes,
// the gaze and its habits, and the habits a behavior brings (droop, spin, signs let go).
// ══════════════════════════════════════════

import { lerp, clamp } from '../utils/math.js';
import { easedLerp, shown, bounce, BOUNCE_W, BOUNCE_Z, aim, eyeL, eyeR, floaters, S, between } from './state.js';

// A push on the spring. amount ≈ how far the eyes deform (0.1 = 10 %); negative stretches.
export function nudge(amount = 0.1) { bounce.v += amount * BOUNCE_W * 1.4; }

// Hold the gaze on a point (−1…1 from the centre of the screen) for a while
export function lookAt(x, y, seconds = 1.5) {
  aim.x = clamp(x, -1, 1) * 1.2;
  aim.y = clamp(y, -1, 1) * 1.2;
  S.lookUntil = S.time + seconds;
  nudge(-0.05);
}

export function setHabits(h) {
  S.habits = h || {};
  S.signsAmt = 0;
  S.gazeTimer = 0;
  S.gazeAway = false;
  S.droop = 0;
  S.wobble = S.habits.wobble ? 1 : 0;
  S.nextEmit = S.habits.emit ? S.time + between(S.habits.emit.every) : Infinity;
}

// Let one sign go: 'heart' | 'z' | 'tear' | 'sweat' | 'puff'
export function emit(kind) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const life = { heart: 2.2, z: 2.6, tear: 1.3, sweat: 1.5, puff: 1.0 }[kind];
  if (!life) return;
  floaters.push({ kind, side, life, age: 0, seed: Math.random() * 6.28, spread: 0.3 + Math.random() * 0.7 });
  if (kind === 'puff') nudge(0.08);
}

// The eyes shut, the shape changes while nobody can see, they open stretched and settle
export function updateSwap(dt, wantL, wantR) {
  if (S.swapPhase !== 1 && (wantL !== shown.left || wantR !== shown.right)) S.swapPhase = 1;
  if (S.swapPhase === 1) {
    S.swapAmt = Math.min(1, S.swapAmt + dt * 13);
    if (S.swapAmt >= 1) {
      shown.left = wantL;
      shown.right = wantR;
      S.swapPhase = 2;
      nudge(-0.12);
    }
  } else if (S.swapPhase === 2) {
    S.swapAmt = Math.max(0, S.swapAmt - dt * 8);
    if (S.swapAmt <= 0) S.swapPhase = 0;
  }
}

export function updateBounce(dt) {
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
export function updateBlink(dt) {
  if (S.scanAmt >= 0.5 || S.swapPhase !== 0 || S.habits.blink === false) {
    // no blinking now — but a blink caught halfway must still open, not freeze half shut
    S.blinkAmt = Math.max(0, S.blinkAmt - dt * 12);
    S.blinkPhase = 0;
    S.blinksRemaining = 0;
    return;
  }
  S.blinkTimer -= dt;

  if (S.blinkPhase === 0) {
    if (S.blinkPause > 0) {
      S.blinkPause -= dt;
      if (S.blinkPause <= 0) S.blinkPhase = 1;
    } else if (S.blinkTimer <= 0) {
      S.blinksRemaining = Math.random() < 0.3 ? 2 : 1;
      S.blinkPhase = 1;
    }
  }

  const isDouble = S.blinksRemaining > 0;
  const closeSpeed = isDouble ? 28 : 16;
  const openSpeed = isDouble ? 22 : 12;

  if (S.blinkPhase === 1) {
    S.blinkAmt = Math.min(1, S.blinkAmt + dt * closeSpeed);
    if (S.blinkAmt >= 1) S.blinkPhase = 2;
  } else if (S.blinkPhase === 2) {
    S.blinkAmt = Math.max(0, S.blinkAmt - dt * openSpeed);
    if (S.blinkAmt <= 0) {
      S.blinkAmt = 0;
      S.blinkPhase = 0;
      S.blinksRemaining--;
      if (S.blinksRemaining > 0) {
        S.blinkPause = 0.04 + Math.random() * 0.03;
      } else {
        S.blinkTimer = 2 + Math.random() * 4;
        nudge(0.03);    // the lids land
      }
    }
  }
}

// Gaze habits: wander (default) · hold · up · down · aside · dart
export function updateGaze(dt) {
  let speed = 5;
  S.gazeTimer -= dt;

  if (S.time < S.lookUntil) {
    speed = 9;                                   // a tap: the aim was set by lookAt
  } else switch (S.habits.gaze) {
    case 'hold':
      aim.x = 0; aim.y = 0;
      break;
    case 'up':                                   // looking for the answer on the ceiling
      if (S.gazeTimer <= 0) { aim.x = 0.3 + Math.random() * 0.5; aim.y = -0.9; S.gazeTimer = 1.5 + Math.random() * 2; }
      speed = 3;
      break;
    case 'down':
      if (S.gazeTimer <= 0) { aim.x = (Math.random() - 0.5) * 0.7; aim.y = 0.85; S.gazeTimer = 2 + Math.random() * 3; }
      speed = 2;
      break;
    case 'aside':                                // sulking: looks away, steals a glance back
      if (S.gazeTimer <= 0) {
        S.gazeAway = !S.gazeAway;
        if (S.gazeAway) S.gazeSide = -S.gazeSide;
        S.gazeTimer = S.gazeAway ? 2.5 + Math.random() * 2.5 : 0.7;
      }
      aim.x = S.gazeAway ? S.gazeSide : 0; aim.y = S.gazeAway ? 0.3 : 0;
      speed = 6;
      break;
    case 'dart':                                 // caught out: left, right, sometimes straight at you
      if (S.gazeTimer <= 0) {
        S.gazeSide = -S.gazeSide;
        aim.x = Math.random() < 0.25 ? 0 : S.gazeSide; aim.y = 0.15;
        S.gazeTimer = 0.45 + Math.random() * 0.8;
      }
      speed = 12;
      break;
    default:                                     // wander: a look somewhere, often back to the middle
      if (S.gazeTimer <= 0) {
        const home = Math.random() < 0.35;
        aim.x = home ? 0 : (Math.random() * 2 - 1);
        aim.y = home ? 0 : (Math.random() * 2 - 1) * 0.7;
        S.gazeTimer = 1.2 + Math.random() * 2.8;
      }
  }

  const before = eyeL.x;
  eyeL.x = easedLerp(eyeL.x, aim.x, speed, dt);
  eyeL.y = easedLerp(eyeL.y, aim.y, speed, dt);
  eyeR.x = easedLerp(eyeR.x, aim.x, speed * 0.7, dt);
  eyeR.y = easedLerp(eyeR.y, aim.y, speed * 0.7, dt);

  // A quick look stretches the eyes sideways for an instant
  const moving = dt > 0 ? Math.abs(eyeL.x - before) / dt : 0;
  S.glance = lerp(S.glance, clamp(moving * 0.045, 0, 0.14), clamp(dt * 20, 0, 1));
}

export function updateHabits(dt) {
  S.signsAmt = Math.min(1, S.signsAmt + dt * 3);

  if (S.habits.emit && S.time >= S.nextEmit) {
    emit(S.habits.emit.sign);
    S.nextEmit = S.time + between(S.habits.emit.every);
  }
  for (const f of floaters) f.age += dt / f.life;
  for (let i = floaters.length - 1; i >= 0; i--) if (floaters[i].age >= 1) floaters.splice(i, 1);

  // Tired: the lids sink slowly, then it catches itself and they fly open
  if (S.habits.droop) {
    S.droop += dt * 0.26;
    if (S.droop > 1) { S.droop = 0; nudge(-0.14); }
  } else {
    S.droop = Math.max(0, S.droop - dt * 2);
  }

  S.spin += (S.habits.spin || 0) * 2 * Math.PI * dt;
  S.wobble *= Math.exp(-dt * 1.1);
}
