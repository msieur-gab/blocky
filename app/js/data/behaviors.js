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
//   jolt: number           — bounce on entering: + squash, − stretch (default 0.1 = 10 %)
//   habits: object         — what it does by itself while it lasts (optional):
//                              gaze: 'hold' | 'up' | 'down' | 'aside' | 'dart'   (default: wander)
//                              signs: ['blush' | 'question' | 'dots' | 'sparks']
//                              emit: { sign: 'heart' | 'z' | 'tear' | 'sweat' | 'puff', every: [min, max] ms }
//                              blink: false     wide-eyed, no blinking
//                              droop: true      lids sink, then it catches itself
//                              spin: number     symbol eyes turn, in turns per second
//                              wobble: true     the whole face rattles on entering
//   loop / chain frames may carry emit: '…' to let one sign go (a Z on each snore)
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
    jolt: 0.12,
    eyes: 'happy',
    mouth: 'smile',
    face: { scale: 1.02 },
  },

  sad: {
    habits: { gaze: 'down', emit: { sign: 'tear', every: [2500, 5000] } },
    eyes: { left: 'sad', right: 'sad' },
    mouth: 'frown',
    face: { y: 4, scale: 0.97 },
  },

  scared: {
    jolt: -0.14,
    habits: { gaze: 'dart' },
    eyes: 'scared',
    mouth: 'open_small',
    face: { scale: 0.90, y: -4 },
    gap: 480,
  },

  excited: {
    jolt: -0.1,
    eyes: 'excited',
    mouth: 'smile',
    face: { scale: 1.08 },
    gap: 440,
  },

  bored: {
    jolt: 0.05,
    habits: { gaze: 'down' },
    eyes: 'bored',
    face: { y: 10, scale: 0.96 },
  },

  angry: {
    jolt: 0.16,
    habits: { gaze: 'aside', emit: { sign: 'puff', every: [2800, 4800] } },
    eyes: { left: 'angry', right: 'angry' },
    mouth: 'line_down',
    face: { scale: 1.04 },
    gap: 360,
  },

  surprise: {
    jolt: -0.18,
    habits: { gaze: 'hold', blink: false },
    eyes: 'surprise',
    mouth: 'open_medium',
    face: { scale: 1.10, y: -4 },
    sound: 'chirp_up',
    gap: 460,
  },

  // ── Curiosity ──

  curious: {
    habits: { gaze: 'up', signs: ['question'] },
    eyes: { left: 'curious_l', right: 'curious_r' },
    face: { tilt: 5 },
  },

  curious_b: {
    habits: { gaze: 'up', signs: ['question'] },
    eyes: { left: 'curious_r', right: 'curious_l' },
    face: { tilt: -5 },
  },

  thinking: {
    habits: { gaze: 'up', signs: ['dots'] },
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
    habits: { signs: ['blush'] },
    eyes: { left: 'silly_l', right: 'silly_r' },
    mouth: 'smile_big',
    face: { tilt: -4, scale: 1.03 },
    gap: 420,
  },

  love: {
    habits: { signs: ['blush'], emit: { sign: 'heart', every: [900, 1800] } },
    eyes: 'love',
    mouth: 'three',
    face: { scale: 1.04 },
  },

  embarrassed: {
    habits: { gaze: 'down', signs: ['blush'] },
    eyes: 'embarrassed',
    mouth: 'zigzag',
    face: { scale: 0.95, y: 4 },
  },

  shocked: {
    jolt: -0.22,
    habits: { gaze: 'hold', blink: false },
    eyes: 'shocked',
    mouth: 'open_big',
    face: { scale: 1.12, y: -6 },
    gap: 380,
  },

  suspicious: {
    habits: { gaze: 'dart' },
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
    habits: { gaze: 'down', emit: { sign: 'sweat', every: [2500, 4500] } },
    eyes: { left: 'worried', right: 'worried' },
    mouth: 'frown_small',
    face: { scale: 0.96, y: 6 },
  },

  annoyed: {
    habits: { gaze: 'aside' },
    eyes: { left: 'annoyed', right: 'annoyed' },
    mouth: 'line_down',
    gap: 390,
  },

  sleepy: {
    jolt: 0.04,
    habits: { gaze: 'down', droop: true },
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
    jolt: 0.03,
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
    jolt: 0.02,
    habits: { gaze: 'hold', blink: false },
    eyes: 'asleep',
    face: { y: 8, scale: 0.95 },
  },

  sleeping: {
    jolt: 0,
    habits: { gaze: 'hold', blink: false },
    eyes: 'exhale',
    mouth: 'sleep_exhale',
    face: { y: 8, scale: 0.95 },
    loop: [
      { eyes: 'exhale', mouth: 'sleep_exhale', dur: 2500, sound: 'snore_exhale', emit: 'z', face: { y: 8, scale: 0.95 } },
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
    habits: { gaze: 'hold', blink: false },
    eyes: 'star',
    mouth: 'smile',
    face: { scale: 1.06 },
    sound: 'chirp_up',
  },

  heart_eyes: {
    habits: { gaze: 'hold', blink: false, emit: { sign: 'heart', every: [700, 1400] } },
    eyes: 'heart',
    mouth: 'three',
    face: { scale: 1.04 },
    sound: 'kiss',
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
    habits: { gaze: 'hold', blink: false, spin: 0.9, wobble: true, signs: ['sparks'] },
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
  countdown_3: { eyes: 'three', habits: { gaze: 'hold', blink: false }, face: { scale: 1.1 } },
  countdown_2: { eyes: 'two',   habits: { gaze: 'hold', blink: false }, face: { scale: 1.1 } },
  countdown_1: { eyes: 'one',   habits: { gaze: 'hold', blink: false }, face: { scale: 1.15 } },

  // ── Game: RPS moves ──
  rps_rock:     { eyes: 'rock',     habits: { gaze: 'hold', blink: false }, face: { scale: 1.05 } },
  rps_paper:    { eyes: 'paper',    habits: { gaze: 'hold', blink: false }, face: { scale: 1.05 } },
  rps_scissors: { eyes: 'scissors', habits: { gaze: 'hold', blink: false }, face: { scale: 1.05 } },

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
