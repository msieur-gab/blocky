// ══════════════════════════════════════════
// Reaction Sequencer
// Event → multi-beat expression sequences
// ══════════════════════════════════════════

import { resolve } from './expressions.js';
import { bus } from './utils/events.js';
import { play as playSound } from './services/voice.js';
import { isRadioPlaying } from './face.js';

// ── Reaction definitions ──
// Each reaction is an array of keyframes: { expr, duration, ease? }
// Last keyframe holds until next reaction or mood takes over

const REACTIONS = {
  // ── Command-triggered ──

  greet: [
    { expr: 'surprise',  duration: 250, sound: 'chirp_up' },
    { expr: 'excited',   duration: 400, sound: 'babble_excited' },
    { expr: 'happy',     duration: 600 },
  ],

  goodnight: [
    { expr: 'happy',     duration: 400, sound: 'hum' },
    { expr: 'sleepy',    duration: 800, sound: 'hum_sad' },
  ],

  sleep: {
    loop: true,
    frames: [
      { expr: 'yawn',      duration: 1500, sound: 'yawn_sound' },
      { expr: 'sleepy',    duration: 3200, sound: 'snore_cycle' },
      { expr: 'sleepy',    duration: 3200, sound: 'snore_cycle' },
    ],
  },

  game_start: [
    { expr: 'surprise',  duration: 200, sound: 'powerup' },
    { expr: 'starry',    duration: 600, sound: 'fanfare' },
    { expr: 'excited',   duration: 500, sound: 'babble_excited' },
  ],

  attention: [
    { expr: 'look_bl',   duration: 500, sound: 'chirp_short' },
    { expr: 'look_tl',   duration: 400 },
    { expr: 'look_tr',   duration: 450, sound: 'chirp_short' },
    { expr: 'look_br',   duration: 400 },
    { expr: 'idle',      duration: 600 },
  ],

  surprised: [
    { expr: 'surprise',  duration: 300, sound: 'boing' },
    { expr: 'excited',   duration: 500, sound: 'chirp_up' },
  ],

  love: [
    { expr: 'surprise',  duration: 300, sound: 'chirp_up' },
    { expr: 'love',      duration: 2400, sound: 'hum_happy' },
    { expr: 'happy',     duration: 800 },
  ],

  child_laughed: [
    { expr: 'surprise',  duration: 200, sound: 'chirp_up' },
    { expr: 'happy',     duration: 400, sound: 'laugh' },
    { expr: 'silly',     duration: 600, sound: 'giggle' },
  ],

  // ── Sensor-triggered ──

  loud_noise: [
    { expr: 'shocked',   duration: 120, sound: 'squeak' },
    { expr: 'scared',    duration: 300, sound: 'whimper' },
    { expr: 'curious',   duration: 500 },
  ],

  picked_up: [
    { expr: 'surprise',  duration: 150, sound: 'chirp_up' },
    { expr: 'excited',   duration: 300, sound: 'babble_fast' },
    { expr: 'happy',     duration: 400 },
  ],

  put_down: [
    { expr: 'surprise',  duration: 150, sound: 'chirp_down' },
    { expr: 'curious',   duration: 300 },
    { expr: 'calm',      duration: 500, sound: 'hum' },
  ],

  shaken: [
    { expr: 'dizzy',     duration: 600, sound: 'warble' },
    { expr: 'silly',     duration: 400, sound: 'giggle' },
  ],

  long_silence: [
    { expr: 'bored',     duration: 2000, sound: 'grumble' },
    { expr: 'yawn',      duration: 1200, sound: 'yawn_sound' },
    { expr: 'sleepy',    duration: 800 },
  ],

  voice_detected: [
    { expr: 'curious',   duration: 300, sound: 'chirp_short' },
  ],

  child_sad: [
    { expr: 'sad',       duration: 400, sound: 'whimper' },
    { expr: 'love',      duration: 600, sound: 'hum_sad' },
  ],

  child_scared: [
    { expr: 'scared',    duration: 300, sound: 'squeak' },
    { expr: 'love',      duration: 500, sound: 'hum' },
  ],

  child_angry: [
    { expr: 'surprise',  duration: 200, sound: 'chirp_down' },
    { expr: 'sad',       duration: 400, sound: 'whimper' },
  ],

  game_win: [
    { expr: 'surprise',  duration: 200, sound: 'fanfare' },
    { expr: 'starry',    duration: 400, sound: 'win' },
    { expr: 'starry',    duration: 300, tilt: 15 },
    { expr: 'starry',    duration: 300, tilt: -15 },
    { expr: 'starry',    duration: 300, tilt: 12 },
    { expr: 'starry',    duration: 300, tilt: -12, sound: 'laugh_big' },
    { expr: 'happy',     duration: 500, sound: 'babble_excited' },
  ],

  game_lose: [
    { expr: 'shocked',    duration: 300, sound: 'squeak' },
    { expr: 'dizzy',      duration: 400, tilt: 8, sound: 'warble' },
    { expr: 'sad',        duration: 500, sound: 'whimper' },
    { expr: 'determined', duration: 600, sound: 'grumble' },
    { expr: 'excited',    duration: 400, sound: 'babble_fast' },
  ],

  thinking: [
    { expr: 'thinking',  duration: 1500, sound: 'babble_question' },
  ],

  curious_loop: [
    { expr: 'curious',   duration: 900, sound: 'babble_question' },
    { expr: 'curious_b', duration: 600 },
    { expr: 'curious',   duration: 1100, sound: 'chirp_short' },
    { expr: 'curious_b', duration: 700 },
    { expr: 'curious',   duration: 500 },
  ],

  embarrassed: [
    { expr: 'embarrassed', duration: 800, sound: 'fart_squeak' },
    { expr: 'silly',      duration: 400, sound: 'giggle' },
  ],

  // ── Agreement / Disagreement ──

  // Slight nod — "mhm"
  agree: [
    { expr: 'calm',    duration: 200, y: -3 },
    { expr: 'calm',    duration: 200, y: 4, sound: 'chirp_short' },
    { expr: 'calm',    duration: 200, y: -2 },
    { expr: 'calm',    duration: 200, y: 3 },
    { expr: 'calm',    duration: 300 },
  ],

  // Enthusiastic nod — "YES!"
  agree_strong: [
    { expr: 'happy',   duration: 150, y: -5, sound: 'chirp_up' },
    { expr: 'happy',   duration: 150, y: 6 },
    { expr: 'happy',   duration: 150, y: -5 },
    { expr: 'happy',   duration: 150, y: 6, sound: 'chirp_up' },
    { expr: 'happy',   duration: 150, y: -4 },
    { expr: 'happy',   duration: 150, y: 5 },
    { expr: 'excited', duration: 150, y: -3 },
    { expr: 'excited', duration: 150, y: 4, sound: 'babble_excited' },
    { expr: 'happy',   duration: 400 },
  ],

  // Slight head shake — "nah"
  disagree: [
    { expr: 'calm',    duration: 180, skewX: 0.4 },
    { expr: 'calm',    duration: 180, skewX: -0.4, sound: 'hum' },
    { expr: 'calm',    duration: 180, skewX: 0.3 },
    { expr: 'calm',    duration: 180, skewX: -0.3 },
    { expr: 'calm',    duration: 300 },
  ],

  // Strong head shake — "NO!"
  disagree_strong: [
    { expr: 'angry',   duration: 130, skewX: 0.7, sound: 'grumble' },
    { expr: 'angry',   duration: 130, skewX: -0.7 },
    { expr: 'angry',   duration: 130, skewX: 0.6 },
    { expr: 'angry',   duration: 130, skewX: -0.6 },
    { expr: 'angry',   duration: 130, skewX: 0.5 },
    { expr: 'angry',   duration: 130, skewX: -0.5, sound: 'grumble' },
    { expr: 'determined', duration: 400 },
  ],

  // Hesitant — "ehh... I guess"
  agree_hesitant: [
    { expr: 'thinking', duration: 600, sound: 'hum', tilt: 5 },
    { expr: 'calm',     duration: 200, y: -2 },
    { expr: 'calm',     duration: 200, y: 3 },
    { expr: 'calm',     duration: 300, sound: 'chirp_short' },
  ],

  // ── Music ──

  music: [
    { expr: 'surprise',  duration: 200, sound: 'chirp_up' },
    { expr: 'musical',   duration: 600, sound: 'twinkle' },
    { expr: 'radio',     duration: 800, sound: 'hum_happy' },
  ],

  // ── Game ──

  game_tie: [
    { expr: 'thinking',   duration: 400, sound: 'hum' },
    { expr: 'determined', duration: 500, sound: 'babble_fast' },
  ],

  // Kid wins the whole game — Blocky is grumpy, then celebrates the kid
  game_over_player: [
    { expr: 'shocked',    duration: 400, sound: 'squeak' },
    { expr: 'angry',      duration: 600, sound: 'grumble' },
    { expr: 'annoyed',    duration: 500, tilt: -5 },
    { expr: 'sad',        duration: 600, sound: 'whimper' },
    { expr: 'surprise',   duration: 300, sound: 'powerup' },
    { expr: 'starry',     duration: 400, sound: 'fanfare', tilt: 12 },
    { expr: 'starry',     duration: 300, tilt: -12 },
    { expr: 'starry',     duration: 300, tilt: 15, sound: 'win' },
    { expr: 'starry',     duration: 300, tilt: -15 },
    { expr: 'starry',     duration: 300, tilt: 10 },
    { expr: 'happy',      duration: 600, sound: 'laugh_big' },
  ],

  // Blocky wins the whole game — full celebration
  game_over_blocky: [
    { expr: 'surprise',   duration: 200, sound: 'powerup' },
    { expr: 'starry',     duration: 500, sound: 'fanfare' },
    { expr: 'starry',     duration: 300, tilt: 20, sound: 'win' },
    { expr: 'starry',     duration: 300, tilt: -20 },
    { expr: 'starry',     duration: 300, tilt: 15 },
    { expr: 'starry',     duration: 300, tilt: -15, sound: 'laugh_big' },
    { expr: 'starry',     duration: 300, tilt: 10 },
    { expr: 'starry',     duration: 300, tilt: -10 },
    { expr: 'excited',    duration: 500, sound: 'babble_excited' },
    { expr: 'happy',      duration: 600 },
  ],

  // ── Face-triggered ──

  face_recognized: [
    { expr: 'surprise',  duration: 200, sound: 'chirp_up' },
    { expr: 'happy',     duration: 600, sound: 'babble_fast' },
  ],

  face_unknown: [
    { expr: 'curious',   duration: 400, sound: 'babble_question' },
    { expr: 'curious_b', duration: 400 },
    { expr: 'curious',   duration: 300 },
  ],

  face_enrolled: [
    { expr: 'surprise',  duration: 200, sound: 'boing' },
    { expr: 'starry',    duration: 500, sound: 'fanfare' },
    { expr: 'happy',     duration: 600, sound: 'babble_excited' },
  ],
};

// Idle behaviors now live in skills/presence.js

// ── Sequencer state ──

let currentSequence = null;
let currentLoop = false;       // does current sequence loop?
let sequenceIndex = 0;
let sequenceTimer = 0;
let currentTarget = resolve('calm');
let holdExpression = null;     // mood-based default to return to
let gameOverride = null;       // game directly sets expression, bypasses mood
// idleTimers removed — idle behaviors now in skills/presence.js

// ── Public API ──

export function init() {
  // Push all built-in reactions to face-api
  bus.emit('reactions:register', REACTIONS);

  bus.on('reaction:trigger', trigger);

  // Allow other modules to register new reactions dynamically
  bus.on('reactions:register', (newReactions) => {
    Object.assign(REACTIONS, newReactions);
    console.log(`[reactions] Registered ${Object.keys(newReactions).length} new reactions`);
  });

  // Game expression override — bypasses mood and idle (by preset name)
  bus.on('expression:override', (exprName) => {
    if (exprName) {
      gameOverride = resolve(exprName);
      currentTarget = gameOverride;
      currentSequence = null;
      idlePaused = true;
    } else {
      gameOverride = null;
      idlePaused = false;
    }
  });

  // Raw expression override — bypasses mood with a full expression object (for time, etc.)
  bus.on('expression:raw', (exprObj) => {
    if (exprObj) {
      gameOverride = exprObj;
      currentTarget = exprObj;
      currentSequence = null;
      idlePaused = true;
    } else {
      gameOverride = null;
      idlePaused = false;
    }
  });
}

export function trigger(name) {
  const raw = REACTIONS[name];
  if (!raw) return;

  // Support both array format and { loop, frames } format
  const seq = Array.isArray(raw) ? raw : raw.frames;
  currentLoop = Array.isArray(raw) ? false : !!raw.loop;

  if (!seq || seq.length === 0) return;

  currentSequence = seq;
  sequenceIndex = 0;
  sequenceTimer = 0;
  currentTarget = applyKeyframe(seq[0]);
  idlePaused = true;

  if (seq[0].sound) playSound(seq[0].sound);
  bus.emit('reaction:started', name);
}

// Resolve expression + apply keyframe overrides (tilt, scale, x, y, skewX...)
function applyKeyframe(frame) {
  const resolved = resolve(frame.expr);
  const overrides = {};
  if (frame.tilt !== undefined) overrides.tilt = frame.tilt;
  if (frame.scale !== undefined) overrides.scale = frame.scale;
  if (frame.x !== undefined) overrides.x = frame.x;
  if (frame.y !== undefined) overrides.y = frame.y;
  if (frame.skewX !== undefined) overrides.skewX = frame.skewX;

  if (Object.keys(overrides).length > 0) {
    return { ...resolved, face: { ...resolved.face, ...overrides } };
  }
  return resolved;
}

export function setMoodExpression(moodName) {
  // Game override takes priority
  if (gameOverride) return;

  // Radio mode: lock the hold expression to 'radio' face
  holdExpression = isRadioPlaying() ? resolve('radio') : resolve(moodName);
  // Only apply if no reaction is playing
  if (!currentSequence) {
    currentTarget = holdExpression;
  }
}

export function getTarget() {
  return currentTarget;
}

export function update(dt) {
  if (!currentSequence) return;

  sequenceTimer += dt * 1000; // convert to ms
  const frame = currentSequence[sequenceIndex];

  if (sequenceTimer >= frame.duration) {
    sequenceTimer = 0;
    sequenceIndex++;

    if (sequenceIndex >= currentSequence.length) {
      if (currentLoop) {
        // Loop: restart from beginning
        sequenceIndex = 0;
        const first = currentSequence[0];
        currentTarget = applyKeyframe(first);
        if (first.sound) playSound(first.sound);
        return;
      }

      // Sequence done — return to mood hold
      currentSequence = null;
      currentLoop = false;
      sequenceIndex = 0;
      idlePaused = false;

      if (holdExpression) {
        currentTarget = holdExpression;
      }

      bus.emit('reaction:ended');
    } else {
      const nextFrame = currentSequence[sequenceIndex];
      currentTarget = applyKeyframe(nextFrame);
      if (nextFrame.sound) playSound(nextFrame.sound);
    }
  }
}

// Legacy — kept for compatibility during migration
export function destroy() {}
