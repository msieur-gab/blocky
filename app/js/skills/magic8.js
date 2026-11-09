// ══════════════════════════════════════════
// Magic 8-Ball Skill
// One question per call: "tell me the future" → blocky waits for the question (no name
// needed, see ctx.expectReply) → yes / no / maybe → back to presence.
// No question within REPLY_MS, or "stop": it ends without answering.
// (Was a persistent mode answering every sentence until "stop"; changed 2026-11-09 with the
// name gate, where it held blocky and swallowed every other request.)
// ══════════════════════════════════════════

let ctx = null;
let active = false;
let answering = false;
let sentenceUnsub = null;
let replyTimer = null;
const REPLY_MS = 10000;        // how long blocky waits for the question

// ── Answer pools ──

const YES = [
  { reaction: 'agree_strong',   sound: 'chirp_up',    mood: 'happy' },
  { reaction: 'agree_strong',   sound: 'fanfare',     mood: 'excited' },
  { reaction: 'agree',          sound: 'hum_happy',   mood: 'happy' },
  { reaction: 'love',           sound: 'hum_happy',   mood: 'happy' },
];

const MAYBE = [
  { reaction: 'agree_hesitant', sound: 'chirp_short',     mood: 'calm' },
  { reaction: 'agree_hesitant', sound: 'babble_question', mood: 'curious' },
  { reaction: 'curious_loop',   sound: 'babble_slow',     mood: 'curious' },
  { reaction: 'thinking',       sound: 'hum',             mood: 'curious' },
  { reaction: 'embarrassed',    sound: 'giggle',          mood: 'silly' },
];

const NO = [
  { reaction: 'disagree',       sound: 'chirp_down',  mood: 'calm' },
  { reaction: 'disagree',       sound: 'hum_sad',     mood: 'calm' },
];

// Emotional keywords — ALWAYS answer positively
const EMOTIONAL_WORDS = new Set([
  'love', 'like', 'friend', 'care', 'miss', 'hug', 'kiss',
  'scared', 'afraid', 'alone', 'lonely', 'cry', 'sad',
  'pretty', 'beautiful', 'smart', 'brave', 'strong', 'good',
  'happy', 'best', 'favorite', 'special', 'matter',
]);

function isEmotional(text) {
  const words = text.split(/\s+/);
  return words.some(w => EMOTIONAL_WORDS.has(w));
}

function pickAnswer(text) {
  // Emotional questions → always positive
  if (isEmotional(text)) return pick(YES);

  // Normal questions → weighted: 50% yes, 35% maybe, 15% mild no
  const roll = Math.random();
  if (roll < 0.50) return pick(YES);
  if (roll < 0.85) return pick(MAYBE);
  return pick(NO);
}

function pick(pool) { return pool[Math.floor(Math.random() * pool.length)]; }

export default {
  id: 'magic8',
  name: 'Magic 8-Ball',

  intents: ['magic8'],

  exemplars: {
    magic8: [
      'magic eight ball',
      'tell me the future',
      'predict something',
      'eight ball',
      'fortune teller',
      'can you predict',
    ],
  },

  journal: { category: 'magic8', description: 'Magic 8-ball sessions' },

  reactions: {
    magic8_thinking: [
      { expr: 'thinking', duration: 500, sound: 'hum', tilt: -5 },
      { expr: 'thinking', duration: 400, tilt: 5 },
      { expr: 'thinking', duration: 400, sound: 'babble_question', tilt: -3 },
    ],
  },

  activate(context) {
    ctx = context;
    active = true;
    answering = false;

    ctx.voice.play('powerup');
    ctx.face.react('magic8_thinking');
    ctx.memory.log({ data: { event: 'started' } });

    // The next sentence is the question, raw — bypass NLU entirely
    sentenceUnsub = ctx.bus.onGlobal('ear:sentence', onSentence);
    ctx.expectReply(REPLY_MS);
    replyTimer = setTimeout(() => { console.log('[magic8] No question heard'); finish(); }, REPLY_MS + 500);

    console.log('[magic8] Waiting for one question');
  },

  deactivate() {
    cleanup();
    ctx?.memory.log({ data: { event: 'stopped' } });
    ctx = null;
    console.log('[magic8] Ended');
  },

  handleIntent(intent) {
    if (!active) return false;
    if (intent === 'stop') {
      finish();
      return true;
    }
    // The question itself is classified too: keep it here while it is being answered
    return answering || !!replyTimer;
  },
};

function cleanup() {
  active = false;
  answering = false;
  if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
  if (sentenceUnsub) { sentenceUnsub(); sentenceUnsub = null; }
}

// Done: hand blocky back to presence (and to waiting for its name)
function finish() {
  const c = ctx;
  cleanup();
  ctx = null;
  c?.memory.log({ data: { event: 'stopped' } });
  c?.done();
  console.log('[magic8] Ended');
}

function onSentence(sentence) {
  if (!active || !ctx || answering) return;

  const text = sentence.toLowerCase().trim();
  if (!text) return;

  // One question per call: stop listening for more
  if (replyTimer) { clearTimeout(replyTimer); replyTimer = null; }
  if (sentenceUnsub) { sentenceUnsub(); sentenceUnsub = null; }

  if (text.includes('stop') || text.includes('enough') || text.includes('exit')) {
    finish();
    return;
  }

  answer(text);
}

function answer(text) {
  if (!ctx) return;
  answering = true;

  // Think
  ctx.face.react('magic8_thinking');

  // Reveal
  setTimeout(() => {
    if (!ctx || !active) { answering = false; return; }

    const a = pickAnswer(text);
    ctx.face.mood(a.mood);
    ctx.voice.play(a.sound);

    setTimeout(() => {
      if (!ctx || !active) { answering = false; return; }
      ctx.face.react(a.reaction);
      answering = false;
      // Let the answer show before blocky goes back to its own life
      setTimeout(() => { if (ctx && active && !answering) finish(); }, 2500);
    }, 200);

    const type = YES.includes(a) ? 'yes' : NO.includes(a) ? 'no' : 'maybe';
    ctx.memory.log({ data: { answer: type, emotional: isEmotional(text) } });
  }, 1400);
}
