// ══════════════════════════════════════════
// Magic 8-Ball Skill
// Persistent mode: every question gets a
// yes/no/maybe answer through face + sound
// Say "stop" to exit
// ══════════════════════════════════════════

let ctx = null;
let active = false;
let answering = false; // prevent overlapping answers

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

    // Enter mode — show thinking face
    ctx.face.react('magic8_thinking');
    ctx.voice.play('powerup');
    ctx.memory.log({ data: { event: 'started' } });
    console.log('[magic8] Mode active — ask me anything');
  },

  deactivate() {
    active = false;
    answering = false;
    ctx?.memory.log({ data: { event: 'stopped' } });
    ctx = null;
    console.log('[magic8] Mode ended');
  },

  handleIntent(intent, entities) {
    if (!ctx || !active) return false;

    // Stop exits the mode
    if (intent === 'stop') {
      this.deactivate();
      return true;
    }

    // Any other intent while active = a question to answer
    if (answering) return true; // still answering previous question

    answer();
    return true; // catch ALL intents while in mode
  },
};

function answer() {
  if (!ctx) return;
  answering = true;

  // Think first
  ctx.face.react('magic8_thinking');

  // Reveal answer after thinking
  setTimeout(() => {
    if (!ctx || !active) return;

    const a = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    ctx.face.mood(a.mood);
    ctx.voice.play(a.sound);

    // Small delay then reaction (so sound hits first)
    setTimeout(() => {
      if (!ctx || !active) return;
      ctx.face.react(a.reaction);
      answering = false;
    }, 200);

    ctx.memory.log({ data: { type: a.reaction.includes('agree') ? 'yes' : a.reaction.includes('disagree') ? 'no' : 'maybe' } });
  }, 1400);
}
