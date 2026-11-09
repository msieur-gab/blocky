// ══════════════════════════════════════════
// Night light
// "turn on the light", "open the light", "it's dark", "I'm scared" → blocky's face turns warm
// white with dark eyes, and in webdroid the phone's flashlight comes on and the screen goes to
// full brightness (POST /__light to webdroid's own server; elsewhere only the face changes).
// A touch on the face, "turn off the light", or AUTO_OFF_MS turns it off.
//
// Not a skill: it does not take blocky over, so a game or the radio goes on with the light.
// The face blocky makes is presence's business ("I'm scared", "it's dark": blocky is scared
// too — empathy, not comfort; Gab, 2026-11-09).
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as faceApi from '../face-api.js';
import { getActiveSkill } from '../kernel.js';

const ON_INTENTS = new Set(['light_on', 'dark', 'emotion_scared']);
const AUTO_OFF_MS = 5 * 60 * 1000;
const NIGHT = { fg: '#3a2f28', bg: '#fff6e5' };   // warm white screen, dark brown eyes

let on = false;
let autoOff = null;
let armTouch = null;
const surface = () => document.getElementById('screen-wrap');

export function init() {
  bus.on('intent:classified', ({ intent }) => {
    if (ON_INTENTS.has(intent)) lightOn();
    else if (intent === 'light_off') lightOff();
  });
}

export function isOn() { return on; }

export function lightOn() {
  if (autoOff) clearTimeout(autoOff);
  autoOff = setTimeout(lightOff, AUTO_OFF_MS);
  if (on) return;
  on = true;
  document.body.classList.add('night-light');
  faceApi.setPalette(NIGHT);
  shell('on').then((how) => console.log(`[light] on — ${how}`));
  // A touch turns it off. Armed a moment later, so a tap already under way does not count.
  armTouch = setTimeout(() => {
    armTouch = null;
    if (on) surface()?.addEventListener('pointerdown', onTouch);
  }, 600);
  bus.emit('light:on');
}

export function lightOff() {
  if (autoOff) { clearTimeout(autoOff); autoOff = null; }
  if (armTouch) { clearTimeout(armTouch); armTouch = null; }
  surface()?.removeEventListener('pointerdown', onTouch);
  if (!on) return;
  on = false;
  document.body.classList.remove('night-light');
  faceApi.setPalette(null);
  // Back to blocky's normal face: "I'm scared" / "it's dark" left it in the scared ambient,
  // and the dark is over (Gab, 2026-11-09). Inside a game, only the ambient is reset, so the
  // game's own faces are not cut short; it shows once the game ends.
  faceApi.setAmbient('calm');
  if (getActiveSkill() === 'presence') faceApi.behavior('calm');
  shell('off');
  console.log('[light] off');
  bus.emit('light:off');
}

function onTouch() { lightOff(); }

// Ask the shell for the flashlight. Outside webdroid there is no /__light: the face is the light.
async function shell(state) {
  try {
    const r = await fetch('/__light', { method: 'POST', body: state });
    if (r.status === 204) return 'flashlight and bright screen';
    if (r.status === 202) return 'bright screen (no flashlight)';
    return 'face only';
  } catch (_) {
    return 'face only';
  }
}
