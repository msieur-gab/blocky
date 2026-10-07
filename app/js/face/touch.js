// ══════════════════════════════════════════
// Face — touch
// A tap makes blocky look at the finger; a rub is a stroke
// ══════════════════════════════════════════

import { clamp } from '../utils/math.js';
import { lookAt } from './motion.js';
import { toggleRadio } from './radio.js';
import { tall, face, aim, S } from './state.js';

// Called with true when a stroke begins and false when the hand leaves
export function onPet(fn) { S.petHandler = fn; }

export function pointerAt(e) {
  const rect = S.canvas.getBoundingClientRect();
  const k = S.W / rect.width;
  return { x: (e.clientX - rect.left) * k, y: (e.clientY - rect.top) * k };
}

export function onStrokeStart(e) {
  S.stroke = { ...pointerAt(e), dist: 0 };
}

export function onStrokeMove(e) {
  if (!S.stroke) return;
  const p = pointerAt(e);
  S.stroke.dist += Math.hypot(p.x - S.stroke.x, p.y - S.stroke.y);
  S.stroke.x = p.x; S.stroke.y = p.y;

  // Rubbed about half the screen's short side: that is a stroke, not a tap
  if (!S.petting && S.stroke.dist > Math.min(S.W, S.H) * 0.5) {
    S.petting = true;
    S.petHandler?.(true);
  }
  if (S.petting) {
    // the eyes lean toward the hand
    aim.x = clamp((p.x - S.cx) / (S.W / 2), -1, 1) * 0.6;
    aim.y = clamp((p.y - S.cy) / (S.H / 2), -1, 1) * 0.6;
    S.lookUntil = S.time + 0.6;
  }
}

export function onStrokeEnd() {
  if (S.petting) {
    S.petting = false;
    S.tapQuietUntil = performance.now() + 400;   // the lift of the hand is not a tap
    S.petHandler?.(false);
  }
  S.stroke = null;
}

export function onCanvasTap(e) {
  if (performance.now() < S.tapQuietUntil) return;
  const rect = S.canvas.getBoundingClientRect();
  const k = S.W / rect.width;     // the canvas may be shown scaled
  const x = ((e.clientX ?? e.changedTouches?.[0]?.clientX ?? 0) - rect.left) * k;
  const y = ((e.clientY ?? e.changedTouches?.[0]?.clientY ?? 0) - rect.top) * k;

  if (S.radioMode) {
    e.preventDefault();
    // Mouth zone: center-x ± 40px, center-y + mouth offset ± 40px
    const mouthY = S.cy + (face.mouth.y || 35) * tall() * S.scale;
    const hitRadius = 40 * S.scale;
    if (Math.abs(x - S.cx) < hitRadius && Math.abs(y - mouthY) < hitRadius) toggleRadio();
    return;
  }

  // Tap anywhere: blocky looks at the finger
  lookAt((x - S.cx) / (S.W / 2), (y - S.cy) / (S.H / 2), 1.6);
}
