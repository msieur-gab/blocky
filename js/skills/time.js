// ══════════════════════════════════════════
// Time Skill — ami.b tells the time
// Eyes show hour digits then minute digits
// ══════════════════════════════════════════

import { catalog as EYES, DEFAULT as EYE_DEFAULT } from '../data/eyes.js';
import { DEFAULT as MOUTH_DEFAULT } from '../data/mouths.js';

const DIGITS = ['zero','one','two','three','four','five','six','seven','eight','nine'];

function makeDigitExpression(d1, d0) {
  return {
    left:  { ...EYE_DEFAULT, ...EYES[DIGITS[d1]] },
    right: { ...EYE_DEFAULT, ...EYES[DIGITS[d0]] },
    mouth: { ...MOUTH_DEFAULT },
    face:  { x: 0, y: 0, scale: 1.1, tilt: 0, squash: 0, skewX: 0, skewY: 0 },
    gap: 400,
  };
}

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
    ctx.face.overrideRaw(makeDigitExpression(Math.floor(h / 10), h % 10));

    setTimeout(() => ctx.voice.play('countdown_beep'), 300);

    // Phase 2: blink, then minutes
    setTimeout(() => ctx.face.release(), 1800);
    setTimeout(() => {
      ctx.voice.play('chirp_short');
      ctx.face.overrideRaw(makeDigitExpression(Math.floor(m / 10), m % 10));
    }, 2200);
    setTimeout(() => ctx.voice.play('countdown_beep'), 2500);

    // Phase 3: release and return to presence
    setTimeout(() => {
      ctx.face.release();
      ctx.voice.play('chirp_down');
      ctx.done();
    }, 4200);

    ctx.memory.log({ category: 'interaction', data: { time: `${h}:${String(m).padStart(2, '0')}` } });

    return true;
  },
};
