// ══════════════════════════════════════════
// Radio Skill — Mon petit France Inter
// Music streaming through ami.b's face
// ══════════════════════════════════════════

let ctx = null;

export default {
  id: 'radio',
  name: 'Radio Player',

  intents: ['music'],

  exemplars: {
    music: [
      'play some music', 'play me a song', 'put on music',
      'I want to hear music', 'sing something', 'some music please',
    ],
  },

  journal: { category: 'music', description: 'Music listening sessions' },

  reactions: {
    music: [
      { expr: 'surprise', duration: 200, sound: 'chirp_up' },
      { expr: 'musical',  duration: 600, sound: 'twinkle' },
      { expr: 'radio',    duration: 800, sound: 'hum_happy' },
    ],
  },

  activate(context) {
    ctx = context;
    ctx.face.setRadioMode(true, true);
    ctx.face.react('music');
    ctx.memory.log({ data: { event: 'started' } });
    console.log('[radio] Streaming started');
  },

  deactivate() {
    if (ctx) {
      ctx.face.setRadioMode(false);
      ctx.memory.log({ data: { event: 'stopped' } });
    }
    ctx = null;
    console.log('[radio] Stopped');
  },

  handleIntent(intent, entities) {
    if (intent === 'stop') {
      this.deactivate();
      return true;
    }
    return false;
  },
};
