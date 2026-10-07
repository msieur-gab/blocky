// ══════════════════════════════════════════
// Face — drawing the scanner
// ══════════════════════════════════════════

import { lerp } from '../utils/math.js';
import { line, wide, tall, gapNow, face, S } from './state.js';

// ── Scanner ──
// When blocky looks at something through the camera, the eyes give way to a viewfinder:
// four corners, a bar sweeping up and down with a trail behind it, a blinking light.

export function drawScanner(fg) {
  const t = S.scanAmt;
  const halfW = lerp(face.leftEye.w * wide() / 2, gapNow() / 2 + face.leftEye.w * wide() * 0.9, t) * S.scale;
  const halfH = lerp(10, face.leftEye.h * tall() * 0.62, t) * S.scale;
  const arm = Math.min(halfW, halfH) * 0.32;
  const y = S.scanY * (halfH - arm * 0.5);

  S.ctx.save();
  S.ctx.globalAlpha = t;
  S.ctx.strokeStyle = fg;
  S.ctx.fillStyle = fg;
  S.ctx.lineCap = 'round';
  S.ctx.lineJoin = 'round';

  // Corners
  S.ctx.lineWidth = line(12 * S.scale);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    S.ctx.beginPath();
    S.ctx.moveTo(sx * (halfW - arm), sy * halfH);
    S.ctx.lineTo(sx * halfW, sy * halfH);
    S.ctx.lineTo(sx * halfW, sy * (halfH - arm));
    S.ctx.stroke();
  }

  // Trail: rows of dashes thinning out on the side the bar just left.
  // Dashes, not transparency, so the trail is still there on the pixel grid.
  const inner = halfW - arm * 0.7;
  S.ctx.lineWidth = line(7 * S.scale);
  S.ctx.lineCap = 'butt';
  [[16, 14], [10, 22], [5, 30]].forEach(([dash, space], i) => {
    const ty = y - S.scanDir * (i + 1) * 20 * S.scale;
    if (Math.abs(ty) > halfH - arm * 0.3) return;
    S.ctx.setLineDash([dash * S.scale, space * S.scale]);
    S.ctx.lineDashOffset = i * 9 * S.scale;
    S.ctx.beginPath(); S.ctx.moveTo(-inner, ty); S.ctx.lineTo(inner, ty); S.ctx.stroke();
  });
  S.ctx.setLineDash([]);
  S.ctx.lineCap = 'round';

  // The bar
  S.ctx.lineWidth = line(13 * S.scale);
  S.ctx.beginPath(); S.ctx.moveTo(-inner, y); S.ctx.lineTo(inner, y); S.ctx.stroke();

  // "I'm looking" light, top right, blinking
  if (Math.floor(S.time * 2.5) % 2 === 0) {
    S.ctx.beginPath();
    S.ctx.arc(halfW - arm * 1.1, -halfH + arm * 1.1, 13 * S.scale, 0, Math.PI * 2);
    S.ctx.fill();
  }

  S.ctx.restore();
}
