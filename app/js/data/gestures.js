// ══════════════════════════════════════════
// Head Gestures Catalog
// Face-only movements — play as overlay on any behavior
// Each frame: { dur, x?, y?, tilt?, scale?, sound? }
// or a wave: { axis, swings, amp, dur, turn? }  (see Yes / No)
// ══════════════════════════════════════════

export const catalog = {

  // ── Yes / No ──
  // Waves, not frames: the head swings `swings` times over `dur` ms, swelling in and fading out.
  // axis 'y' nods. axis 'x' shakes, and the face turns with it: the eye it turns toward
  // shrinks a little, the other grows, like a head seen from the front.

  nod:          { axis: 'y', swings: 2.5, amp: 20, dur: 900 },
  nod_strong:   { axis: 'y', swings: 4,   amp: 30, dur: 1100 },
  shake:        { axis: 'x', swings: 2,   amp: 34, dur: 1000, turn: 0.5 },
  shake_strong: { axis: 'x', swings: 3.5, amp: 46, dur: 1300, turn: 0.7 },

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
