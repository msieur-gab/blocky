// ══════════════════════════════════════════
// Phoneme Synthesizer
// Splits words into syllables, speaks them
// Uses Blocky's voice identity
// ══════════════════════════════════════════

import { tone, noise } from './synth.js';

// ── Vowel/consonant classification ──

const VOWELS = new Set('aeiouy');
const VOICED = new Set('bdgjlmnrvwz');

// ── Formant table ──
// Each vowel has a target formant frequency that shapes the sound
// Consonants modify the onset/offset of the syllable

const VOWEL_FORMANTS = {
  a: { f1: 800,  f2: 1200, openness: 1.0 },
  e: { f1: 500,  f2: 1800, openness: 0.8 },
  i: { f1: 300,  f2: 2200, openness: 0.6 },
  o: { f1: 500,  f2: 900,  openness: 0.9 },
  u: { f1: 350,  f2: 700,  openness: 0.85 },
  y: { f1: 300,  f2: 2000, openness: 0.6 },
};

const CONSONANT_SHAPE = {
  // Plosives — short burst before vowel
  b: { onset: 'pop',    freqMult: 0.7,  dur: 0.03 },
  p: { onset: 'pop',    freqMult: 0.8,  dur: 0.025 },
  d: { onset: 'pop',    freqMult: 0.9,  dur: 0.03 },
  t: { onset: 'pop',    freqMult: 1.1,  dur: 0.025 },
  g: { onset: 'pop',    freqMult: 0.65, dur: 0.03 },
  k: { onset: 'pop',    freqMult: 1.2,  dur: 0.025 },

  // Fricatives — noise mixed with vowel
  s: { onset: 'hiss',   freq: 4000, dur: 0.06 },
  f: { onset: 'hiss',   freq: 3000, dur: 0.05 },
  h: { onset: 'hiss',   freq: 1500, dur: 0.04 },
  z: { onset: 'hiss',   freq: 3500, dur: 0.06, voiced: true },

  // Nasals — tone that transitions into vowel
  m: { onset: 'nasal',  freqMult: 0.9,  filter: 300, dur: 0.05 },
  n: { onset: 'nasal',  freqMult: 1.0,  filter: 400, dur: 0.05 },

  // Liquids — smooth glide into vowel
  l: { onset: 'glide',  freqMult: 1.05, dur: 0.04 },
  r: { onset: 'glide',  freqMult: 0.95, dur: 0.04, vibrato: { rate: 20, depth: 12 } },
  w: { onset: 'glide',  freqMult: 0.7,  dur: 0.04 },

  // Clusters - treat as single onset
  c: { onset: 'pop',    freqMult: 1.2,  dur: 0.025 }, // same as k
};

// ── Split word into syllables ──
// Simple rule: each vowel (or vowel group) is a syllable nucleus
// Consonants before attach as onset, after as coda

export function syllabify(word) {
  const chars = word.toLowerCase().replace(/[^a-z ]/g, '').split('');
  const syllables = [];
  let current = { onset: '', vowel: '', coda: '' };
  let inVowel = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (ch === ' ') {
      // Space = word boundary, push current and add pause
      if (current.vowel) syllables.push(current);
      syllables.push({ onset: '', vowel: '', coda: '', pause: true });
      current = { onset: '', vowel: '', coda: '' };
      inVowel = false;
      continue;
    }

    if (VOWELS.has(ch)) {
      if (inVowel) {
        // Consecutive vowels — extend current or start new syllable
        if (current.vowel.length < 2) {
          current.vowel += ch; // diphthong
        } else {
          syllables.push(current);
          current = { onset: '', vowel: ch, coda: '' };
        }
      } else {
        if (current.coda) {
          // Previous syllable had coda consonants — split: last consonant goes to new onset
          const lastCoda = current.coda.slice(-1);
          current.coda = current.coda.slice(0, -1);
          syllables.push(current);
          current = { onset: lastCoda, vowel: ch, coda: '' };
        } else if (current.vowel) {
          syllables.push(current);
          current = { onset: '', vowel: ch, coda: '' };
        } else {
          current.vowel = ch;
        }
        inVowel = true;
      }
    } else {
      inVowel = false;
      if (current.vowel) {
        current.coda += ch;
      } else {
        current.onset += ch;
      }
    }
  }

  if (current.vowel) syllables.push(current);
  return syllables;
}

// ── Speak a syllable ──

function speakSyllable(syl, voice, offset, syllableDur) {
  if (syl.pause) return 0.06; // short pause between words

  const vowelChar = syl.vowel[0] || 'a';
  const formant = VOWEL_FORMANTS[vowelChar] || VOWEL_FORMANTS.a;
  const baseFreq = voice.base;

  let t = offset;

  // Onset consonants
  for (const ch of syl.onset) {
    const con = CONSONANT_SHAPE[ch];
    if (!con) continue;

    switch (con.onset) {
      case 'pop':
        noise({
          duration: con.dur,
          delay: t,
          shape: 'decay',
          decayRate: 0.08,
          volume: 0.8,
          filter: { type: 'bandpass', freq: baseFreq * con.freqMult * 2, Q: 3 },
        });
        tone({
          type: voice.timbre,
          freq: [baseFreq * con.freqMult * 1.3, baseFreq * con.freqMult],
          duration: con.dur,
          delay: t,
          attack: 0.002,
          release: 0.5,
          volume: 0.6,
          filter: { type: 'bandpass', freq: formant.f1, Q: 2 },
        });
        break;

      case 'hiss':
        noise({
          duration: con.dur,
          delay: t,
          shape: 'sine',
          volume: 0.5,
          filter: { type: 'bandpass', freq: con.freq, Q: 1 },
        });
        if (con.voiced) {
          tone({
            type: voice.timbre,
            freq: baseFreq,
            duration: con.dur,
            delay: t,
            volume: 0.3,
            filter: { type: 'bandpass', freq: formant.f1, Q: 2 },
          });
        }
        break;

      case 'nasal':
        tone({
          type: voice.timbre,
          freq: baseFreq * con.freqMult,
          duration: con.dur,
          delay: t,
          attack: 0.01,
          release: 0.2,
          filter: { type: 'bandpass', freq: con.filter, Q: 4 },
        });
        break;

      case 'glide':
        tone({
          type: voice.timbre,
          freq: [baseFreq * con.freqMult, baseFreq],
          duration: con.dur,
          delay: t,
          attack: 0.01,
          release: 0.2,
          vibrato: con.vibrato,
          filter: { type: 'bandpass', freq: formant.f1, Q: 2 },
        });
        break;
    }
    t += con.dur;
  }

  // Vowel nucleus — the main body of the syllable
  const vowelDur = syllableDur * formant.openness;

  // Primary formant
  tone({
    type: voice.timbre,
    freq: baseFreq,
    duration: vowelDur,
    delay: t,
    attack: syl.onset ? 0.005 : 0.015,
    release: 0.3,
    vibrato: { rate: 5, depth: 5 },
    filter: { type: 'bandpass', freq: formant.f1, Q: 2.5 },
  });

  // Secondary formant (adds vowel character)
  tone({
    type: voice.timbre,
    freq: baseFreq * 1.5,
    duration: vowelDur,
    delay: t,
    attack: syl.onset ? 0.005 : 0.015,
    release: 0.3,
    volume: 0.3,
    filter: { type: 'bandpass', freq: formant.f2, Q: 3 },
  });

  t += vowelDur;

  // Coda consonants — trail off
  for (const ch of syl.coda) {
    const con = CONSONANT_SHAPE[ch];
    if (!con) continue;
    const codaDur = con.dur * 0.8; // codas are shorter

    if (con.onset === 'hiss') {
      noise({
        duration: codaDur,
        delay: t,
        shape: 'decay',
        decayRate: 0.15,
        volume: 0.4,
        filter: { type: 'bandpass', freq: con.freq, Q: 1 },
      });
    } else if (con.onset === 'nasal') {
      tone({
        type: voice.timbre,
        freq: baseFreq * con.freqMult,
        duration: codaDur,
        delay: t,
        volume: 0.5,
        filter: { type: 'bandpass', freq: con.filter, Q: 4 },
      });
    } else {
      // Plosive/glide coda — short stop
      tone({
        type: voice.timbre,
        freq: [baseFreq, baseFreq * (con.freqMult || 0.8)],
        duration: codaDur,
        delay: t,
        attack: 0.002,
        release: 0.5,
        volume: 0.5,
        filter: { type: 'bandpass', freq: formant.f1 * 0.8, Q: 2 },
      });
    }
    t += codaDur;
  }

  return t - offset;
}

// ── Speak a word ──

export function speakWord(word, voice, opts = {}) {
  const syllableDur = opts.syllableDur || 0.12;
  const gap = opts.gap || 0.03;
  const syllables = syllabify(word);

  let offset = 0;
  syllables.forEach(syl => {
    const dur = speakSyllable(syl, voice, offset, syllableDur);
    offset += dur + gap;
  });

  return offset;
}

// ── Get phoneme list (for UI) ──

export function listPhonemes() {
  return [...Object.keys(VOWEL_FORMANTS), ...Object.keys(CONSONANT_SHAPE)];
}
