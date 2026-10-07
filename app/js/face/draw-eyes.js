// ══════════════════════════════════════════
// Face — drawing the eyes
// Pill, lids, symbols; one eye at a time
// ══════════════════════════════════════════

import { clamp } from '../utils/math.js';
import { eyes as symbolShapes } from '../shapes.js';
import { line, prop, wide, tall, gapNow, face, shown, bounce, GAZE_X, GAZE_Y, eyeL, eyeR, S } from './state.js';

export function eyePosition(side, eye, skX, skY) {
  const driftSeed = side * 1.7;
  const microX = Math.sin(S.driftPhase * 2.3 + driftSeed) * 1.5 * S.scale
                + Math.sin(S.driftPhase * 5.1 + driftSeed * 3) * 0.6 * S.scale;
  const microY = Math.sin(S.driftPhase * 1.9 + driftSeed * 2) * 1.0 * S.scale
                + Math.cos(S.driftPhase * 4.3 + driftSeed) * 0.4 * S.scale;
  const perspShift = skX * side * -8 * S.scale;
  const g = side < 0 ? eyeL : eyeR;
  return {
    x: side * gapNow() * S.scale / 2 + (eye.x || 0) * S.scale + perspShift + microX + g.x * GAZE_X * wide() * S.scale,
    y: (eye.y || 0) * S.scale + skY * side * -4 * S.scale + microY + g.y * GAZE_Y * tall() * S.scale,
  };
}

export function drawNormalEyes(fg, bg, skX, skY) {
  [
    { side: -1, eye: face.leftEye,  shape: shown.left },
    { side:  1, eye: face.rightEye, shape: shown.right },
  ].forEach(({ side, eye, shape }) => {
    const symbol = shape && symbolShapes[shape] ? shape : null;
    const perspScale = 1 + skX * side * 0.4;

    // Symbols keep their own proportions; pills follow the tuned eye
    const kw = symbol ? prop.symbol : wide();
    const kh = symbol ? prop.symbol : tall();
    const ew = eye.w * kw * S.scale / 2 * perspScale * (1 + bounce.x * 0.6) * (1 + S.glance);
    const ehOpen = eye.h * kh * S.scale / 2 * perspScale * (1 - bounce.x) * (1 - S.glance * 0.6);

    // Blink (or a change of shape) squashes height — but skip if eyes already nearly closed (sleeping)
    const eyeAlreadyClosed = ehOpen < 8 * S.scale;
    const shut = Math.max(S.blinkAmt * 0.92, S.swapAmt * 0.95);
    const blinkScale = eyeAlreadyClosed ? 1 : (1 - shut);
    const eh = Math.max(1.5 * S.scale, ehOpen * blinkScale);

    const pos = eyePosition(side, eye, skX, skY);
    const tilt = (eye.tilt || 0) * Math.PI / 180;

    S.ctx.save();
    S.ctx.translate(pos.x, pos.y);
    S.ctx.rotate(tilt);

    // Per-eye skew
    if (eye.skewX || eye.skewY) {
      S.ctx.transform(1, eye.skewY || 0, eye.skewX || 0, 1, 0, 0);
    }

    S.ctx.fillStyle = fg;
    S.ctx.strokeStyle = fg;
    S.ctx.lineWidth = line(3 * S.scale);
    S.ctx.lineCap = 'round';
    S.ctx.lineJoin = 'round';

    if ((!eyeAlreadyClosed && blinkScale < 0.12) || eh < ew * 0.15) {
      // Eyes too thin for pill — draw a line (blink or squished expression)
      S.ctx.beginPath();
      S.ctx.moveTo(-ew * 0.75, 0);
      S.ctx.lineTo(ew * 0.75, 0);
      S.ctx.stroke();
    } else if (symbol) {
      // Symbol override (star, heart, digit, game piece…): solid, with strokes thick enough to read from afar
      if (S.habits.spin) S.ctx.rotate(S.spin * -side);
      S.ctx.lineWidth = line(Math.min(ew, ehOpen) * 0.22 * prop.stroke);
      symbolShapes[symbol](S.ctx, ew, eh, Math.min(ew, eh), { bg, open: ehOpen });
    } else {
      // Pill with 4 independent corner radii + independent top/bottom shift
      const st = (eye.shiftTop || 0) * kw * S.scale / 2;
      const sb = (eye.shiftBot || 0) * kw * S.scale / 2;

      // Clamp radii against RENDERED half-dimensions (after blink squash)
      const ctl = Math.min((eye.tl ?? 50) * S.scale * perspScale * kw, ew, eh);
      const ctr = Math.min((eye.tr ?? 50) * S.scale * perspScale * kw, ew, eh);
      const cbr = Math.min((eye.br ?? 50) * S.scale * perspScale * kw, ew, eh);
      const cbl = Math.min((eye.bl ?? 50) * S.scale * perspScale * kw, ew, eh);

      closeLids(eye, side, ew, eh, Math.max(Math.abs(st), Math.abs(sb)));

      S.ctx.beginPath();
      S.ctx.moveTo(st, -eh);
      S.ctx.arcTo( ew + st, -eh,  ew + sb,  eh, ctr);
      S.ctx.arcTo( ew + sb,  eh, -ew + sb,  eh, cbr);
      S.ctx.arcTo(-ew + sb,  eh, -ew + st, -eh, cbl);
      S.ctx.arcTo(-ew + st, -eh,  ew + st, -eh, ctl);
      S.ctx.closePath();
      S.ctx.fill();
    }

    S.ctx.restore();
  });
}

// ── Lids ──
// Only the part of the pill between the two lids is drawn.
//   lidTop 0…1  how far the upper lid has come down (sleepy, bored, sulking)
//   lidBot 0…1  how far the lower lid has come up; it rises as an arch, so the eye turns into a smile
//   slant  deg  the upper lid leans: + down toward the nose (cross), − down toward the ear (sad)
// The upper edge sags a little in the middle, so no lid ever looks like a blade.

export function closeLids(eye, side, ew, eh, shift) {
  const rest = eye.lidTop || 0;
  const top = clamp(rest + Math.max(0, 0.84 - rest) * S.droop, 0, 0.96);
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

  S.ctx.beginPath();
  S.ctx.moveTo(-X, yTop - lean);
  S.ctx.quadraticCurveTo(0, yTop + sag * 2, X, yTop + lean);
  S.ctx.lineTo(X, yEnd);
  S.ctx.quadraticCurveTo(0, 2 * yMid - yEnd, -X, yEnd);
  S.ctx.closePath();
  S.ctx.clip();
}
