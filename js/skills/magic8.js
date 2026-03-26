// ══════════════════════════════════════════
// Magic 8-Ball Skill
// Ask ami.b a yes/no question → mysterious answer
// Eyes show the answer expression
// ══════════════════════════════════════════

let ctx = null;

const ANSWERS = [
  // Positive
  { text: 'yes',       mood: 'happy',   reaction: 'agree_strong' },
  { text: 'sure',      mood: 'happy',   reaction: 'agree' },
  { text: 'obvious',   mood: 'excited', reaction: 'agree_strong' },
  { text: 'maybe_yes', mood: 'calm',    reaction: 'agree_hesitant' },

  // Negative
  { text: 'no',        mood: 'sad',     reaction: 'disagree_strong' },
  { text: 'nope',      mood: 'calm',    reaction: 'disagree' },
  { text: 'doubt',     mood: 'calm',    reaction: 'disagree' },
  { text: 'never',     mood: 'angry',   reaction: 'disagree_strong' },

  // Uncertain
  { text: 'maybe',     mood: 'curious', reaction: 'agree_hesitant' },
  { text: 'dunno',     mood: 'curious', reaction: 'thinking' },
  { text: 'ask_again', mood: 'silly',   reaction: 'curious_loop' },
  { text: 'secret',    mood: 'silly',   reaction: 'embarrassed' },
];

export default {
  id: 'magic8',
  name: 'Magic 8-Ball',

  intents: ['magic8'],

  exemplars: {
    magic8: [
      'magic eight ball',
      'tell me the future',
      'is it going to rain',
      'will I be happy',
      'predict something',
      'do you think so',
      'answer my question',
      'eight ball',
    ],
  },

  journal: { category: 'magic8', description: 'Magic 8-ball predictions' },

  reactions: {
    magic8_thinking: [
      { expr: 'thinking',  duration: 600, sound: 'hum', tilt: -5 },
      { expr: 'thinking',  duration: 400, tilt: 5 },
      { expr: 'thinking',  duration: 500, sound: 'babble_question', tilt: -3 },
    ],
  },

  activate(context) { ctx = context; },
  deactivate() { ctx = null; },

  handleIntent(intent, entities) {
    if (intent !== 'magic8' || !ctx) return false;

    // Thinking phase
    ctx.face.react('magic8_thinking');

    // Reveal after thinking animation (~1.5s)
    setTimeout(() => {
      if (!ctx) return;

      const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
      ctx.face.mood(answer.mood);
      ctx.face.react(answer.reaction);

      ctx.memory.log({ data: { answer: answer.text } });
      console.log(`[magic8] Answer: ${answer.text}`);
    }, 1600);

    return true;
  },
};
