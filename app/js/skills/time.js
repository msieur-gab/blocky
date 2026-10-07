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
let timers = [];

// Every step of the clock is a timer. They are kept so that another skill taking over
// mid-way can cancel them; a step left running would find no context, throw, and leave
// the face held on the digits for good.
function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

function cancel() {
  timers.forEach(clearTimeout);
  timers = [];
}

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

  deactivate() {
    if (timers.length) { cancel(); ctx?.face.release(); }
    ctx = null;
  },

  handleIntent(intent, entities) {
    if (intent !== 'time' || !ctx) return false;

    cancel();     // asked again while still showing: start over

    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Phase 1: show hours
    ctx.voice.play('chirp_up');
    ctx.face.overrideRaw(makeDigitExpression(Math.floor(h / 10), h % 10));

    later(300, () => ctx.voice.play('countdown_beep'));

    // Phase 2: blink, then minutes
    later(1800, () => ctx.face.release());
    later(2200, () => {
      ctx.voice.play('chirp_short');
      ctx.face.overrideRaw(makeDigitExpression(Math.floor(m / 10), m % 10));
    });
    later(2500, () => ctx.voice.play('countdown_beep'));

    // Phase 3: release and return to presence
    later(4200, () => {
      timers = [];
      ctx.face.release();
      ctx.voice.play('chirp_down');
      ctx.done();
    });

    ctx.memory.log({ category: 'interaction', data: { time: `${h}:${String(m).padStart(2, '0')}` } });

    return true;
  },
};
