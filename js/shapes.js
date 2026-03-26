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

// 4-corner variant: independent radius per corner (tl, tr, br, bl)
function roundRect4(ctx, w, h, tl, tr, br, bl) {
  tl = Math.min(tl, w, h);
  tr = Math.min(tr, w, h);
  br = Math.min(br, w, h);
  bl = Math.min(bl, w, h);
  ctx.beginPath();
  ctx.moveTo(-w + tl, -h);
  ctx.lineTo(w - tr, -h);
  ctx.quadraticCurveTo(w, -h, w, -h + tr);
  ctx.lineTo(w, h - br);
  ctx.quadraticCurveTo(w, h, w - br, h);
  ctx.lineTo(-w + bl, h);
  ctx.quadraticCurveTo(-w, h, -w, h - bl);
  ctx.lineTo(-w, -h + tl);
  ctx.quadraticCurveTo(-w, -h, -w + tl, -h);
  ctx.closePath();
}

// ══════════════════════════════════════════
// EYE SHAPES
// All draw centered at (0, 0)
// w = half-width, h = half-height, both pre-scaled
// ══════════════════════════════════════════

export const eyes = {

  // Pill / rounded rectangle (default) — all corners equal
  pill(ctx, w, h, r) {
    roundRect(ctx, w, h, Math.min(r, w, h));
    ctx.fill();
  },

  // Droopy — rounded top, flatter bottom (sad, sleepy, falling asleep)
  droopy(ctx, w, h, r) {
    const top = Math.min(r, w, h);
    const bot = Math.min(r * 0.5, w, h);
    roundRect4(ctx, w, h, top, top, bot, bot);
    ctx.fill();
  },

  // Sharp — flat top, rounded bottom (angry, determined, suspicious)
  sharp(ctx, w, h, r) {
    const top = Math.min(r * 0.5, w, h);
    const bot = Math.min(r, w, h);
    roundRect4(ctx, w, h, top, top, bot, bot);
    ctx.fill();
  },

  // Smile — tighter top, rounder bottom (happy, warm, friendly)
  smile(ctx, w, h, r) {
    const top = Math.min(r * 0.7, w, h);
    const bot = Math.min(r * 1.1, w, h);
    roundRect4(ctx, w, h, top, top, bot, bot);
    ctx.fill();
  },

  // Soft — all corners reduced (worried, small, cautious)
  soft(ctx, w, h, r) {
    const s = Math.min(r * 0.5, w, h);
    roundRect4(ctx, w, h, s, s, s, s);
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

  // ── Numbers (0-9) ──

  zero(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.5, s, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  one(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.6);
    ctx.lineTo(s * 0.1, -s);
    ctx.lineTo(s * 0.1, s);
    ctx.moveTo(-s * 0.4, s);
    ctx.lineTo(s * 0.5, s);
    ctx.stroke();
  },

  two(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.6);
    ctx.quadraticCurveTo(-s * 0.5, -s, s * 0.3, -s);
    ctx.quadraticCurveTo(s * 0.9, -s, s * 0.7, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.3, s * 0.2, -s * 0.6, s);
    ctx.lineTo(s * 0.6, s);
    ctx.stroke();
  },

  three(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(s * 0.3, -s);
    ctx.quadraticCurveTo(s * 0.8, -s * 0.5, 0, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.9, s * 0.4, s * 0.3, s);
    ctx.lineTo(-s * 0.5, s);
    ctx.stroke();
  },

  four(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.moveTo(s * 0.3, s);
    ctx.lineTo(s * 0.3, -s);
    ctx.lineTo(-s * 0.6, s * 0.3);
    ctx.lineTo(s * 0.6, s * 0.3);
    ctx.stroke();
  },

  five(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s);
    ctx.lineTo(-s * 0.4, -s);
    ctx.lineTo(-s * 0.5, -s * 0.1);
    ctx.quadraticCurveTo(s * 0.7, -s * 0.3, s * 0.6, s * 0.3);
    ctx.quadraticCurveTo(s * 0.5, s, -s * 0.4, s);
    ctx.stroke();
  },

  six(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
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
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s);
    ctx.lineTo(s * 0.5, -s);
    ctx.lineTo(-s * 0.1, s);
    ctx.stroke();
  },

  eight(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.5, s * 0.4, s * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, s * 0.45, s * 0.45, s * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  },

  nine(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
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

  // Rock — solid fist (filled circle with knuckle line)
  rock(ctx, w, h) {
    const r = Math.min(w, h) * 0.9;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    // Knuckle line
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.7, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  },

  // Paper — open flat hand (wide rounded rect)
  paper(ctx, w, h) {
    const pw = w * 0.95;
    const ph = h * 0.7;
    roundRect(ctx, pw, ph, Math.min(pw, ph) * 0.3);
    ctx.fill();
    // Finger lines
    const lineY = [-ph * 0.35, 0, ph * 0.35];
    for (const y of lineY) {
      ctx.beginPath();
      ctx.moveTo(-pw * 0.5, y);
      ctx.lineTo(pw * 0.5, y);
      ctx.stroke();
    }
  },

  // Scissors — two crossed lines (✂)
  scissors(ctx, w, h) {
    const s = Math.min(w, h) * 0.85;
    // Two blades crossing
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s);
    ctx.lineTo(s * 0.3, s * 0.5);
    ctx.moveTo(s * 0.6, -s);
    ctx.lineTo(-s * 0.3, s * 0.5);
    ctx.stroke();
    // Handles (small circles)
    ctx.beginPath();
    ctx.arc(-s * 0.3, s * 0.7, s * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.3, s * 0.7, s * 0.25, 0, Math.PI * 2);
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
