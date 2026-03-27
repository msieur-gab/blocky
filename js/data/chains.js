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
      { behavior: 'surprise', dur: 300 },
      { behavior: 'excited',  dur: 400 },
      { behavior: 'happy',    dur: 600 },
    ],
  },

  child_laughed: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'happy',    dur: 400 },
      { behavior: 'silly',    dur: 600 },
    ],
  },

  love_reaction: {
    steps: [
      { behavior: 'surprise',   dur: 300 },
      { behavior: 'heart_eyes', dur: 2400 },
      { behavior: 'happy',      dur: 800 },
    ],
  },

  embarrassed_reaction: {
    steps: [
      { behavior: 'embarrassed', dur: 800 },
      { behavior: 'silly',       dur: 400 },
    ],
  },

  // ── Emotions ──

  child_sad: {
    steps: [
      { behavior: 'sad',  dur: 400 },
      { behavior: 'love', dur: 600 },
    ],
  },

  child_scared: {
    steps: [
      { behavior: 'scared', dur: 300 },
      { behavior: 'love',   dur: 500 },
    ],
  },

  child_angry: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'sad',      dur: 400 },
    ],
  },

  // ── Sensor reactions ──

  loud_noise: {
    steps: [
      { behavior: 'shocked',  dur: 120 },
      { behavior: 'scared',   dur: 300 },
      { behavior: 'curious',  dur: 500 },
    ],
  },

  picked_up: {
    steps: [
      { behavior: 'surprise', dur: 150 },
      { behavior: 'excited',  dur: 300 },
      { behavior: 'happy',    dur: 400 },
    ],
  },

  put_down: {
    steps: [
      { behavior: 'surprise', dur: 150 },
      { behavior: 'curious',  dur: 300 },
      { behavior: 'calm',     dur: 500 },
    ],
  },

  shaken: {
    steps: [
      { behavior: 'dizzy', dur: 600 },
      { behavior: 'silly', dur: 400 },
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
      { behavior: 'curious',   dur: 900 },
      { behavior: 'curious_b', dur: 600 },
      { behavior: 'curious',   dur: 500 },
    ],
  },

  thinking_reaction: {
    steps: [
      { behavior: 'thinking', dur: 1500 },
    ],
  },

  surprised_reaction: {
    steps: [
      { behavior: 'surprise', dur: 300 },
      { behavior: 'excited',  dur: 500 },
    ],
  },

  voice_detected: {
    steps: [
      { behavior: 'curious', dur: 300 },
    ],
  },

  // ── Face recognition ──

  face_recognized: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'happy',    dur: 600 },
    ],
  },

  face_unknown: {
    steps: [
      { behavior: 'curious',   dur: 400 },
      { behavior: 'curious_b', dur: 400 },
      { behavior: 'curious',   dur: 300 },
    ],
  },

  face_enrolled: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'starry',   dur: 500 },
      { behavior: 'happy',    dur: 600 },
    ],
  },

  // ── Music ──

  music_start: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'musical',  dur: 600 },
      { behavior: 'radio',    dur: 800 },
    ],
  },

  // Alias for radio skill compatibility
  music: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'musical',  dur: 600 },
      { behavior: 'radio',    dur: 800 },
    ],
  },

  // ── Game ──

  game_start: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'starry',   dur: 600 },
      { behavior: 'excited',  dur: 500 },
    ],
  },

  game_win: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'starry',   dur: 600 },
      { behavior: 'happy',    dur: 500 },
    ],
  },

  game_lose: {
    steps: [
      { behavior: 'shocked',    dur: 300 },
      { behavior: 'dizzy',      dur: 400 },
      { behavior: 'sad',        dur: 500 },
      { behavior: 'determined', dur: 600 },
      { behavior: 'excited',    dur: 400 },
    ],
  },

  game_tie: {
    steps: [
      { behavior: 'thinking',   dur: 400 },
      { behavior: 'determined', dur: 500 },
    ],
  },

  game_over_player: {
    steps: [
      { behavior: 'shocked',  dur: 400 },
      { behavior: 'angry',    dur: 600 },
      { behavior: 'annoyed',  dur: 500 },
      { behavior: 'sad',      dur: 600 },
      { behavior: 'surprise', dur: 300 },
      { behavior: 'starry',   dur: 600 },
      { behavior: 'happy',    dur: 600 },
    ],
  },

  game_over_blocky: {
    steps: [
      { behavior: 'surprise', dur: 200 },
      { behavior: 'starry',   dur: 500 },
      { behavior: 'excited',  dur: 500 },
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
      { behavior: 'bored',   dur: 2000 },
      { behavior: 'yawning', dur: 1200 },
      { behavior: 'sleepy',  dur: 800 },
    ],
  },
};
