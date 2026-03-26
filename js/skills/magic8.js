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

const ANSWERS = [
  // Positive
  { reaction: 'agree_strong',   sound: 'chirp_up',    mood: 'happy' },
  { reaction: 'agree_strong',   sound: 'fanfare',     mood: 'excited' },
  { reaction: 'agree',          sound: 'hum_happy',   mood: 'happy' },
  { reaction: 'agree_hesitant', sound: 'chirp_short', mood: 'calm' },

  // Negative
  { reaction: 'disagree_strong', sound: 'grumble',    mood: 'angry' },
  { reaction: 'disagree_strong', sound: 'chirp_down', mood: 'sad' },
  { reaction: 'disagree',        sound: 'hum_sad',    mood: 'calm' },
  { reaction: 'disagree',        sound: 'chirp_down', mood: 'calm' },

  // Uncertain
  { reaction: 'agree_hesitant',  sound: 'babble_question', mood: 'curious' },
  { reaction: 'curious_loop',    sound: 'babble_slow',     mood: 'curious' },
  { reaction: 'embarrassed',     sound: 'giggle',          mood: 'silly' },
  { reaction: 'thinking',        sound: 'hum',             mood: 'curious' },
];

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

  answer();
}

function answer() {
  if (!ctx) return;
  answering = true;

  // Think
  ctx.face.react('magic8_thinking');

  // Reveal
  setTimeout(() => {
    if (!ctx || !active) { answering = false; return; }

    const a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    ctx.face.mood(a.mood);
    ctx.voice.play(a.sound);

    setTimeout(() => {
      if (!ctx || !active) { answering = false; return; }
      ctx.face.react(a.reaction);
      answering = false;
    }, 200);

    ctx.memory.log({ data: { answer: a.reaction.includes('agree') ? 'yes' : a.reaction.includes('disagree') ? 'no' : 'maybe' } });
  }, 1400);
}
