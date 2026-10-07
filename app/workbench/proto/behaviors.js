// ══════════════════════════════════════════
// Behaviors Catalog
// A behavior = living state with optional internal loop
// References eyes and sounds by name
// ══════════════════════════════════════════

export const catalog = {

  // ── Simple states (no internal loop) ──

  awake: {
    eyes: 'awake',
    face: {},
  },

  calm: {
    eyes: 'calm',
    face: {},
  },

  happy: {
    eyes: 'happy',
    face: { scale: 1.02 },
  },

  surprise: {
    eyes: 'surprise',
    face: { scale: 1.08 },
    sound: 'chirp_up',
  },

  asleep: {
    eyes: 'asleep',
    face: { y: 8, scale: 0.95 },
  },

  // ── States with internal micro-animation ──

  drowsy: {
    eyes: 'drowsy',
    face: { y: 5, scale: 0.97 },
    sound: 'yawn',
    loop: [
      { eyes: 'drowsy',       dur: 1500 },
      { eyes: 'drowsy_open',  dur: 800,  sound: 'chirp_up' },
      { eyes: 'drowsy',       dur: 600 },
      { eyes: 'drowsy_open',  dur: 500 },
      { eyes: 'drowsy_shut',  dur: 1200, sound: 'hum_sad' },
      { eyes: 'drowsy',       dur: 1000 },
    ],
  },

  sleeping: {
    eyes: 'exhale',
    mouth: 'sleep_exhale',
    face: { y: 8, scale: 0.95 },
    loop: [
      { eyes: 'exhale', mouth: 'sleep_exhale', dur: 2500, sound: 'snore_exhale', face: { y: 8, scale: 0.95 } },
      { eyes: 'inhale', mouth: 'sleep_inhale', dur: 2500, sound: 'snore_inhale', face: { y: 6, scale: 0.97 } },
    ],
  },

  // ── Symbol behaviors (special moments) ──

  starry: {
    eyes: 'star',
    mouth: 'smile',
    face: { scale: 1.06 },
    sound: 'chirp_up',
  },

  love: {
    eyes: 'heart',
    mouth: 'smile',
    face: { scale: 1.04 },
    sound: 'chirp_up',
  },

  dizzy: {
    eyes: 'whirl',
    mouth: 'zigzag',
    face: { tilt: -6 },
  },
};
