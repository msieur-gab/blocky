// ══════════════════════════════════════════
// Presence Skill — ami.b's idle personality
// Default fallback for all unhandled intents
// Manages mood, agreement, emotions, idle life
// ══════════════════════════════════════════

// ── Intent → chain + ambient mapping ──

const INTENT_MAP = {
  greet:          { chain: 'greet',              ambient: 'happy' },
  sleep:          { chain: 'fallAsleep',         ambient: 'calm' },
  bored:          { chain: 'long_silence',       ambient: 'bored' },
  story:          { chain: 'thinking_reaction',  ambient: 'curious' },
  emotion_happy:  { chain: 'child_laughed',      ambient: 'happy' },
  emotion_sad:    { chain: 'child_sad',          ambient: 'sad' },
  emotion_scared: { chain: 'child_scared',       ambient: 'scared' },
  emotion_angry:  { chain: 'child_angry',        ambient: 'angry' },
  question:       { chain: 'attention',          ambient: 'curious' },
  love:           { chain: 'love_reaction',      ambient: 'happy' },
  secret:         { chain: 'embarrassed_reaction', ambient: 'calm' },
  attention:      { chain: 'attention',          ambient: 'curious' },
  agree:          { gesture: 'nod',              ambient: 'calm' },
  agree_strong:   { gesture: 'nod_strong',       ambient: 'happy' },
  disagree:       { gesture: 'shake',            ambient: 'calm' },
  disagree_strong:{ gesture: 'shake_strong',     ambient: 'calm' },
  negation:       { ambient: 'calm' },
  stop:           { ambient: 'calm' },
};

// ── Personality timers ──

let ctx = null;
let idleTimer = null;
let restartTimer = null;
let asleep = false;

const TIER1_MIN = 6000;
const TIER1_MAX = 15000;
const SLEEP_THRESHOLD = 300;

// Idle behaviors — now simple chains or single behaviors
const FIDGETS = ['curious', 'attentive', 'calm'];
const FIDGET_GESTURES = ['peek_left', 'peek_right', 'wiggle', 'tilt_left', 'tilt_right', 'bob'];
const BORED_CHAINS = ['long_silence'];
const BORED_BEHAVIORS = ['bored', 'silly', 'embarrassed'];

function pick(pool) { return pool[Math.floor(Math.random() * pool.length)]; }
function rand(min, max) { return min + Math.random() * (max - min); }

function scheduleIdle() {
  if (asleep) return;

  const silence = ctx?.state?.silenceDuration || 0;
  let delay;

  if (silence > 120) {
    delay = rand(8000, 15000);
  } else if (silence > 25) {
    delay = rand(10000, 20000);
  } else {
    delay = rand(TIER1_MIN, TIER1_MAX);
  }

  idleTimer = setTimeout(() => {
    if (asleep) return;

    if (ctx?.state?.silenceDuration > SLEEP_THRESHOLD) {
      asleep = true;
      ctx.face.chain('fallAsleep');
      ctx.memory.log({ category: 'personality', data: { event: 'fell_asleep' } });
      return;
    }

    const silence = ctx?.state?.silenceDuration || 0;

    if (silence > 120) {
      // Sleepy — yawn behavior
      ctx.face.behavior('yawning');
    } else if (silence > 25) {
      // Bored — random behavior + gesture
      if (Math.random() > 0.5) {
        ctx.face.behavior(pick(BORED_BEHAVIORS));
      } else {
        ctx.face.head(pick(FIDGET_GESTURES));
      }
      // Play a sound
      ctx.voice.play(pick(['grumble', 'babble_slow', 'hum_sad', 'fart_squeak', 'burp', 'giggle']));
    } else {
      // Fidgets — gesture overlay on current state
      ctx.face.head(pick(FIDGET_GESTURES));
      if (Math.random() > 0.5) {
        ctx.voice.play(pick(['chirp_short', 'hum', 'chirp_up']));
      }
    }

    scheduleIdle();
  }, delay);
}

function resetIdle() {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }

  if (asleep) {
    asleep = false;
    ctx.face.interruptMode();
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

  intents: Object.keys(INTENT_MAP),

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

    // Set ambient behavior
    if (mapping.ambient) ctx.face.setAmbient(mapping.ambient);

    // Play chain or gesture
    if (mapping.chain) ctx.face.chain(mapping.chain);
    else if (mapping.gesture) ctx.face.head(mapping.gesture);
    else if (mapping.ambient) ctx.face.behavior(mapping.ambient);

    // Log interaction
    ctx.memory.log({ category: 'interaction', data: { intent, ambient: mapping.ambient } });

    return true;
  },
};
