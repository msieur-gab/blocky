// ══════════════════════════════════════════
// Chains Catalog
// Sequences of behaviors — triggered by intent or time
//
// Two types:
//   Simple reaction — plays and returns to ambient
//   Mode — has intro, hold (terminal), and outro
//
// When a mode is interrupted, the outro plays before
// the next chain starts
// ══════════════════════════════════════════

export const catalog = {

  // ── Simple reactions (play once, return to ambient) ──

  greet: {
    steps: [
      { behavior: 'surprise', dur: 400 },
      { behavior: 'happy',    dur: 600 },
    ],
    // no hold = returns to ambient mood after steps
  },

  // ── Modes (intro → hold → outro on interrupt) ──

  fallAsleep: {
    intro: [
      { behavior: 'calm',    dur: 800 },
      { behavior: 'drowsy',  dur: 6000 },
      { behavior: 'asleep',  dur: 1200 },
    ],
    hold: 'sleeping',     // terminal behavior, loops until interrupted
    outro: [
      { behavior: 'drowsy',   dur: 2500 },
      { behavior: 'surprise', dur: 500 },
      { behavior: 'happy',    dur: 800 },
    ],
  },
};
