// ══════════════════════════════════════════
// Face — pixel grid
// ══════════════════════════════════════════

import { S } from './state.js';

export function pixelCanvas() {
  const cell = Math.min(S.W, S.H) / S.gridCells;
  const cols = Math.max(1, Math.round(S.W / cell));
  const rows = Math.max(1, Math.round(S.H / cell));
  if (!S.grid) {
    const small = document.createElement('canvas');
    S.grid = { small, ctx: small.getContext('2d', { willReadFrequently: true }), lines: null, key: '' };
  }
  if (S.grid.small.width !== cols || S.grid.small.height !== rows) { S.grid.small.width = cols; S.grid.small.height = rows; }
  S.grid.cols = cols; S.grid.rows = rows;
  return S.grid;
}

export function showPixels(small, fg, bg) {
  const { cols, rows } = small;

  // Every cell fully on or fully off
  const image = small.ctx.getImageData(0, 0, cols, rows);
  const px = new Uint32Array(image.data.buffer);
  const on = rgba(fg), off = rgba(bg);
  const mid = (brightness(on) + brightness(off)) / 2;
  const lit = brightness(on) > brightness(off);
  for (let i = 0; i < px.length; i++) px[i] = (brightness(px[i]) > mid) === lit ? on : off;
  small.ctx.setTransform(1, 0, 0, 1, 0, 0);
  small.ctx.putImageData(image, 0, 0);

  // The lines between cells never change for a given size: draw them once
  const key = `${S.canvas.width}x${S.canvas.height}/${cols}/${bg}`;
  if (small.key !== key) {
    small.key = key;
    small.lines = document.createElement('canvas');
    small.lines.width = S.canvas.width; small.lines.height = S.canvas.height;
    if (S.canvas.width / cols >= 4) {
      const g = small.lines.getContext('2d');
      g.fillStyle = bg;
      g.globalAlpha = 0.5;
      for (let c = 1; c < cols; c++) g.fillRect(Math.round(c * S.canvas.width / cols), 0, 1, S.canvas.height);
      for (let r = 1; r < rows; r++) g.fillRect(0, Math.round(r * S.canvas.height / rows), S.canvas.width, 1);
    }
  }

  S.ctx.save();
  S.ctx.setTransform(1, 0, 0, 1, 0, 0);
  S.ctx.imageSmoothingEnabled = false;
  S.ctx.drawImage(small.small, 0, 0, S.canvas.width, S.canvas.height);
  S.ctx.drawImage(small.lines, 0, 0);
  S.ctx.restore();
}

// '#rrggbb' → the 32-bit value a canvas stores for that colour (little-endian ABGR)
export function rgba(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h, 16);
  return (0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | (n >>> 16 & 0xff)) >>> 0;
}

export function brightness(abgr) {
  return (abgr & 0xff) * 0.3 + (abgr >>> 8 & 0xff) * 0.6 + (abgr >>> 16 & 0xff) * 0.1;
}
