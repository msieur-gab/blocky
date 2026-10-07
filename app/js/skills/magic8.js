// ══════════════════════════════════════════
// Magic 8-Ball Skill
// Persistent mode: reacts to EVERY sentence
// with a random yes/no/maybe — pure fun
// Say "stop" to exit
// ══════════════════════════════════════════

let ctx = null;
let active = false;
let answering = false;
let sentenceUnsub = null;

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

    // Listen directly to raw sentences — bypass NLU entirely
    sentenceUnsub = ctx.bus.onGlobal('ear:sentence', onSentence);
    // Fallback for legacy speech service
    ctx.bus.onGlobal('speech:sentence', onSentence);

    console.log('[magic8] Mode active — ask me anything');
  },

  deactivate() {
    active = false;
    answering = false;
    if (sentenceUnsub) { sentenceUnsub(); sentenceUnsub = null; }
    ctx?.memory.log({ data: { event: 'stopped' } });
    ctx = null;
    console.log('[magic8] Mode ended');
  },

  handleIntent(intent) {
    if (!active) return false;
    if (intent === 'stop') {
      this.deactivate();
      return true;
    }
    return true; // swallow all intents while active
  },
};

function onSentence(sentence) {
  if (!active || !ctx || answering) return;

  const text = sentence.toLowerCase().trim();
  if (!text) return;

  // Check for stop
  if (text.includes('stop') || text.includes('enough') || text.includes('exit')) {
    ctx = null;
    active = false;
    if (sentenceUnsub) { sentenceUnsub(); sentenceUnsub = null; }
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
    }, 200);

    const type = YES.includes(a) ? 'yes' : NO.includes(a) ? 'no' : 'maybe';
    ctx.memory.log({ data: { answer: type, emotional: isEmotional(text) } });
  }, 1400);
}
