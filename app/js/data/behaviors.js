// ══════════════════════════════════════════
// Behaviors Catalog
// A behavior = living state with optional internal loop
// References eyes, mouths, and sounds by name
//
// Format:
//   eyes: object | string  — the eye itself, as what differs from a plain pill:
//                              { h: 180, lidBot: 0.45 }                 both eyes
//                              { left: { … }, right: { … } }            one each (the right one is mirrored)
//                            or the name of a shared shape in eyes.js ('heart', 'drowsy', 'awake')
//                            fields: w h tilt lidTop lidBot slant … (see eyes.js DEFAULT)
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
    eyes: { h: 180, lidBot: 0.45 },
    mouth: 'smile',
    face: { scale: 1.02 },
  },

  sad: {
    habits: { gaze: 'down', emit: { sign: 'tear', every: [2500, 5000] } },
    eyes: { h: 170, tilt: 6, lidTop: 0.12, slant: -14 },
    mouth: 'frown',
    face: { y: 4, scale: 0.97 },
  },

  scared: {
    jolt: -0.14,
    habits: { gaze: 'dart' },
    eyes: { w: 95, h: 215, slant: -8 },
    mouth: 'open_small',
    face: { scale: 0.90, y: -4 },
    gap: 480,
  },

  excited: {
    jolt: -0.1,
    eyes: { w: 106, h: 205, lidBot: 0.22 },
    mouth: 'smile',
    face: { scale: 1.08 },
    gap: 440,
  },

  bored: {
    jolt: 0.05,
    habits: { gaze: 'down' },
    eyes: { h: 170, lidTop: 0.5 },
    face: { y: 10, scale: 0.96 },
  },

  angry: {
    jolt: 0.16,
    habits: { gaze: 'aside', emit: { sign: 'puff', every: [2800, 4800] } },
    eyes: { w: 108, h: 150, lidTop: 0.14, slant: 18 },
    mouth: 'line_down',
    face: { scale: 1.04 },
    gap: 360,
  },

  surprise: {
    jolt: -0.18,
    habits: { gaze: 'hold', blink: false },
    eyes: { w: 108, h: 228 },
    mouth: 'open_medium',
    face: { scale: 1.10, y: -4 },
    sound: 'chirp_up',
    gap: 460,
  },

  // ── Curiosity ──

  curious: {
    habits: { gaze: 'up', signs: ['question'] },
    eyes: { left: { h: 210, tilt: -5 }, right: { h: 168, tilt: 8, lidTop: 0.12 } },
    face: { tilt: 5 },
  },

  curious_b: {
    habits: { gaze: 'up', signs: ['question'] },
    eyes: { left: { h: 168, tilt: 8, lidTop: 0.12 }, right: { h: 210, tilt: -5 } },
    face: { tilt: -5 },
  },

  thinking: {
    habits: { gaze: 'up', signs: ['dots'] },
    eyes: { left: { h: 180, lidTop: 0.22 }, right: { h: 204, tilt: 5 } },
    mouth: 'line_small',
    face: { tilt: 8 },
  },

  attentive: {
    eyes: { left: { h: 195, tilt: 3 }, right: { h: 185, tilt: -5 } },
    face: {},
  },

  // ── Extended emotions ──

  silly: {
    habits: { signs: ['blush'] },
    eyes: { left: { h: 180, tilt: 10, lidBot: 0.32 }, right: { h: 160, tilt: -6, lidBot: 0.4 } },
    mouth: 'smile_big',
    face: { tilt: -4, scale: 1.03 },
    gap: 420,
  },

  love: {
    habits: { signs: ['blush'], emit: { sign: 'heart', every: [900, 1800] } },
    eyes: { h: 175, lidBot: 0.35 },
    mouth: 'three',
    face: { scale: 1.04 },
  },

  embarrassed: {
    habits: { gaze: 'down', signs: ['blush'] },
    eyes: { h: 150, lidTop: 0.15, lidBot: 0.4 },
    mouth: 'zigzag',
    face: { scale: 0.95, y: 4 },
  },

  shocked: {
    jolt: -0.22,
    habits: { gaze: 'hold', blink: false },
    eyes: { w: 114, h: 238 },
    mouth: 'open_big',
    face: { scale: 1.12, y: -6 },
    gap: 380,
  },

  suspicious: {
    habits: { gaze: 'dart' },
    eyes: { left: { h: 170, lidTop: 0.52, slant: 8 }, right: { h: 170, lidTop: 0.34, slant: 4 } },
    mouth: 'line_down',
    face: { tilt: -3 },
  },

  determined: {
    eyes: { h: 165, lidTop: 0.1, slant: 14 },
    mouth: 'line_flat',
    face: { scale: 1.06 },
    gap: 380,
  },

  worried: {
    habits: { gaze: 'down', emit: { sign: 'sweat', every: [2500, 4500] } },
    eyes: { h: 160, tilt: 4, slant: -12 },
    mouth: 'frown_small',
    face: { scale: 0.96, y: 6 },
  },

  annoyed: {
    habits: { gaze: 'aside' },
    eyes: { h: 155, lidTop: 0.45, slant: 10 },
    mouth: 'line_down',
    gap: 390,
  },

  sleepy: {
    jolt: 0.04,
    habits: { gaze: 'down', droop: true },
    eyes: { h: 180, lidTop: 0.48 },
    face: { y: 8, scale: 0.95 },
  },

  wink: {
    eyes: { left: { h: 130, lidBot: 0.5 }, right: 'awake' },
    mouth: 'smile',
    face: { tilt: -3 },
  },

  // ── Being stroked ──

  petted: {
    jolt: 0.08,
    habits: { gaze: 'hold', blink: false, signs: ['blush'], emit: { sign: 'heart', every: [700, 1300] } },
    eyes: { h: 150, lidBot: 0.6 },
    mouth: 'smile',
    face: { scale: 1.03, y: 4 },
    sound: 'hum_happy',
  },

  // ── Sleep ──

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
    eyes: { h: 130, lidTop: 0.2, lidBot: 0.25 },
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
