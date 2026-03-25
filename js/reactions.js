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

  sleep: [
    { expr: 'yawn',      duration: 1000, sound: 'yawn_sound' },
    { expr: 'sleepy',    duration: 1200, sound: 'snore_cycle' },
  ],

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
    { expr: 'surprise',  duration: 200, sound: 'chirp_up' },
    { expr: 'love',      duration: 800, sound: 'hum_happy' },
    { expr: 'happy',     duration: 500 },
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
    { expr: 'excited',   duration: 300, sound: 'fanfare' },
    { expr: 'happy',     duration: 500, sound: 'laugh' },
    { expr: 'silly',     duration: 400, sound: 'babble_excited' },
  ],

  game_lose: [
    { expr: 'shocked',   duration: 200, sound: 'chirp_down' },
    { expr: 'sad',       duration: 400, sound: 'whimper' },
    { expr: 'determined',duration: 500, sound: 'grumble' },
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

  // ── Music ──

  music: [
    { expr: 'surprise',  duration: 200, sound: 'chirp_up' },
    { expr: 'musical',   duration: 600, sound: 'twinkle' },
    { expr: 'radio',     duration: 800, sound: 'hum_happy' },
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

// ── Idle behaviors ──
// Triggered by timers when no interaction is happening

const IDLES = [
  {
    name: 'look_around',
    sequence: [
      { expr: 'curious',    duration: 600 },
      { expr: 'calm',       duration: 400 },
    ],
    minInterval: 8000,
    maxInterval: 15000,
  },
  {
    name: 'blink_slow',
    sequence: [
      { expr: 'sleepy',     duration: 300 },
      { expr: 'calm',       duration: 200 },
    ],
    minInterval: 5000,
    maxInterval: 12000,
  },
  {
    name: 'sigh',
    sequence: [
      { expr: 'bored',      duration: 800 },
      { expr: 'calm',       duration: 400 },
    ],
    minInterval: 20000,
    maxInterval: 40000,
  },
  {
    name: 'self_amused',
    sequence: [
      { expr: 'thinking',   duration: 500 },
      { expr: 'silly',      duration: 400 },
      { expr: 'calm',       duration: 300 },
    ],
    minInterval: 25000,
    maxInterval: 50000,
  },
];

// ── Sequencer state ──

let currentSequence = null;
let sequenceIndex = 0;
let sequenceTimer = 0;
let currentTarget = resolve('calm');
let holdExpression = null;     // mood-based default to return to
let idleTimers = [];
let idlePaused = false;

// ── Public API ──

export function init() {
  scheduleIdles();
  bus.on('reaction:trigger', trigger);
}

export function trigger(name) {
  const seq = REACTIONS[name];
  if (!seq) return;

  currentSequence = seq;
  sequenceIndex = 0;
  sequenceTimer = 0;
  currentTarget = resolve(seq[0].expr);
  idlePaused = true;

  // Play sound for first keyframe
  if (seq[0].sound) playSound(seq[0].sound);

  bus.emit('reaction:started', name);
}

export function setMoodExpression(moodName) {
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
      // Sequence done — return to mood hold
      currentSequence = null;
      sequenceIndex = 0;
      idlePaused = false;

      if (holdExpression) {
        currentTarget = holdExpression;
      }

      bus.emit('reaction:ended');
    } else {
      const nextFrame = currentSequence[sequenceIndex];
      currentTarget = resolve(nextFrame.expr);
      if (nextFrame.sound) playSound(nextFrame.sound);
    }
  }
}

// ── Idle system ──

function scheduleIdles() {
  IDLES.forEach(idle => {
    const schedule = () => {
      const delay = idle.minInterval + Math.random() * (idle.maxInterval - idle.minInterval);
      const timer = setTimeout(() => {
        if (!idlePaused && !currentSequence) {
          currentSequence = idle.sequence;
          sequenceIndex = 0;
          sequenceTimer = 0;
          currentTarget = resolve(idle.sequence[0].expr);
        }
        schedule(); // reschedule
      }, delay);
      idleTimers.push(timer);
    };
    schedule();
  });
}

export function destroy() {
  idleTimers.forEach(t => clearTimeout(t));
  idleTimers = [];
}
