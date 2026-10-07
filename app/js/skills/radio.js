// ══════════════════════════════════════════
// Radio Skill — Mon petit France Inter
// Music streaming through ami.b's face
// ══════════════════════════════════════════

let ctx = null;
let unsubs = [];

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
    // The radio face is the player: its mouth is the play / pause button. It stays for as long
    // as the radio is on. Reactions may play over it (a greeting, a nod); when they are over,
    // the face comes back here instead of going to calm, where the button would be gone.
    ctx.face.setAmbient('radio');
    // Blocky's name was heard: go quiet so the command lands on a clean channel,
    // and carry on if nothing follows (see the name gate in ears-onnx.js)
    unsubs.forEach(off => off());
    unsubs = [
      ctx.bus.onGlobal('ami:wake', () => ctx?.face.holdRadio(true)),
      ctx.bus.onGlobal('ami:rest', () => ctx?.face.holdRadio(false)),
      ctx.bus.onGlobal('face:behavior', (name) => {
        if (name === 'radio') return;
        setTimeout(() => {       // after whoever changed the face has finished doing so
          if (!ctx || ctx.face.isBusy()) return;
          ctx.face.setAmbient('radio');
          ctx.face.behavior('radio');
        }, 0);
      }),
    ];
    ctx.face.react('music');
    ctx.memory.log({ data: { event: 'started' } });
    console.log('[radio] Streaming started');
  },

  deactivate() {
    unsubs.forEach(off => off());
    unsubs = [];
    if (ctx) {
      ctx.face.setRadioMode(false);
      ctx.face.setAmbient('calm');
      ctx.face.behavior('calm');
      ctx.memory.log({ data: { event: 'stopped' } });
    }
    ctx = null;
    console.log('[radio] Stopped');
  },

  handleIntent(intent, entities) {
    if (intent === 'stop') {
      const done = ctx?.done;
      this.deactivate();
      done?.();                  // tell the kernel, so that it does not keep the radio as the active skill
      return true;
    }
    return false;
  },
};
