// ══════════════════════════════════════════
// Voice Service
// Creature voice synthesis via Web Audio
// Uses synth helpers — all sounds are procedural
// ══════════════════════════════════════════

import { init as synthInit, tone, noise, seq, repeat } from '../utils/synth.js';

let ctx = null;
let masterGain = null;

// ── Blocky's voice identity ──
export const VOICE = {
  base: 320,         // fundamental frequency (Hz)
  range: 0.35,       // syllable deviation from base (0-1)
  formant: 700,      // primary formant center
  formantQ: 2.5,     // formant resonance
  timbre: 'sawtooth', // oscillator type
  volume: 0.7,       // master volume (0-1)
};

export function init() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = VOICE.volume;
  masterGain.connect(ctx.destination);
  synthInit(ctx, masterGain);
}

export function resume() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function setVolume(v) {
  VOICE.volume = v;
  if (masterGain) masterGain.gain.value = v;
}

// Helper: random freq around Blocky's base
function vFreq(mult = 1) {
  return VOICE.base * mult * (1 + (Math.random() * 2 - 1) * VOICE.range);
}

// Helper: Blocky's vocal filter
function vFilter(freqMult = 1) {
  return { type: 'bandpass', freq: VOICE.formant * freqMult, Q: VOICE.formantQ };
}

// ══════════════════════════════════════════
// SOUND CATALOG
// ══════════════════════════════════════════

export const sounds = {

  // ── Chirps ──

  chirp_up(dur = 0.15) {
    tone({ type: 'sine', freq: [400, 900], duration: dur });
  },

  chirp_down(dur = 0.15) {
    tone({ type: 'sine', freq: [800, 300], duration: dur });
  },

  chirp_short(dur = 0.08) {
    const f = 600 + Math.random() * 300;
    tone({ type: 'sine', freq: [f, f * 1.3, f * 0.9], duration: dur });
  },

  // ── Hums ──

  hum(dur = 0.5) {
    tone({ type: 'sine', freq: 280, duration: dur, attack: dur * 0.15, vibrato: { rate: 5, depth: 8 } });
  },

  hum_happy(dur = 0.4) {
    tone({ type: 'sine', freq: [350, 400, 350], duration: dur, attack: dur * 0.1 });
  },

  hum_sad(dur = 0.6) {
    tone({ type: 'sine', freq: [220, 187], duration: dur, attack: dur * 0.15 });
  },

  // ── Kiss ──

  kiss(dur = 0.25) {
    // Quick pop with resonance — like a smoochy kiss
    noise({ duration: 0.04, volume: 0.6, shape: 'attack', filter: { type: 'bandpass', freq: 2500, Q: 8 } });
    tone({ type: 'sine', freq: [800, 400], duration: dur, delay: 0.03, attack: 0.01, release: 0.15, volume: 0.4 });
  },

  // ── Pops / clicks ──

  pop(dur = 0.08) {
    tone({ type: 'sine', freq: [600, 100], duration: dur });
  },

  click(dur = 0.03) {
    noise({ duration: dur, shape: 'decay', decayRate: 0.1, filter: { type: 'bandpass', freq: 2000, Q: 5 } });
  },

  // ── Warble ──

  warble(dur = 0.4) {
    tone({ type: 'triangle', freq: 500, duration: dur, vibrato: { rate: 12, depth: 80 } });
  },

  // ── Grumble ──

  grumble(dur = 0.5) {
    tone({ type: 'sawtooth', freq: [80, 64], duration: dur, filter: { type: 'lowpass', freq: 300 } });
    tone({ type: 'sawtooth', freq: [82, 66], duration: dur, filter: { type: 'lowpass', freq: 300 } });
  },

  // ── Squeak ──

  squeak(dur = 0.12) {
    tone({ type: 'sine', freq: [900, 1350, 720], duration: dur });
  },

  // ── Snore ──

  snore(dur = 2.0) {
    const cycleLen = dur / 2;
    for (let i = 0; i < 2; i++) {
      const d = i * cycleLen;
      // Inhale — buzzy, rising
      tone({ type: 'sawtooth', freq: [80, 120], duration: cycleLen * 0.35, delay: d,
        vibrato: { rate: 25 + Math.random() * 10, depth: 20 },
        filter: { type: 'bandpass', freq: 200, freqEnd: 350, Q: 6 } });
      // Exhale — breathy noise
      noise({ duration: cycleLen * 0.4, delay: d + cycleLen * 0.5, shape: 'sine',
        filter: { type: 'lowpass', freq: 200 } });
    }
  },

  // ── Farts ──

  fart_squeak(dur = 0.15) {
    tone({ type: 'sawtooth', freq: [180, 400, 120], duration: dur, filter: { type: 'bandpass', freq: 300, Q: 4 } });
  },

  fart_rumble(dur = 0.5) {
    tone({ type: 'sawtooth', freq: [55, 35], duration: dur, filter: { type: 'lowpass', freq: 180, freqEnd: 60 } });
    tone({ type: 'sawtooth', freq: [58, 32], duration: dur, filter: { type: 'lowpass', freq: 180, freqEnd: 60 } });
  },

  fart_machine(dur = 0.4) {
    const count = 6 + Math.floor(Math.random() * 4);
    repeat(count, {
      type: 'sawtooth', duration: dur / count * 0.7, gap: dur / count * 0.3,
      freq: 65, variation: 0.4,
      filter: { type: 'lowpass', freq: 180 },
    });
  },

  fart_trumpet(dur = 0.35) {
    tone({ type: 'sawtooth', freq: [200, 60], duration: dur, filter: { type: 'bandpass', freq: 400, freqEnd: 100, Q: 5 } });
  },

  fart_buzzy(dur = 0.82) {
    tone({ type: 'sawtooth', freq: [520, 1015], duration: dur, release: 0.25, volume: 1.5, vibrato: { rate: 14, depth: 19 }, filter: { type: 'lowpass', freq: 1300, Q: 0.1 } });
  },

  fart_wet(dur = 0.25) {
    noise({ duration: dur, modFreq: 60, filter: { type: 'lowpass', freq: 250, freqEnd: 80 } });
  },

  // ── Burps ──

  burp(dur = 0.25) {
    tone({ type: 'sawtooth', freq: [120, 60], duration: dur, filter: { type: 'bandpass', freq: 300, freqEnd: 100, Q: 2 } });
  },

  burp_big(dur = 0.45) {
    tone({ type: 'sawtooth', freq: [140, 50], duration: dur, filter: { type: 'bandpass', freq: 350, freqEnd: 80, Q: 3 } });
    tone({ type: 'sawtooth', freq: [145, 48], duration: dur, filter: { type: 'bandpass', freq: 350, freqEnd: 80, Q: 3 } });
  },

  burp_tiny(dur = 0.1) {
    tone({ type: 'sawtooth', freq: [200, 100], duration: dur, filter: { type: 'bandpass', freq: 250, Q: 4 } });
  },

  // ── Hiccups ──

  hiccup(dur = 0.1) {
    tone({ type: 'sine', freq: [350, 500, 200], duration: dur });
  },

  hiccup_double(dur = 0.25) {
    const f1 = 350 + Math.random() * 50;
    const f2 = 350 + Math.random() * 50;
    tone({ type: 'sine', freq: [f1, f1 * 1.4, f1 * 0.6], duration: 0.09, delay: 0 });
    tone({ type: 'sine', freq: [f2, f2 * 1.4, f2 * 0.6], duration: 0.09, delay: 0.13 });
  },

  // ── Sneezes ──

  sneeze(dur = 0.35) {
    // Build-up
    tone({ type: 'sine', freq: [300, 600], duration: dur * 0.33, attack: dur * 0.3, volume: 0.6 });
    // Burst
    noise({ duration: dur * 0.5, delay: dur * 0.3, shape: 'decay', decayRate: 0.15,
      filter: { type: 'highpass', freq: 800 } });
  },

  sneeze_big(dur = 0.6) {
    // Long "ahhh"
    tone({ type: 'sine', freq: [250, 500, 700], duration: dur * 0.4, attack: dur * 0.1, volume: 0.7 });
    // Big "CHOO"
    noise({ duration: dur * 0.55, delay: dur * 0.4, shape: 'decay', decayRate: 0.1,
      filter: { type: 'highpass', freq: 600 } });
  },

  sneeze_tiny(dur = 0.2) {
    tone({ type: 'sine', freq: [400, 800, 300], duration: dur, volume: 0.8 });
  },

  // ── Belly ──

  belly_rumble(dur = 0.6) {
    tone({ type: 'sawtooth', freq: [45, 35, 50, 30], duration: dur,
      vibrato: { rate: 3, depth: 15 }, filter: { type: 'lowpass', freq: 120 } });
  },

  // ── Musical ──

  boing(dur = 0.3) {
    tone({ type: 'sine', freq: [300, 900, 300], duration: dur });
  },

  twinkle(dur = 0.2) {
    seq([
      { freq: 600, dur: dur / 4 },
      { freq: 800, dur: dur / 4 },
      { freq: 1000, dur: dur / 4 },
      { freq: 800, dur: dur / 4 },
    ], { type: 'sine', gap: 0 });
  },

  fanfare(dur = 0.8) {
    seq([
      { freq: 523, dur: 0.08, gap: 0.02 },
      { freq: 659, dur: 0.08, gap: 0.02 },
      { freq: 784, dur: 0.08, gap: 0.02 },
      { freq: 1047, dur: 0.08, gap: 0.04 },
      { freq: 1319, dur: 0.12, gap: 0.02 },
      { freq: 1568, dur: 0.3 },
    ], { type: 'square', filter: { type: 'lowpass', freq: 3000 } });
  },

  powerup(dur = 0.4) {
    tone({ type: 'square', freq: [200, 1200], duration: dur, filter: { type: 'lowpass', freq: 2000 } });
  },

  countdown_beep(dur = 0.12) {
    tone({ type: 'sine', freq: 600, duration: dur });
  },

  win(dur = 0.5) {
    seq([
      { freq: 500 }, { freq: 600 }, { freq: 800 }, { freq: 1000 }, { freq: 1200 },
    ].map(n => ({ ...n, dur: dur / 5 })), { type: 'sine', gap: 0 });
  },

  lose(dur = 0.5) {
    seq([
      { freq: 400 }, { freq: 350 }, { freq: 280 }, { freq: 200 },
    ].map(n => ({ ...n, dur: dur / 4 })), { type: 'triangle', gap: 0 });
  },

  // ── Babble (creature speech) — uses VOICE identity ──

  babble_fast(dur = 0.5) {
    repeat(7, {
      type: VOICE.timbre, freq: VOICE.base, variation: VOICE.range,
      duration: dur / 7 * 0.85, gap: dur / 7 * 0.15,
      filter: vFilter(),
    });
  },

  babble_slow(dur = 0.8) {
    repeat(4, {
      type: VOICE.timbre, freq: VOICE.base * 0.75, variation: VOICE.range * 0.5,
      duration: dur / 4 * 0.85, gap: dur / 4 * 0.15,
      attack: 0.03,
      filter: vFilter(0.8),
    });
  },

  babble_excited(dur = 0.5) {
    repeat(8, {
      type: VOICE.timbre, duration: dur / 8 * 0.8, gap: dur / 8 * 0.2,
      freq: VOICE.base, variation: VOICE.range,
      freqFn: (i, n, base) => base * (1 + i * 0.08) + (Math.random() * 2 - 1) * base * VOICE.range,
      filter: vFilter(1.2),
    });
  },

  babble_question(dur = 0.5) {
    const count = 5;
    const noteLen = dur / count;
    for (let i = 0; i < count; i++) {
      const f = vFreq();
      const endMult = i === count - 1 ? 1.5 : (0.85 + Math.random() * 0.3);
      tone({
        type: VOICE.timbre, freq: [f, f * endMult],
        duration: noteLen * 0.85, delay: i * noteLen,
        filter: { ...vFilter(), freq: VOICE.formant + (i === count - 1 ? 200 : 0) },
      });
    }
  },

  // ── Laughter ──

  laugh(dur = 0.6) {
    const count = 6;
    const noteLen = dur / count;
    for (let i = 0; i < count; i++) {
      const base = VOICE.base * 1.2 + i * 20;
      const f = i % 2 === 0 ? base * 1.15 : base * 0.88;
      tone({
        type: VOICE.timbre, freq: [f, f * 1.15, f * 0.9],
        duration: noteLen * 0.85, delay: i * noteLen,
      });
    }
  },

  laugh_big(dur = 0.8) {
    const count = 8;
    const noteLen = dur / count;
    for (let i = 0; i < count; i++) {
      const base = VOICE.base * 1.1 + i * 15;
      const f = i % 2 === 0 ? base * 1.25 : base * 0.78;
      tone({
        type: VOICE.timbre, freq: [f, f * 1.2, f * 0.85],
        duration: noteLen * 0.85, delay: i * noteLen,
        volume: 0.7 + (i / count) * 0.3,
      });
    }
  },

  // ── Emotional ──

  whimper(dur = 0.4) {
    tone({
      type: VOICE.timbre, freq: [VOICE.base * 1.1, VOICE.base * 0.77],
      duration: dur, vibrato: { rate: 8, depth: 15 },
    });
  },

  giggle(dur = 0.5) {
    repeat(4, {
      type: VOICE.timbre, freq: VOICE.base * 1.3, variation: VOICE.range,
      duration: dur / 4 * 0.8, gap: dur / 4 * 0.2,
    });
  },

  breathe_in(dur = 1.24) {
    tone({ type: 'sine', freq: [405, 975], duration: dur, attack: 0.001, release: 0.55, volume: 4, vibrato: { rate: 14, depth: 56 }, filter: { type: 'highpass', freq: 3390, Q: 12.9 } });
  },

  breathe_in_b(dur = 1.24) {
    tone({ type: 'sine', freq: [160, 690], duration: dur, attack: 0.001, release: 0.55, volume: 4, vibrato: { rate: 14, depth: 56 }, filter: { type: 'highpass', freq: 3390, Q: 12.9 } });
  },

  breathe_out(dur = 2) {
    tone({ type: 'sine', freq: [980, 520], duration: dur, attack: 0.001, release: 0.7, volume: 4, vibrato: { rate: 20, depth: 74 }, filter: { type: 'highpass', freq: 3840, Q: 0.1 } });
  },

  breathe_out_b(dur = 1.24) {
    tone({ type: 'sine', freq: [600, 380], duration: dur, attack: 0.001, release: 0.55, volume: 4, vibrato: { rate: 14, depth: 56 }, filter: { type: 'highpass', freq: 3390, Q: 12.9 } });
  },

  snore_cycle(dur = 3.2) {
    sounds.snore_inhale();
    sounds.snore_exhale();
  },

  snore_inhale() {
    if (Math.random() > 0.5) {
      tone({ type: 'sine', freq: [405, 975], duration: 1.24, attack: 0.001, release: 0.55, volume: 4, vibrato: { rate: 14, depth: 56 }, filter: { type: 'highpass', freq: 3390, Q: 12.9 } });
    } else {
      tone({ type: 'sine', freq: [160, 690], duration: 1.24, attack: 0.001, release: 0.55, volume: 4, vibrato: { rate: 14, depth: 56 }, filter: { type: 'highpass', freq: 3390, Q: 12.9 } });
    }
  },

  snore_exhale() {
    if (Math.random() > 0.5) {
      tone({ type: 'sine', freq: [980, 520], duration: 2, attack: 0.001, release: 0.7, volume: 4, vibrato: { rate: 20, depth: 74 }, filter: { type: 'highpass', freq: 3840, Q: 0.1 } });
    } else {
      tone({ type: 'sine', freq: [600, 380], duration: 1.24, attack: 0.001, release: 0.55, volume: 4, vibrato: { rate: 14, depth: 56 }, filter: { type: 'highpass', freq: 3390, Q: 12.9 } });
    }
  },

  yawn_sound(dur = 1.0) {
    tone({ type: 'sine', freq: [200, 350, 150], duration: dur, attack: dur * 0.2 });
  },
};

// ── Play a named sound ──

export function play(name, duration) {
  const fn = sounds[name];
  if (!fn) return;
  resume();
  fn(duration);
}

// ── List all sound names ──

export function list() {
  return Object.keys(sounds);
}

// ══════════════════════════════════════════
// TTS — Blocky speaks words in creature voice
// Uses Web Speech API with extreme pitch/rate
// ══════════════════════════════════════════

const TTS_DEFAULTS = {
  pitch: 1.8,     // high pitch (0-2)
  rate: 1.4,      // fast rate
  volume: 0.8,
};

let ttsVoice = null;

// Find a suitable voice — prefer small/compact voices
function getTTSVoice() {
  if (ttsVoice) return ttsVoice;
  const voices = speechSynthesis.getVoices();
  // Prefer a higher-pitched voice if available
  ttsVoice = voices.find(v => /female|girl|child/i.test(v.name))
    || voices.find(v => v.lang.startsWith('en'))
    || voices[0];
  return ttsVoice;
}

// Preload voices (some browsers need this)
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => { ttsVoice = null; getTTSVoice(); };
}

// Speak a word in Blocky's creature voice
export function speak(word, opts = {}) {
  if (!('speechSynthesis' in window)) return;
  resume();

  const utter = new SpeechSynthesisUtterance(word);
  const voice = getTTSVoice();
  if (voice) utter.voice = voice;

  utter.pitch = opts.pitch ?? TTS_DEFAULTS.pitch;
  utter.rate = opts.rate ?? TTS_DEFAULTS.rate;
  utter.volume = opts.volume ?? TTS_DEFAULTS.volume;

  // Play a babble chirp before the word — creature "trying" to speak
  if (opts.preBabble !== false) {
    const f = VOICE.base * (1 + Math.random() * 0.3);
    tone({ type: VOICE.timbre, freq: [f, f * 1.2], duration: 0.08,
      filter: { type: 'bandpass', freq: VOICE.formant, Q: VOICE.formantQ } });
  }

  speechSynthesis.speak(utter);

  return utter;
}

// Blocky's known vocabulary — words it has "learned"
const vocabulary = new Set(['blocky']);

export function learnWord(word) {
  vocabulary.add(word.toLowerCase());
}

export function forgetWords() {
  vocabulary.clear();
  vocabulary.add('blocky');
}

export function getVocabulary() {
  return [...vocabulary];
}

// Speak if Blocky knows the word, otherwise babble
export function trySpeak(word) {
  if (vocabulary.has(word.toLowerCase())) {
    speak(word);
    return true;
  }
  // Don't know this word — babble instead
  sounds.babble_fast(0.3);
  return false;
}
