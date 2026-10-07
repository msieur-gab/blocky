// ══════════════════════════════════════════
// Shape Catalog
// Parametric drawing primitives for eyes + mouths
// Each shape is a function: (ctx, w, h, scale, opts) => void
// ══════════════════════════════════════════

// ── Helpers ──

function roundRect(ctx, w, h, r) {
  r = Math.min(r, w, h);
  ctx.beginPath();
  ctx.moveTo(-w + r, -h);
  ctx.lineTo(w - r, -h);
  ctx.quadraticCurveTo(w, -h, w, -h + r);
  ctx.lineTo(w, h - r);
  ctx.quadraticCurveTo(w, h, w - r, h);
  ctx.lineTo(-w + r, h);
  ctx.quadraticCurveTo(-w, h, -w, h - r);
  ctx.lineTo(-w, -h + r);
  ctx.quadraticCurveTo(-w, -h, -w + r, -h);
  ctx.closePath();
}

// A heart centred on (0, 0), about r wide on each side. Traced from the classic heart curve,
// so the lobes are round and the point is sharp. Leaves the path open for fill or stroke.
export function heartPath(ctx, r) {
  const k = r / 16;
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const t = i / 48 * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) - 2.5;
    if (i === 0) ctx.moveTo(x * k, y * k);
    else ctx.lineTo(x * k, y * k);
  }
  ctx.closePath();
}

// Drawn digits fill the height of their eye (they are about 1.3 wide for 2 high)
// and take a heavier stroke than the other line symbols.
function digitSize(ctx, w, h) {
  ctx.lineWidth *= 1.7;
  return Math.min(h, w / 0.65) * 0.85;
}

// ══════════════════════════════════════════
// EYE SHAPES
// All draw centered at (0, 0)
// w = half-width, h = half-height, both pre-scaled
// ══════════════════════════════════════════

export const eyes = {

  // Pill / rounded rectangle (default)
  pill(ctx, w, h, r) {
    roundRect(ctx, w, h, Math.min(r, w, h));
    ctx.fill();
  },

  // Perfect circle
  round(ctx, w, h) {
    const radius = Math.min(w, h);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  },

  // Narrow slit
  narrow(ctx, w, h, r) {
    roundRect(ctx, w, Math.max(h, 2), Math.min(r, w));
    ctx.fill();
  },

  // Upward arc (rainbow) — stroke only
  arc(ctx, w, h) {
    ctx.beginPath();
    ctx.arc(0, h * 0.3, w, Math.PI, 0, false);
    ctx.stroke();
  },

  // X cross — two diagonal strokes
  cross(ctx, w, h) {
    const s = Math.min(w, h) * 0.8;
    ctx.beginPath();
    ctx.moveTo(-s, -s); ctx.lineTo(s, s);
    ctx.moveTo(s, -s); ctx.lineTo(-s, s);
    ctx.stroke();
  },

  // Heart — the same drawing as the little hearts that float away (see heartPath)
  heart(ctx, w, h) {
    ctx.save();
    ctx.scale(1, h / Math.max(w, 1));      // a blink flattens it
    heartPath(ctx, w);
    ctx.fill();
    ctx.restore();
  },

  // Star (5-point)
  star(ctx, w, h) {
    const r = Math.min(w, h);
    const inner = r * 0.45;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      const radius = i % 2 === 0 ? r : inner;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  },

  // Music note — filled circle + stem
  musicNote(ctx, w, h) {
    const r = Math.min(w, h) * 0.4;
    // Note head
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, r * 0.3, r, r * 0.7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Stem
    ctx.beginPath();
    ctx.moveTo(r * 0.7, r * 0.1);
    ctx.lineTo(r * 0.7, -h * 0.9);
    ctx.stroke();
    // Flag
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -h * 0.9);
    ctx.quadraticCurveTo(r * 1.6, -h * 0.5, r * 0.7, -h * 0.2);
    ctx.stroke();
  },

  // Whirl / spiral — two loose turns, so a thick stroke still leaves room between them
  whirl(ctx, w, h) {
    const r = Math.min(w, h) - ctx.lineWidth / 2;
    const turns = 2;
    const steps = 72;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * turns * Math.PI * 2;
      const radius = t * r;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  // > shape (angle pointing right)
  angleRight(ctx, w, h) {
    const hw = w * 0.7;
    const hh = h * 0.8;
    ctx.beginPath();
    ctx.moveTo(-hw, -hh);
    ctx.lineTo(hw, 0);
    ctx.lineTo(-hw, hh);
    ctx.stroke();
  },

  // < shape (angle pointing left)
  angleLeft(ctx, w, h) {
    const hw = w * 0.7;
    const hh = h * 0.8;
    ctx.beginPath();
    ctx.moveTo(hw, -hh);
    ctx.lineTo(-hw, 0);
    ctx.lineTo(hw, hh);
    ctx.stroke();
  },

  // ── Numbers (0-9) ──

  zero(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  one(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.6);
    ctx.lineTo(s * 0.1, -s);
    ctx.lineTo(s * 0.1, s);
    ctx.moveTo(-s * 0.4, s);
    ctx.lineTo(s * 0.5, s);
    ctx.stroke();
  },

  two(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.6);
    ctx.quadraticCurveTo(-s * 0.5, -s, s * 0.3, -s);
    ctx.quadraticCurveTo(s * 0.9, -s, s * 0.7, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.3, s * 0.2, -s * 0.6, s);
    ctx.lineTo(s * 0.6, s);
    ctx.stroke();
  },

  three(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(s * 0.3, -s);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.5, 0, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.9, s * 0.4, s * 0.3, s);
    ctx.lineTo(-s * 0.5, s);
    ctx.stroke();
  },

  four(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s);
    ctx.lineTo(s * 0.3, -s);
    ctx.lineTo(-s * 0.6, s * 0.3);
    ctx.lineTo(s * 0.6, s * 0.3);
    ctx.stroke();
  },

  five(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s);
    ctx.lineTo(-s * 0.4, -s);
    ctx.lineTo(-s * 0.5, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.7, -s * 0.3, s * 0.6, s * 0.3);
    ctx.quadraticCurveTo(s * 0.5, s, -s * 0.4, s);
    ctx.stroke();
  },

  six(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s);
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.2, -s * 0.5, s * 0.3);
    ctx.quadraticCurveTo(-s * 0.5, s, 0, s);
    ctx.quadraticCurveTo(s * 0.6, s, s * 0.6, s * 0.3);
    ctx.quadraticCurveTo(s * 0.6, -s * 0.1, 0, -s * 0.1);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.1, -s * 0.5, s * 0.3);
    ctx.stroke();
  },

  seven(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(s * 0.5, -s);
    ctx.lineTo(-s * 0.1, s);
    ctx.stroke();
  },

  eight(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.5, s * 0.4, s * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.45, s * 0.45, s * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  nine(ctx, w, h) {
    const s = digitSize(ctx, w, h);
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, s);
    ctx.quadraticCurveTo(s * 0.7, s * 0.2, s * 0.5, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.5, -s, 0, -s);
    ctx.quadraticCurveTo(-s * 0.6, -s, -s * 0.6, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.6, s * 0.1, 0, s * 0.1);
    ctx.quadraticCurveTo(s * 0.5, s * 0.1, s * 0.5, -s * 0.3);
    ctx.stroke();
  },

  // ── RPS game shapes ──
  // Solid pieces as big as an eye, with the detail drawn in the background colour on top.

  // Rock — a boulder with a crack
  rock(ctx, w, h, r, opts = {}) {
    const s = Math.min(w, h);
    const outline = [[-0.72, 0.5], [-0.84, -0.05], [-0.42, -0.66], [0.24, -0.76], [0.8, -0.24], [0.76, 0.46], [0.1, 0.7]];
    ctx.save();
    ctx.scale(1, h / Math.max(s, 1));
    ctx.lineWidth = s * 0.3; ctx.lineJoin = 'round';
    ctx.beginPath();
    outline.forEach(([x, y], i) => i ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s));
    ctx.closePath(); ctx.fill(); ctx.stroke();           // the stroke rounds every corner
    if (opts.bg) {
      ctx.strokeStyle = opts.bg; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.12 * s, -0.86 * s); ctx.lineTo(0.06 * s, -0.36 * s); ctx.lineTo(-0.2 * s, -0.02 * s);
      ctx.moveTo(0.9 * s, 0.12 * s); ctx.lineTo(0.5 * s, 0.22 * s);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Paper — a sheet with three written lines
  paper(ctx, w, h, r, opts = {}) {
    const s = Math.min(w, h);
    ctx.save();
    ctx.scale(1, h / Math.max(s, 1));
    roundRect(ctx, s * 0.68, s * 0.92, s * 0.14);
    ctx.fill();
    if (opts.bg) {
      ctx.strokeStyle = opts.bg; ctx.lineWidth = s * 0.13; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-0.38 * s, -0.46 * s); ctx.lineTo(0.38 * s, -0.46 * s);
      ctx.moveTo(-0.38 * s, 0);         ctx.lineTo(0.38 * s, 0);
      ctx.moveTo(-0.38 * s, 0.46 * s);  ctx.lineTo(0.08 * s, 0.46 * s);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Scissors — two open blades above two round handles
  scissors(ctx, w, h) {
    const s = Math.min(w, h);
    ctx.save();
    ctx.scale(1, h / Math.max(s, 1));
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.24;
    ctx.beginPath();
    ctx.moveTo(-0.5 * s, -0.88 * s); ctx.lineTo(0.2 * s, 0.34 * s);
    ctx.moveTo(0.5 * s, -0.88 * s);  ctx.lineTo(-0.2 * s, 0.34 * s);
    ctx.stroke();
    ctx.lineWidth = s * 0.17;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 0.4 * s, 0.64 * s, 0.26 * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  },
};

// ══════════════════════════════════════════
// MOUTH SHAPES
// All draw centered at (0, my) — caller translates
// w = half-width, h = half-height, both pre-scaled
// ══════════════════════════════════════════

export const mouths = {

  none() {},

  line(ctx, w, h, opts) {
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, opts.curve || 0, w, 0);
    ctx.stroke();
  },

  smile(ctx, w, h, opts) {
    const curve = Math.abs(opts.curve || 10);
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, curve, w, 0);
    ctx.stroke();
  },

  frown(ctx, w, h, opts) {
    const curve = -Math.abs(opts.curve || 10);
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(0, curve, w, 0);
    ctx.stroke();
  },

  circle(ctx, w, h, opts) {
    const radius = Math.min(w, h) * 0.5 * Math.max(0.3, opts.open || 1);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, radius), 0, Math.PI * 2);
    ctx.fill();
  },

  rect(ctx, w, h, opts) {
    const openH = h * Math.max(0.3, opts.open || 0.6);
    const r = Math.min(opts.round || 4, w, openH);
    roundRect(ctx, w, openH, r);
    ctx.fill();
  },

  zigzag(ctx, w, h, opts) {
    const segments = 5;
    const segW = (w * 2) / segments;
    const amp = h * 0.6;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    for (let i = 1; i <= segments; i++) {
      ctx.lineTo(-w + i * segW, (i % 2 === 0 ? -amp : amp));
    }
    ctx.stroke();
  },

  wave(ctx, w, h) {
    const t = Date.now() * 0.003;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    for (let i = 0; i <= 20; i++) {
      ctx.lineTo(-w + (w * 2) * (i / 20), Math.sin(t + i * 0.8) * h * 0.5);
    }
    ctx.stroke();
  },

  three(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h);
    ctx.quadraticCurveTo(w, -h * 0.5, -w * 0.1, 0);
    ctx.quadraticCurveTo(w * 1.1, h * 0.5, -w * 0.3, h);
    ctx.stroke();
  },
};

// ── Shape name lists (for UI) ──

export const eyeShapeNames = Object.keys(eyes);
export const mouthShapeNames = Object.keys(mouths);

// ══════════════════════════════════════════
// Digits as type
// By default the ten digits are set in the device's own rounded bold face: heavy, familiar,
// readable from across a room. 'drawn' goes back to the stroked digits above, which look
// the same on every device.
// ══════════════════════════════════════════

const TYPE = 'ui-rounded, "SF Pro Rounded", "Nunito", "Arial Rounded MT Bold", system-ui, sans-serif';
let digitStyle = 'type';
export function setDigitStyle(style) { digitStyle = style === 'drawn' ? 'drawn' : 'type'; }

['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'].forEach((name, n) => {
  const drawn = eyes[name];
  eyes[name] = (ctx, w, h, r, opts = {}) => {
    if (digitStyle === 'drawn') return drawn(ctx, w, h);
    const open = opts.open || h;                 // height when the eye is fully open
    ctx.save();
    ctx.scale(1, h / open);                      // a blink flattens the digit
    ctx.font = `900 ${open * 2.5}px ${TYPE}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, open * 0.08);
    ctx.restore();
  };
});
