// ══════════════════════════════════════════
// Face Introduction Skill
// "I'm [name]" → camera scans → enrolls face
// ══════════════════════════════════════════

import * as faceSvc from '../services/faces.js';

let ctx = null;

export default {
  id: 'face-intro',
  name: 'Face Introduction',

  intents: ['introduction'],

  exemplars: {
    introduction: [
      'my name is Sophie', 'I am called Tom',
      'this is my friend Anna', 'say hello to my mom',
      'meet my dad', 'please meet Sara',
    ],
  },

  reactions: {
    face_recognized: [
      { expr: 'surprise', duration: 200, sound: 'chirp_up' },
      { expr: 'happy',    duration: 600, sound: 'babble_fast' },
    ],
    face_enrolled: [
      { expr: 'surprise', duration: 200, sound: 'boing' },
      { expr: 'starry',   duration: 500, sound: 'fanfare' },
      { expr: 'happy',    duration: 600, sound: 'babble_excited' },
    ],
    face_unknown: [
      { expr: 'curious',  duration: 400, sound: 'babble_question' },
      { expr: 'curious_b', duration: 400 },
      { expr: 'curious',  duration: 300 },
    ],
  },

  activate(context) { ctx = context; },
  deactivate() { ctx = null; },

  handleIntent(intent, entities) {
    if (intent !== 'introduction' || !entities?.name) return false;

    console.log(`[face-intro] Introduction: ${entities.name}`);

    // Return to presence immediately — faces.js handles the rest via bus
    ctx?.done();

    return true;
  },
};
