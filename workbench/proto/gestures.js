// ══════════════════════════════════════════
// Head Gestures Catalog
// Face-only movements — play as overlay on any behavior
// Each frame: { dur, x?, y?, tilt?, scale?, sound? }
// ══════════════════════════════════════════

export const catalog = {

  // ── Yes / No ──

  nod: [
    { dur: 120, y: -8 },
    { dur: 120, y: 10 },
    { dur: 120, y: -6 },
    { dur: 120, y: 8 },
    { dur: 100, y: -3 },
    { dur: 200 },
  ],

  nod_strong: [
    { dur: 90, y: -14 },
    { dur: 90, y: 16 },
    { dur: 90, y: -14 },
    { dur: 90, y: 16 },
    { dur: 90, y: -12 },
    { dur: 90, y: 14 },
    { dur: 90, y: -10 },
    { dur: 90, y: 12 },
    { dur: 200 },
  ],

  shake: [
    { dur: 100, x: 14, scale: -0.1 },
    { dur: 100, x: -14, scale: -0.1 },
    { dur: 100, x: 12, scale: -0.08 },
    { dur: 100, x: -12, scale: -0.08 },
    { dur: 100, x: 5, scale: -0.03 },
    { dur: 200 },
  ],

  shake_strong: [
    { dur: 80, x: 22, scale: -0.1 },
    { dur: 80, x: -22, scale: -0.1 },
    { dur: 80, x: 20, scale: -0.1 },
    { dur: 80, x: -20, scale: -0.1 },
    { dur: 80, x: 16, scale: -0.08 },
    { dur: 80, x: -16, scale: -0.08 },
    { dur: 80, x: 10, scale: -0.05 },
    { dur: 80, x: -10, scale: -0.05 },
    { dur: 200 },
  ],

  // ── Curiosity ──

  tilt_left: [
    { dur: 300, tilt: 12, x: -4 },
    { dur: 600, tilt: 10, x: -3 },
    { dur: 300 },
  ],

  tilt_right: [
    { dur: 300, tilt: -12, x: 4 },
    { dur: 600, tilt: -10, x: 3 },
    { dur: 300 },
  ],

  wonder: [
    { dur: 400, tilt: 8, x: 6 },
    { dur: 400, tilt: -6, x: -5 },
    { dur: 350, tilt: 5, x: 4 },
    { dur: 350, tilt: -4, x: -3 },
    { dur: 300 },
  ],

  // ── Surprise / Reflex ──

  startle: [
    { dur: 80, y: -12, scale: 0.08 },
    { dur: 150, y: -6, scale: 0.04 },
    { dur: 250 },
  ],

  recoil: [
    { dur: 100, y: 8, scale: -0.08 },
    { dur: 200, y: 4, scale: -0.04 },
    { dur: 300 },
  ],

  // ── Idle / Ambient ──

  wiggle: [
    { dur: 150, tilt: 6, x: 4 },
    { dur: 150, tilt: -6, x: -4 },
    { dur: 150, tilt: 5, x: 3 },
    { dur: 150, tilt: -5, x: -3 },
    { dur: 200 },
  ],

  peek_left: [
    { dur: 250, x: -14, tilt: 4 },
    { dur: 500, x: -12 },
    { dur: 300 },
  ],

  peek_right: [
    { dur: 250, x: 14, tilt: -4 },
    { dur: 500, x: 12 },
    { dur: 300 },
  ],

  droop: [
    { dur: 400, y: 10, scale: -0.04 },
    { dur: 800, y: 8, scale: -0.03 },
    { dur: 400 },
  ],

  perk: [
    { dur: 150, y: -10, scale: 0.05 },
    { dur: 250, y: -4, scale: 0.02 },
    { dur: 300 },
  ],

  bob: [
    { dur: 200, y: -6 },
    { dur: 200, y: 4 },
    { dur: 200, y: -5 },
    { dur: 200, y: 3 },
    { dur: 200 },
  ],
};
