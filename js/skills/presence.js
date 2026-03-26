// ══════════════════════════════════════════
// Presence Skill — ami.b's idle personality
// Default fallback for all unhandled intents
// Manages mood, agreement, emotions, idle life
// ══════════════════════════════════════════

// ── Intent → mood + reaction mapping ──

const INTENT_MAP = {
  greet:          { reaction: 'greet',         mood: 'happy' },
  sleep:          { reaction: 'sleep',         mood: 'sleepy' },
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
  disagree_strong:{ reaction: 'disagree_strong',mood: 'angry' },
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

const FIDGETS = ['idle_look_around', 'idle_chirp', 'idle_blink_slow', 'idle_hum'];
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
      ctx.face.react('sleep');
      ctx.face.mood('sleepy');
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
    // Idle reactions
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

    // Log interaction
    ctx.memory.log({ category: 'interaction', data: { intent, mood: mapping.mood } });

    return true;
  },
};
