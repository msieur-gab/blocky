// ══════════════════════════════════════════
// Face — radio
// Radio mode: the mouth is a play / pause button
// ══════════════════════════════════════════

import { face, RADIO_URL, S } from './state.js';

export function setRadioMode(on, autoPlay = false) {
  S.radioMode = on;
  if (!on) S.radioHeld = false;
  if (on && autoPlay && !S.radioPlaying) toggleRadio();
  if (!on && S.radioPlaying) toggleRadio();
}

export function isRadioPlaying() { return S.radioPlaying; }
export function isRadioMode() { return S.radioMode; }

// Held: paused for a moment so that blocky can hear what is said to it; not a pause the child asked for
export function holdRadio(on) {
  if (on && S.radioPlaying) {
    S.radioAudio.pause();
    S.radioPlaying = false;
    S.radioHeld = true;
  } else if (!on && S.radioHeld) {
    S.radioHeld = false;
    if (S.radioMode && !S.radioPlaying) toggleRadio();
  }
}

export function toggleRadio() {
  S.radioHeld = false;
  if (!S.radioAudio) {
    S.radioAudio = new Audio(RADIO_URL);
    S.radioAudio.crossOrigin = 'anonymous';
  }

  if (S.radioPlaying) {
    S.radioAudio.pause();
    S.radioPlaying = false;
    console.log('[face] Radio paused');
  } else {
    S.radioAudio.play().catch(e => console.warn('[face] Radio play failed:', e));
    S.radioPlaying = true;
    console.log('[face] Radio playing');
  }
}
