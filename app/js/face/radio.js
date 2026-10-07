// ══════════════════════════════════════════
// Face — radio
// Radio mode: the mouth is a play / pause button
// ══════════════════════════════════════════

import { face, RADIO_URL, S } from './state.js';

export function setRadioMode(on, autoPlay = false) {
  S.radioMode = on;
  if (on && autoPlay && !S.radioPlaying) toggleRadio();
  if (!on && S.radioPlaying) toggleRadio();
}

export function isRadioPlaying() { return S.radioPlaying; }

export function toggleRadio() {
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
