// ══════════════════════════════════════════
// Look Skill — gesture recognition mode
// "Blocky look" → scan for hand gestures
// ══════════════════════════════════════════

import * as gestures from '../services/gestures.js';

let ctx = null;
let timeoutId = null;
let gestureUnsub = null;

const GESTURE_REACTIONS = {
  heart:      { reaction: 'love',          mood: 'happy' },
  thumbsup:   { reaction: 'child_laughed', mood: 'happy' },
  thumbsdown: { reaction: 'child_sad',     mood: 'sad' },
  love_sign:  { reaction: 'love',          mood: 'happy' },
  paper:      { reaction: 'surprised',     mood: 'excited' },
  point:      { reaction: 'curious_loop',  mood: 'curious' },
};

export default {
  id: 'look',
  name: 'Gesture Scanner',

  intents: ['look'],

  exemplars: {
    look: [
      'look at this', 'look at my hand', 'look at my finger',
      'watch this', 'check this out', 'can you see this',
      'look what I can do', 'see this',
    ],
  },

  reactions: {
    // Inherits love, child_laughed, etc. from presence reactions
  },

  activate(context) {
    ctx = context;
    ctx.face.startScan();
    gestures.start();

    // Listen for gestures
    gestureUnsub = ctx.bus.onGlobal('gesture:detected', onGesture);

    // Auto-stop after 10s
    timeoutId = setTimeout(() => {
      console.log('[look] Timeout — no gesture');
      cleanup();
    }, 10000);

    console.log('[look] Scanning for gestures...');
  },

  deactivate() {
    cleanup();
  },

  handleIntent(intent) {
    if (intent === 'stop') {
      cleanup();
      return true;
    }
    return false;
  },
};

function onGesture({ gesture }) {
  if (!ctx) return;

  const mapping = GESTURE_REACTIONS[gesture];
  if (mapping) {
    console.log(`[look] Gesture: ${gesture}`);
    ctx.face.mood(mapping.mood);
    ctx.face.react(mapping.reaction);
    ctx.memory.log({ category: 'gesture', data: { gesture } });

    setTimeout(() => cleanup(), 500);
  }
}

function cleanup() {
  if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
  if (gestureUnsub) { gestureUnsub(); gestureUnsub = null; }
  ctx?.face.stopScan();
  gestures.stop();
  ctx = null;
}
