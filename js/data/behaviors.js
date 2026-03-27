// ══════════════════════════════════════════
// Behaviors Catalog
// A behavior = living state with optional internal loop
// References eyes, mouths, and sounds by name
//
// Format:
//   eyes: string           — eye shape name (or { left, right } for asymmetric)
//   mouth: string          — mouth name (optional, defaults to 'none')
//   face: object           — face transform (optional)
//   sound: string          — sound to play on enter (optional)
//   loop: array            — internal micro-animation frames (optional)
//   gap: number            — eye gap override (optional)
// ══════════════════════════════════════════

export const catalog = {

  // ── Core states ──

  awake: {
    eyes: 'awake',
    face: {},
  },

  calm: {
    eyes: 'calm',
    mouth: 'line',
    face: {},
  },

  happy: {
    eyes: 'happy',
    mouth: 'smile',
    face: { scale: 1.02 },
  },

  sad: {
    eyes: { left: 'sad', right: 'sad' },
    mouth: 'frown',
    face: { y: 4, scale: 0.97 },
  },

  scared: {
    eyes: 'scared',
    mouth: 'open_small',
    face: { scale: 0.90, y: -4 },
    gap: 480,
  },

  excited: {
    eyes: 'excited',
    mouth: 'smile',
    face: { scale: 1.08 },
    gap: 440,
  },

  bored: {
    eyes: 'bored',
    face: { y: 10, scale: 0.96 },
  },

  angry: {
    eyes: { left: 'angry', right: 'angry' },
    mouth: 'line_down',
    face: { scale: 1.04 },
    gap: 360,
  },

  surprise: {
    eyes: 'surprise',
    mouth: 'open_medium',
    face: { scale: 1.10, y: -4 },
    sound: 'chirp_up',
    gap: 460,
  },

  // ── Curiosity ──

  curious: {
    eyes: { left: 'curious_l', right: 'curious_r' },
    face: { tilt: 5 },
  },

  curious_b: {
    eyes: { left: 'curious_r', right: 'curious_l' },
    face: { tilt: -5 },
  },

  thinking: {
    eyes: { left: 'thinking_l', right: 'thinking_r' },
    mouth: 'line_small',
    face: { tilt: 8 },
  },

  attentive: {
    eyes: { left: 'attentive_l', right: 'attentive_r' },
    face: {},
  },

  // ── Extended emotions ──

  silly: {
    eyes: { left: 'silly_l', right: 'silly_r' },
    mouth: 'smile_big',
    face: { tilt: -4, scale: 1.03 },
    gap: 420,
  },

  love: {
    eyes: 'love',
    mouth: 'three',
    face: { scale: 1.04 },
  },

  embarrassed: {
    eyes: 'embarrassed',
    mouth: 'zigzag',
    face: { scale: 0.95, y: 4 },
  },

  shocked: {
    eyes: 'shocked',
    mouth: 'open_big',
    face: { scale: 1.12, y: -6 },
    gap: 380,
  },

  suspicious: {
    eyes: { left: 'suspicious_l', right: 'suspicious_r' },
    mouth: 'line_down',
    face: { tilt: -3 },
  },

  determined: {
    eyes: { left: 'determined', right: 'determined' },
    mouth: 'line_flat',
    face: { scale: 1.06 },
    gap: 380,
  },

  worried: {
    eyes: { left: 'worried', right: 'worried' },
    mouth: 'frown_small',
    face: { scale: 0.96, y: 6 },
  },

  annoyed: {
    eyes: { left: 'annoyed', right: 'annoyed' },
    mouth: 'line_down',
    gap: 390,
  },

  sleepy: {
    eyes: 'sleepy',
    face: { y: 8, scale: 0.95 },
  },

  wink: {
    eyes: { left: 'wink_closed', right: 'awake' },
    mouth: 'smile',
    face: { tilt: -3 },
  },

  // ── Sleep (workbench-designed) ──

  drowsy: {
    eyes: 'drowsy',
    sound: 'yawn',
    face: { y: 5, scale: 0.97 },
    loop: [
      { eyes: 'drowsy',       dur: 1500 },
      { eyes: 'drowsy_open',  dur: 800,  sound: 'chirp_up' },
      { eyes: 'drowsy',       dur: 600 },
      { eyes: 'drowsy_open',  dur: 500 },
      { eyes: 'drowsy_shut',  dur: 1200, sound: 'hum_sad' },
      { eyes: 'drowsy',       dur: 1000 },
    ],
  },

  asleep: {
    eyes: 'asleep',
    face: { y: 8, scale: 0.95 },
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

  // ── Yawn ──

  yawning: {
    eyes: 'yawn',
    mouth: 'yawn',
    face: { scale: 1.04 },
    sound: 'yawn_sound',
  },

  // ── Symbol behaviors (special moments) ──

  starry: {
    eyes: 'star',
    mouth: 'smile',
    face: { scale: 1.06 },
    sound: 'chirp_up',
  },

  heart_eyes: {
    eyes: 'heart',
    mouth: 'smile',
    face: { scale: 1.04 },
    sound: 'chirp_up',
  },

  musical: {
    eyes: 'musicNote',
    mouth: 'smile',
    face: { tilt: 4 },
  },

  radio: {
    eyes: 'musicNote',
    mouth: 'radio_circle',
    face: { tilt: 2 },
  },

  dizzy: {
    eyes: 'whirl',
    mouth: 'wave',
    face: { tilt: -6 },
  },

  dead: {
    eyes: 'cross',
    mouth: 'line_flat',
    face: { scale: 0.9 },
  },

  // ── Game: countdown ──
  countdown_3: { eyes: 'three', face: { scale: 1.1 } },
  countdown_2: { eyes: 'two',   face: { scale: 1.1 } },
  countdown_1: { eyes: 'one',   face: { scale: 1.15 } },

  // ── Game: RPS moves ──
  rps_rock:     { eyes: 'rock',     face: { scale: 1.05 } },
  rps_paper:    { eyes: 'paper',    face: { scale: 1.05 } },
  rps_scissors: { eyes: 'scissors', face: { scale: 1.05 } },

  // ── Time display (digits set dynamically by time skill) ──

  // ── Idle fidgets ──

  idle_look: {
    eyes: 'calm',
    face: {},
    loop: [
      { dur: 500, face: { tilt: -10 } },
      { dur: 400, face: { tilt: 10 } },
      { dur: 300, face: {} },
    ],
  },
};
