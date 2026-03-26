// ══════════════════════════════════════════
// Personality — Blocky's autonomous life
// Watches idle time and triggers behaviors
// Blocky is alive even when nobody's talking
// ══════════════════════════════════════════

import { bus } from './utils/events.js';
import * as companion from './companion.js';

// ── Behavior pools by idle tier ──

// Tier 1: Restless (5-15s idle) — small fidgets
const FIDGETS = [
  'idle_look_around',
  'idle_chirp',
  'idle_blink_slow',
  'idle_hum',
];

// Tier 2: Bored (30-60s idle) — bigger behaviors
const BORED = [
  'idle_sigh',
  'idle_self_amused',
  'idle_babble',
  'idle_fart',
  'idle_burp',
  'idle_hiccup',
  'idle_belly',
  'idle_sneeze',
];

// Tier 3: Sleepy (2-5min idle) — winding down
const SLEEPY = [
  'idle_yawn',
  'idle_doze',
];

// ── Reactions for idle behaviors ──

export const IDLE_REACTIONS = {
  // Tier 1: Fidgets
  idle_look_around: [
    { expr: 'look_bl',  duration: 500, sound: 'chirp_short' },
    { expr: 'look_tr',  duration: 400 },
    { expr: 'curious',  duration: 300 },
    { expr: 'calm',     duration: 400 },
  ],
  idle_chirp: [
    { expr: 'surprise', duration: 200, sound: 'chirp_up' },
    { expr: 'calm',     duration: 500 },
  ],
  idle_blink_slow: [
    { expr: 'sleepy',   duration: 400 },
    { expr: 'calm',     duration: 300 },
  ],
  idle_hum: [
    { expr: 'calm',     duration: 800, sound: 'hum' },
  ],

  // Tier 2: Bored behaviors
  idle_sigh: [
    { expr: 'bored',    duration: 1000, sound: 'grumble' },
    { expr: 'calm',     duration: 500 },
  ],
  idle_self_amused: [
    { expr: 'thinking', duration: 600, sound: 'babble_question' },
    { expr: 'silly',    duration: 500, sound: 'giggle' },
    { expr: 'calm',     duration: 400 },
  ],
  idle_babble: [
    { expr: 'curious',  duration: 300, sound: 'babble_slow' },
    { expr: 'happy',    duration: 400 },
    { expr: 'calm',     duration: 300 },
  ],
  idle_fart: [
    { expr: 'calm',     duration: 300 },
    { expr: 'surprise', duration: 200, sound: 'fart_squeak' },
    { expr: 'embarrassed', duration: 600 },
    { expr: 'silly',    duration: 400, sound: 'giggle' },
    { expr: 'calm',     duration: 300 },
  ],
  idle_burp: [
    { expr: 'surprise', duration: 150, sound: 'burp' },
    { expr: 'embarrassed', duration: 500 },
    { expr: 'calm',     duration: 400 },
  ],
  idle_hiccup: [
    { expr: 'surprise', duration: 100, sound: 'hiccup' },
    { expr: 'calm',     duration: 300 },
    { expr: 'surprise', duration: 100, sound: 'hiccup_double' },
    { expr: 'annoyed',  duration: 400 },
    { expr: 'calm',     duration: 300 },
  ],
  idle_belly: [
    { expr: 'surprise', duration: 200, sound: 'belly_rumble' },
    { expr: 'embarrassed', duration: 500 },
    { expr: 'calm',     duration: 300 },
  ],
  idle_sneeze: [
    { expr: 'thinking', duration: 600 },
    { expr: 'shocked',  duration: 150, sound: 'sneeze' },
    { expr: 'dizzy',    duration: 400, tilt: 5 },
    { expr: 'calm',     duration: 400 },
  ],

  // Tier 3: Sleepy
  idle_yawn: [
    { expr: 'yawn',     duration: 1200, sound: 'yawn_sound' },
    { expr: 'sleepy',   duration: 800 },
    { expr: 'calm',     duration: 500 },
  ],
  idle_doze: [
    { expr: 'sleepy',   duration: 1500, sound: 'hum_sad' },
    { expr: 'yawn',     duration: 1000, sound: 'yawn_sound' },
    { expr: 'sleepy',   duration: 2000 },
  ],
};

// ── Timing ──

const TIER1_MIN = 6000;     // first fidget after 6s
const TIER1_MAX = 15000;
const TIER2_MIN = 30000;    // bored behaviors after 30s
const TIER2_MAX = 60000;
const TIER3_THRESHOLD = 120; // start getting sleepy after 2 min (seconds)
const SLEEP_THRESHOLD = 300; // fall asleep after 5 min (seconds)

let timer = null;       // current scheduled behavior
let restartTimer = null; // restart delay after interaction
let active = false;
let asleep = false;

// ── Pick random from pool ──

function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function randomDelay(min, max) {
  return min + Math.random() * (max - min);
}

// ── Schedule next behavior ──

function scheduleNext() {
  if (!active || asleep) return;

  const silence = companion.state.silenceDuration;
  const mode = companion.state.mode;

  // Don't interrupt games, music, or look mode
  if (mode !== 'presence') {
    timer = setTimeout(scheduleNext, 3000);
    return;
  }

  let pool, delay;

  if (silence > TIER3_THRESHOLD) {
    // Tier 3: Sleepy
    pool = SLEEPY;
    delay = randomDelay(8000, 15000);
  } else if (silence > 25) {
    // Tier 2: Bored
    pool = BORED;
    delay = randomDelay(TIER2_MIN / 3, TIER2_MAX / 3);
  } else {
    // Tier 1: Fidgets
    pool = FIDGETS;
    delay = randomDelay(TIER1_MIN, TIER1_MAX);
  }

  timer = setTimeout(() => {
    // Don't fire if something else is happening
    if (companion.state.mode !== 'presence') {
      scheduleNext();
      return;
    }

    // Fall asleep after long silence
    if (companion.state.silenceDuration > SLEEP_THRESHOLD) {
      asleep = true;
      bus.emit('reaction:trigger', 'sleep');
      companion.state.mood = 'sleepy';
      console.log('[personality] Blocky fell asleep');
      // Don't schedule more — sleep loop handles itself
      // Wakes up on next interaction (resetTimer)
      return;
    }

    const behavior = pick(pool);
    bus.emit('reaction:trigger', behavior);

    scheduleNext();
  }, delay);
}

// ── Public API ──

export function init() {
  active = true;

  // Register idle reactions into the reaction system
  bus.emit('reactions:register', IDLE_REACTIONS);

  // Reset timer when interaction happens
  bus.on('intent:classified', () => {
    resetTimer();
  });
  bus.on('face:recognized', () => {
    resetTimer();
  });
  bus.on('gesture:detected', () => {
    resetTimer();
  });

  scheduleNext();
  console.log('[personality] Blocky is alive');
}

function resetTimer() {
  // Clear both timers — no parallel chains
  if (timer) { clearTimeout(timer); timer = null; }
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }

  // Wake up if asleep
  if (asleep) {
    asleep = false;
    console.log('[personality] Blocky woke up');
  }

  // Single restart — only one pending scheduleNext at a time
  restartTimer = setTimeout(() => {
    restartTimer = null;
    if (active && !asleep) scheduleNext();
  }, TIER1_MIN);
}

export function stop() {
  active = false;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}
