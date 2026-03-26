// ══════════════════════════════════════════
// Time Skill — ami.b tells the time
// Eyes show hour digits then minute digits
// ══════════════════════════════════════════

import { makeTimeExpression, makeMinuteExpression } from '../expressions.js';

let ctx = null;

export default {
  id: 'time',
  name: 'Clock',

  intents: ['time'],

  exemplars: {
    time: [
      'what time is it', 'tell me the time',
      'what is the time', 'how late is it',
      'what hour is it',
    ],
  },

  activate(context) { ctx = context; },
  deactivate() { ctx = null; },

  handleIntent(intent, entities) {
    if (intent !== 'time' || !ctx) return false;

    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Phase 1: show hours
    ctx.voice.play('chirp_up');
    ctx.face.overrideRaw(makeTimeExpression(h, m));

    setTimeout(() => ctx.voice.play('countdown_beep'), 300);

    // Phase 2: blink, then minutes
    setTimeout(() => ctx.face.release(), 1800);
    setTimeout(() => {
      ctx.voice.play('chirp_short');
      ctx.face.overrideRaw(makeMinuteExpression(m));
    }, 2200);
    setTimeout(() => ctx.voice.play('countdown_beep'), 2500);

    // Phase 3: release
    setTimeout(() => {
      ctx.face.release();
      ctx.voice.play('chirp_down');
    }, 4200);

    ctx.memory.log({ category: 'interaction', data: { time: `${h}:${String(m).padStart(2, '0')}` } });

    return true;
  },
};
