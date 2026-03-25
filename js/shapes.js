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

  // Whirl / spiral
  whirl(ctx, w, h) {
    const r = Math.min(w, h);
    ctx.beginPath();
    const turns = 2.5;
    const steps = 60;
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
