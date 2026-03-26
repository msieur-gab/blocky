// ══════════════════════════════════════════
// Revoice — the creature tries to say a word
// Hesitant first, confident on confirmation
// Core capability used by onboarding, faces, skills
// ══════════════════════════════════════════

import { speakWord, syllabify } from './utils/phonemes.js';
import { VOICE, play, resume } from './services/voice.js';
import * as faceApi from './face-api.js';

// ══════════════════════════════════════════
// Attempt levels
// ══════════════════════════════════════════

// Level 1: Hesitant — slow, broken syllables, questioning face
// Level 2: Trying — faster, more connected, curious face
// Level 3: Confident — full speed, happy face, celebration

function attempt(word, level = 1) {
  resume();

  const syllables = syllabify(word);
  const syllableCount = syllables.filter(s => !s.pause).length;

  if (syllableCount === 0) return 0.3;

  let opts;
  switch (level) {
    case 1: // Hesitant
      opts = {
        syllableDur: 0.20,  // slow
        gap: 0.15,           // big pauses between syllables
      };
      break;
    case 2: // Trying
      opts = {
        syllableDur: 0.14,
        gap: 0.06,
      };
      break;
    case 3: // Confident
    default:
      opts = {
        syllableDur: 0.10,  // fast
        gap: 0.03,           // connected
      };
      break;
  }

  // Modify voice pitch by level
  const voiceCopy = {
    ...VOICE,
    base: VOICE.base * (level === 1 ? 1.1 : level === 2 ? 1.0 : 0.95), // higher pitch when unsure
  };

  return speakWord(word, voiceCopy, opts);
}

// ══════════════════════════════════════════
// Revoice with face expressions
// ══════════════════════════════════════════

// Hesitant attempt — "...do...do?"
export function tryHesitant(word) {
  faceApi.react('thinking');

  const duration = attempt(word, 1);

  // After speaking, show questioning face
  setTimeout(() => {
    faceApi.mood('curious');
    play('chirp_short');
  }, (duration + 0.2) * 1000);

  return duration + 0.5;
}

// More confident — "dodo?"
export function tryAgain(word) {
  faceApi.mood('curious');
  play('chirp_up');

  setTimeout(() => {
    attempt(word, 2);
  }, 200);

  const duration = 0.2 + attempt(word, 2);
  return duration + 0.3;
}

// Confident celebration — "Dodo!"
export function sayConfident(word) {
  play('chirp_up');

  setTimeout(() => {
    attempt(word, 3);
  }, 100);

  setTimeout(() => {
    faceApi.react('face_enrolled');
    play('fanfare');
  }, 600);

  return 1.5;
}

// Just say the word (no face, for ongoing use)
export function say(word, level = 3) {
  resume();
  return attempt(word, level);
}

// ══════════════════════════════════════════
// Revoice confirmation loop
// Used by onboarding: speak → listen → confirm
// Returns a promise that resolves with the confirmed word
// ══════════════════════════════════════════

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

export function confirmWord(word, maxAttempts = 3) {
  return new Promise((resolve) => {
    let attempts = 0;

    function tryOnce() {
      attempts++;

      if (attempts > maxAttempts) {
        // Give up — use what we have
        sayConfident(word);
        setTimeout(() => resolve(word), 2000);
        return;
      }

      // Speak the word hesitantly (first) or with more confidence (subsequent)
      const level = attempts === 1 ? 1 : 2;
      const duration = attempt(word, level);

      // Show appropriate face
      if (level === 1) {
        faceApi.react('thinking');
      } else {
        faceApi.mood('curious');
      }

      // After speaking, listen for confirmation
      setTimeout(() => {
        faceApi.mood('curious');
        listenOnce((heard) => {
          if (!heard) {
            // No response — try again
            play('babble_question');
            setTimeout(tryOnce, 800);
            return;
          }

          const clean = heard.toLowerCase().trim();

          // Check if they confirmed
          if (isConfirmation(clean, word)) {
            // Confirmed!
            sayConfident(word);
            setTimeout(() => resolve(word), 2000);
            return;
          }

          // Check if they said a new/different name
          const newWord = extractLastWord(clean);
          if (newWord && newWord.toLowerCase() !== word.toLowerCase()) {
            // They're correcting — try the new word
            word = newWord;
            setTimeout(tryOnce, 500);
            return;
          }

          // Unclear — try again
          play('babble_question');
          setTimeout(tryOnce, 800);
        });
      }, (duration + 0.4) * 1000);
    }

    tryOnce();
  });
}

// ══════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════

function isConfirmation(heard, word) {
  const w = word.toLowerCase();
  const h = heard.toLowerCase();

  // Direct confirmation words
  if (/^(yes|yeah|yep|yay|correct|right|that's right|exactly)/.test(h)) return true;

  // They repeated the name (with possible extras)
  if (h.includes(w)) return true;

  // Name + confirmation: "dodo yes", "yes dodo"
  if (h.includes(w) && /yes|yeah|right|correct/.test(h)) return true;

  return false;
}

function extractLastWord(text) {
  const skip = new Set([
    'yes', 'yeah', 'no', 'nah', 'not', 'nope', 'the', 'a', 'is', 'it',
    'your', 'you', 'my', 'name', 'call', 'called', 'that', 'right',
    'correct', 'exactly', 'i', 'want', 'to', 'um', 'uh',
  ]);

  const words = text.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].replace(/[^a-z]/gi, '').toLowerCase();
    if (w.length >= 2 && !skip.has(w)) return w.charAt(0).toUpperCase() + w.slice(1);
  }
  return null;
}

function listenOnce(callback) {
  if (!SR) { callback(null); return; }

  const rec = new SR();
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'en-US';

  let called = false;
  const done = (text) => {
    if (called) return;
    called = true;
    callback(text);
  };

  rec.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript || '';
    done(text.trim());
  };

  rec.onerror = () => done(null);
  rec.onend = () => done(null);

  try { rec.start(); } catch (e) { done(null); }
}
