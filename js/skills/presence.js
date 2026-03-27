// ══════════════════════════════════════════
// Presence Skill — ami.b's idle personality
// Default fallback for all unhandled intents
// Manages mood, agreement, emotions, idle life
// ══════════════════════════════════════════

import { HEAD, compose } from '../reactions.js';

// ── Intent → mood + reaction mapping ──

const INTENT_MAP = {
  greet:          { reaction: 'greet',         mood: 'happy' },
  sleep:          { reaction: 'fallAsleep',     mood: 'asleep' },
  bored:          { reaction: 'long_silence',  mood: 'bored' },
  story:          { reaction: 'thinking',      mood: 'curious' },
  emotion_happy:  { reaction: 'child_laughed', mood: 'happy' },
  emotion_sad:    { reaction: 'child_sad',     mood: 'sad' },
  emotion_scared: { reaction: 'child_scared',  mood: 'scared' },
  emotion_angry:  { reaction: 'child_angry',   mood: 'angry' },
  question:       { reaction: 'curious_loop',  mood: 'curious' },
  love:           { reaction: 'love',          mood: 'happy' },
  secret:         { reaction: 'embarrassed',   mood: 'silly' },
  attention:      { reaction: 'attention',     mood: 'curious' },
  agree:          { reaction: 'agree',         mood: 'calm' },
  agree_strong:   { reaction: 'agree_strong',  mood: 'happy' },
  disagree:       { reaction: 'disagree',      mood: 'calm' },
  disagree_strong:{ reaction: 'disagree_strong',mood: 'calm' },
  negation:       { reaction: null,            mood: 'calm' },
  stop:           { reaction: null,            mood: 'calm' },
};

// ── Personality timers ──

let ctx = null;
let idleTimer = null;
let restartTimer = null;
let asleep = false;

const TIER1_MIN = 6000;
const TIER1_MAX = 15000;
const SLEEP_THRESHOLD = 300; // 5 min silence → fall asleep

const FIDGETS = ['idle_look_around', 'idle_chirp', 'idle_blink_slow', 'idle_hum', 'idle_peek', 'idle_peek_r', 'idle_wiggle'];
const BORED = ['idle_sigh', 'idle_self_amused', 'idle_babble', 'idle_fart', 'idle_burp', 'idle_hiccup', 'idle_belly', 'idle_sneeze'];
const SLEEPY = ['idle_yawn', 'idle_doze'];

function pick(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
function rand(min, max) { return min + Math.random() * (max - min); }

function scheduleIdle() {
  if (asleep) return;

  const silence = ctx?.state?.silenceDuration || 0;
  let pool, delay;

  if (silence > 120) { pool = SLEEPY; delay = rand(8000, 15000); }
  else if (silence > 25) { pool = BORED; delay = rand(10000, 20000); }
  else { pool = FIDGETS; delay = rand(TIER1_MIN, TIER1_MAX); }

  idleTimer = setTimeout(() => {
    if (asleep) return;

    if (ctx?.state?.silenceDuration > SLEEP_THRESHOLD) {
      asleep = true;
      ctx.face.react('fallAsleep');
      ctx.face.mood('asleep');
      // After fallAsleep finishes, start breathing loop
      setTimeout(() => { if (asleep) ctx.face.react('sleep'); }, 3500);
      ctx.memory.log({ category: 'personality', data: { event: 'fell_asleep' } });
      return;
    }

    ctx.face.react(pick(pool));
    scheduleIdle();
  }, delay);
}

function resetIdle() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }

  if (asleep) {
    asleep = false;
    console.log('[presence] Woke up');
  }

  restartTimer = setTimeout(() => {
    restartTimer = null;
    scheduleIdle();
  }, TIER1_MIN);
}

// ══════════════════════════════════════════
// Skill manifest
// ══════════════════════════════════════════

export default {
  id: 'presence',
  name: 'Presence',

  // Presence handles ALL unmatched intents as fallback
  intents: Object.keys(INTENT_MAP),

  reactions: {
    // Idle reactions — head movements + expressions composed

    // Fidgets: alive, attentive
    idle_look_around: compose('wonder', ['curious','curious','curious','curious','calm'], { 0: 'chirp_short' }),
    idle_chirp:       compose('perk', 'surprise', { 0: 'chirp_up' }),
    idle_peek:        compose('peek_left', 'curious', { 0: 'chirp_short' }),
    idle_peek_r:      compose('peek_right', 'curious'),
    idle_blink_slow: [
      { expr: 'sleepy',   duration: 400 },
      { expr: 'calm',     duration: 300 },
    ],
    idle_hum:         compose('bob', 'calm', { 0: 'hum' }),
    idle_wiggle:      compose('wiggle', 'happy', { 0: 'chirp_short' }),

    // Bored: character, self-entertainment
    idle_sigh:        compose('droop', 'bored', { 0: 'grumble' }),
    idle_self_amused: [
      ...compose('tilt_left', ['thinking','thinking','silly'], { 0: 'babble_question' }),
      { expr: 'calm', duration: 400, sound: 'giggle' },
    ],
    idle_babble:      compose('wiggle', ['curious','happy','happy','calm','calm'], { 0: 'babble_slow' }),
    idle_fart: [
      { expr: 'calm',     duration: 300 },
      ...compose('startle', 'surprise', { 0: 'fart_squeak' }),
      { expr: 'embarrassed', duration: 600 },
      { expr: 'silly',    duration: 400, sound: 'giggle' },
    ],
    idle_burp: [
      ...compose('startle', 'surprise', { 0: 'burp' }),
      { expr: 'embarrassed', duration: 500 },
      { expr: 'calm',     duration: 400 },
    ],
    idle_hiccup: [
      ...compose('startle', 'surprise', { 0: 'hiccup' }),
      { expr: 'calm',     duration: 300 },
      ...compose('startle', 'surprise', { 0: 'hiccup_double' }),
      { expr: 'annoyed',  duration: 400 },
    ],
    idle_belly: [
      ...compose('recoil', 'surprise', { 0: 'belly_rumble' }),
      { expr: 'embarrassed', duration: 500 },
      { expr: 'calm',     duration: 300 },
    ],
    idle_sneeze: [
      { expr: 'thinking', duration: 600 },
      ...compose('recoil', ['shocked','dizzy','calm'], { 0: 'sneeze' }),
    ],

    // Sleepy: winding down
    idle_yawn:        compose('droop', ['yawn','yawn','drowsy'], { 0: 'yawn_sound' }),
    idle_doze: [
      { expr: 'drowsy',   duration: 1500, sound: 'hum_sad' },
      ...compose('droop', ['yawn','drowsy','drowsy'], { 0: 'yawn_sound' }),
    ],
  },

  activate(context) {
    ctx = context;
    scheduleIdle();
  },

  deactivate() {
    if (idleTimer) clearTimeout(idleTimer);
    if (restartTimer) clearTimeout(restartTimer);
    idleTimer = null;
    restartTimer = null;
    ctx = null;
  },

  handleIntent(intent, entities) {
    resetIdle();

    const mapping = INTENT_MAP[intent];
    if (!mapping) return false;

    ctx.face.mood(mapping.mood);
    if (mapping.reaction) ctx.face.react(mapping.reaction);

    // Sleep intent — start breathing loop after fallAsleep finishes
    if (intent === 'sleep') {
      asleep = true;
      setTimeout(() => { if (asleep) ctx.face.react('sleep'); }, 3500);
    }

    // Log interaction
    ctx.memory.log({ category: 'interaction', data: { intent, mood: mapping.mood } });

    return true;
  },
};
