// ══════════════════════════════════════════
// Chains Catalog
// Sequences of behaviors — triggered by intent or time
//
// Two types:
//   Simple reaction — { steps: [...] }
//   Mode — { intro: [...], hold: 'behavior', outro: [...] }
//
// Each step: { behavior: string, dur: number (ms) }
// No dur = terminal (stay until interrupted)
// ══════════════════════════════════════════

export const catalog = {

  // ── Greetings / Social ──

  greet: {
    steps: [
      { behavior: 'surprise', dur: 300, sound: 'chirp_up' },
      { behavior: 'excited',  dur: 400, sound: 'babble_excited' },
      { behavior: 'happy',    dur: 600 },
    ],
  },

  child_laughed: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'chirp_up' },
      { behavior: 'happy',    dur: 400, sound: 'laugh' },
      { behavior: 'silly',    dur: 600, sound: 'giggle' },
    ],
  },

  love_reaction: {
    steps: [
      { behavior: 'surprise',   dur: 300, sound: 'chirp_up' },
      { behavior: 'heart_eyes', dur: 2400, sound: 'hum_happy' },
      { behavior: 'happy',      dur: 800 },
    ],
  },

  embarrassed_reaction: {
    steps: [
      { behavior: 'embarrassed', dur: 800, sound: 'fart_squeak' },
      { behavior: 'silly',       dur: 400, sound: 'giggle' },
    ],
  },

  // ── Emotions ──

  child_sad: {
    steps: [
      { behavior: 'sad',  dur: 400, sound: 'whimper' },
      { behavior: 'love', dur: 600, sound: 'hum_sad' },
    ],
  },

  child_scared: {
    steps: [
      { behavior: 'scared', dur: 300, sound: 'squeak' },
      { behavior: 'love',   dur: 500, sound: 'hum' },
    ],
  },

  child_angry: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'chirp_down' },
      { behavior: 'sad',      dur: 400, sound: 'whimper' },
    ],
  },

  // ── Sensor reactions ──

  loud_noise: {
    steps: [
      { behavior: 'shocked',  dur: 120, sound: 'squeak' },
      { behavior: 'scared',   dur: 300, sound: 'whimper' },
      { behavior: 'curious',  dur: 500 },
    ],
  },

  picked_up: {
    steps: [
      { behavior: 'surprise', dur: 150, sound: 'chirp_up' },
      { behavior: 'excited',  dur: 300, sound: 'babble_fast' },
      { behavior: 'happy',    dur: 400 },
    ],
  },

  put_down: {
    steps: [
      { behavior: 'surprise', dur: 150, sound: 'chirp_down' },
      { behavior: 'curious',  dur: 300 },
      { behavior: 'calm',     dur: 500, sound: 'hum' },
    ],
  },

  shaken: {
    steps: [
      { behavior: 'dizzy', dur: 600, sound: 'warble' },
      { behavior: 'silly', dur: 400, sound: 'giggle' },
    ],
  },

  // ── Sleep (mode with intro/hold/outro) ──

  fallAsleep: {
    intro: [
      { behavior: 'calm',    dur: 800 },
      { behavior: 'drowsy',  dur: 6000 },
      { behavior: 'asleep',  dur: 1200 },
    ],
    hold: 'sleeping',
    outro: [
      { behavior: 'drowsy',   dur: 2500 },
      { behavior: 'surprise', dur: 500 },
      { behavior: 'happy',    dur: 800 },
    ],
  },

  goodnight: {
    intro: [
      { behavior: 'happy',   dur: 400 },
      { behavior: 'drowsy',  dur: 4000 },
      { behavior: 'asleep',  dur: 1000 },
    ],
    hold: 'sleeping',
    outro: [
      { behavior: 'drowsy',   dur: 2500 },
      { behavior: 'surprise', dur: 500 },
      { behavior: 'happy',    dur: 800 },
    ],
  },

  // ── Attention / Curiosity ──

  attention: {
    steps: [
      { behavior: 'curious',   dur: 900, sound: 'chirp_short' },
      { behavior: 'curious_b', dur: 600 },
      { behavior: 'curious',   dur: 500, sound: 'chirp_short' },
    ],
  },

  thinking_reaction: {
    steps: [
      { behavior: 'thinking', dur: 1500, sound: 'babble_question' },
    ],
  },

  surprised_reaction: {
    steps: [
      { behavior: 'surprise', dur: 300, sound: 'boing' },
      { behavior: 'excited',  dur: 500, sound: 'chirp_up' },
    ],
  },

  voice_detected: {
    steps: [
      { behavior: 'curious', dur: 300, sound: 'chirp_short' },
    ],
  },

  // ── Face recognition ──

  face_recognized: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'chirp_up' },
      { behavior: 'happy',    dur: 600, sound: 'babble_fast' },
    ],
  },

  face_unknown: {
    steps: [
      { behavior: 'curious',   dur: 400, sound: 'babble_question' },
      { behavior: 'curious_b', dur: 400 },
      { behavior: 'curious',   dur: 300 },
    ],
  },

  face_enrolled: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'boing' },
      { behavior: 'starry',   dur: 500, sound: 'fanfare' },
      { behavior: 'happy',    dur: 600, sound: 'babble_excited' },
    ],
  },

  // ── Music ──

  music_start: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'chirp_up' },
      { behavior: 'musical',  dur: 600, sound: 'twinkle' },
      { behavior: 'radio',    dur: 800, sound: 'hum_happy' },
    ],
  },

  music: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'chirp_up' },
      { behavior: 'musical',  dur: 600, sound: 'twinkle' },
      { behavior: 'radio',    dur: 800, sound: 'hum_happy' },
    ],
  },

  // ── Game ──

  game_start: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'powerup' },
      { behavior: 'starry',   dur: 600, sound: 'fanfare' },
      { behavior: 'excited',  dur: 500, sound: 'babble_excited' },
    ],
  },

  game_win: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'fanfare' },
      { behavior: 'starry',   dur: 400, sound: 'win', face: { tilt: 15 } },
      { behavior: 'starry',   dur: 300, face: { tilt: -15 } },
      { behavior: 'starry',   dur: 300, face: { tilt: 12 } },
      { behavior: 'starry',   dur: 300, face: { tilt: -12 }, sound: 'laugh_big' },
      { behavior: 'happy',    dur: 500, sound: 'babble_excited' },
    ],
  },

  game_lose: {
    steps: [
      { behavior: 'shocked',    dur: 300, sound: 'squeak' },
      { behavior: 'dizzy',      dur: 400, sound: 'warble' },
      { behavior: 'sad',        dur: 500, sound: 'whimper' },
      { behavior: 'determined', dur: 600, sound: 'grumble' },
      { behavior: 'excited',    dur: 400, sound: 'babble_fast' },
    ],
  },

  game_tie: {
    steps: [
      { behavior: 'thinking',   dur: 400, sound: 'hum' },
      { behavior: 'determined', dur: 500, sound: 'babble_fast' },
    ],
  },

  game_over_player: {
    steps: [
      { behavior: 'shocked',  dur: 400, sound: 'squeak' },
      { behavior: 'angry',    dur: 600, sound: 'grumble' },
      { behavior: 'annoyed',  dur: 500 },
      { behavior: 'sad',      dur: 600, sound: 'whimper' },
      { behavior: 'surprise', dur: 300, sound: 'powerup' },
      { behavior: 'starry',   dur: 400, sound: 'fanfare', face: { tilt: 12 } },
      { behavior: 'starry',   dur: 300, face: { tilt: -12 } },
      { behavior: 'starry',   dur: 300, sound: 'win', face: { tilt: 15 } },
      { behavior: 'starry',   dur: 300, face: { tilt: -15 } },
      { behavior: 'happy',    dur: 600, sound: 'laugh_big' },
    ],
  },

  game_over_blocky: {
    steps: [
      { behavior: 'surprise', dur: 200, sound: 'powerup' },
      { behavior: 'starry',   dur: 500, sound: 'fanfare' },
      { behavior: 'starry',   dur: 300, sound: 'win', face: { tilt: 20 } },
      { behavior: 'starry',   dur: 300, face: { tilt: -20 } },
      { behavior: 'starry',   dur: 300, face: { tilt: 15 }, sound: 'laugh_big' },
      { behavior: 'starry',   dur: 300, face: { tilt: -15 } },
      { behavior: 'excited',  dur: 500, sound: 'babble_excited' },
      { behavior: 'happy',    dur: 600 },
    ],
  },

  // ── Magic 8-ball ──

  magic8_thinking: {
    steps: [
      { behavior: 'thinking', dur: 1300 },
    ],
  },

  // ── Idle (triggered by presence skill timers) ──

  long_silence: {
    steps: [
      { behavior: 'bored',   dur: 2000, sound: 'grumble' },
      { behavior: 'yawning', dur: 1200, sound: 'yawn_sound' },
      { behavior: 'sleepy',  dur: 800 },
    ],
  },
};
