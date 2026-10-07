// ══════════════════════════════════════════
// Face — drawing the signs
// ══════════════════════════════════════════

import { clamp } from '../utils/math.js';
import { heartPath } from '../shapes.js';
import { line, wide, tall, gapNow, face, floaters, S } from './state.js';

// ── Signs ──
// Small drawings around the eyes, positioned from the eyes themselves so they follow any proportion.
//   habits.signs — stay as long as the behavior: 'blush' | 'question' | 'dots' | 'sparks'
//   floaters     — let go one at a time (habits.emit, or a frame's `emit`): heart, z, tear, sweat, puff

export function drop(x, y, r) {
  S.ctx.beginPath();
  S.ctx.moveTo(x, y - r * 2.2);
  S.ctx.quadraticCurveTo(x + r * 1.5, y + r * 0.2, x, y + r);
  S.ctx.quadraticCurveTo(x - r * 1.5, y + r * 0.2, x, y - r * 2.2);
  S.ctx.fill();
}

export function drawSigns(fg) {
  const u = S.scale;
  const eyeX = gapNow() / 2;
  const eyeW = face.leftEye.w * wide(), eyeH = face.leftEye.h * tall();
  const outer = eyeX + eyeW / 2;                       // outside edge of an eye
  const inOut = (a) => clamp(Math.min(a * 6, (1 - a) * 3), 0, 1);

  S.ctx.save();
  S.ctx.fillStyle = fg;
  S.ctx.strokeStyle = fg;
  S.ctx.lineCap = 'round';
  S.ctx.lineWidth = line(5 * u);

  const signs = S.habits.signs || [];
  S.ctx.globalAlpha = S.signsAmt;

  if (signs.includes('blush')) {
    // three slanted strokes on each cheek, just outside and below the eyes
    S.ctx.save();
    S.ctx.lineWidth = line(7 * u);
    for (const side of [-1, 1]) {
      for (let i = -1; i <= 1; i++) {
        const x = side * (outer + 34) + i * 20, y = eyeH * 0.42;
        S.ctx.beginPath();
        S.ctx.moveTo((x - 7) * u, (y + 15) * u);
        S.ctx.lineTo((x + 7) * u, (y - 15) * u);
        S.ctx.stroke();
      }
    }
    S.ctx.restore();
  }
  if (signs.includes('question')) {
    const size = eyeH * 0.5;
    S.ctx.font = `800 ${size * u}px ui-rounded, system-ui, sans-serif`;
    S.ctx.textAlign = 'center'; S.ctx.textBaseline = 'middle';
    S.ctx.save();
    S.ctx.translate((outer + 70) * u, (-eyeH * 0.42 + Math.sin(S.time * 3) * 8) * u);
    S.ctx.rotate(0.2 + Math.sin(S.time * 1.5) * 0.08);
    S.ctx.fillText('?', 0, 0);
    S.ctx.restore();
  }
  if (signs.includes('dots')) {
    // one, two, three… and again
    const n = Math.floor(S.time * 2.4) % 4;
    for (let i = 0; i < n; i++) {
      S.ctx.beginPath();
      S.ctx.arc((outer + 24 + i * 34) * u, (-eyeH * 0.5 - 30 - i * 14) * u, (9 + i * 2) * u, 0, Math.PI * 2);
      S.ctx.fill();
    }
  }
  if (signs.includes('sparks')) {
    // little crosses circling over the head; they go round the back
    for (let i = 0; i < 3; i++) {
      const a = S.time * 3.2 + i * Math.PI * 2 / 3;
      if (Math.sin(a) < -0.55) continue;
      const x = Math.cos(a) * (outer + 30), y = -eyeH * 0.5 - 55 + Math.sin(a) * 22;
      const r = 13 + Math.sin(a) * 4;
      S.ctx.beginPath();
      S.ctx.moveTo((x - r) * u, y * u); S.ctx.lineTo((x + r) * u, y * u);
      S.ctx.moveTo(x * u, (y - r) * u); S.ctx.lineTo(x * u, (y + r) * u);
      S.ctx.stroke();
    }
  }

  for (const f of floaters) {
    const a = f.age;
    S.ctx.globalAlpha = inOut(a);
    if (f.kind === 'heart') {
      // the same heart as the heart eyes, smaller, drifting up
      const x = f.side * (eyeX * f.spread + eyeW * 0.3) + Math.sin(a * 7 + f.seed) * 14;
      const y = -eyeH * 0.5 - 30 - a * 150;
      S.ctx.save();
      S.ctx.translate(x * u, y * u);
      heartPath(S.ctx, (20 + a * 12) * u);
      S.ctx.fill();
      S.ctx.restore();
    } else if (f.kind === 'z') {
      S.ctx.font = `800 ${(34 + a * 40) * u}px ui-rounded, system-ui, sans-serif`;
      S.ctx.textAlign = 'center'; S.ctx.textBaseline = 'middle';
      S.ctx.fillText('Z', (outer + 30 + a * 80) * u, (-eyeH * 0.35 - a * 160) * u);
    } else if (f.kind === 'tear') {
      drop(f.side * (eyeX + eyeW * 0.15) * u, (eyeH * 0.5 + 22 + a * a * 170) * u, 11 * u);
    } else if (f.kind === 'sweat') {
      drop(f.side * (outer + 34) * u, (-eyeH * 0.32 + a * 60) * u, 12 * u);
    } else if (f.kind === 'puff') {
      // a huff of air, growing as it leaves
      const x = f.side * (outer + 40 + a * 80), y = eyeH * 0.2 - a * 24;
      const r = 13 + a * 12;
      for (const [dx, dy, k] of [[0, 0, 1], [20, -12, 0.75], [34, 6, 0.55]]) {
        S.ctx.beginPath();
        S.ctx.arc((x + f.side * dx) * u, (y + dy) * u, r * k * u, 0, Math.PI * 2);
        S.ctx.fill();
      }
    }
  }

  S.ctx.restore();
}
