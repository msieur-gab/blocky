// ══════════════════════════════════════════
// Onboarding — First encounter
// Two creatures meeting for the first time
// No text, no buttons. Just face + voice.
// ══════════════════════════════════════════

import * as faceApi from './face-api.js';
import * as memory from './services/memory.js';
import * as faces from './services/faces.js';
import { play as playSound } from './services/voice.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let phase = 'idle';   // idle | waking | naming | meeting | scanning | done
let recognition = null;
let onComplete = null;

// ══════════════════════════════════════════
// Public API
// ══════════════════════════════════════════

export async function needed() {
  const name = await memory.getCreatureName();
  return !name;
}

export function start(callback) {
  onComplete = callback;
  phase = 'waking';
  console.log('[onboarding] Starting first encounter');

  // Phase 1: Waking up
  wakeUp();
}

export function getPhase() { return phase; }

// ══════════════════════════════════════════
// Phase 1: Waking up
// Eyes closed → child taps → eyes open, curious
// ══════════════════════════════════════════

function wakeUp() {
  // Start sleepy, then wake
  faceApi.mood('sleepy');

  setTimeout(() => {
    playSound('chirp_up');
    faceApi.react('greet');
    faceApi.mood('curious');
  }, 800);

  // Babble, look around
  setTimeout(() => {
    playSound('babble_slow');
    faceApi.react('attention');
  }, 2500);

  // Then wait and listen — transition to naming
  setTimeout(() => {
    phase = 'naming';
    askForName();
  }, 5000);
}

// ══════════════════════════════════════════
// Phase 2: "What's my name?"
// ami.b shows curious/questioning expression
// Listens for any word → that becomes the name
// ══════════════════════════════════════════

function askForName() {
  // Questioning expression — ami.b wants to know its name
  faceApi.mood('curious');
  faceApi.react('curious_loop');
  playSound('babble_question');

  // Listen for the child to speak
  listenOnce((text) => {
    if (!text || text.trim().length < 2) {
      // Didn't catch it — try again
      playSound('babble_question');
      faceApi.react('curious_loop');
      listenOnce(onCreatureName);
      return;
    }
    onCreatureName(text);
  });
}

async function onCreatureName(text) {
  // Extract the most likely name (last word, or first capitalized word)
  const name = extractName(text);

  console.log(`[onboarding] Creature named: "${name}"`);
  await memory.setCreatureName(name);

  // Celebrate — ami.b loves its new name!
  phase = 'meeting';
  playSound('fanfare');
  faceApi.react('face_enrolled'); // starry eyes + excitement
  faceApi.mood('excited');

  // Move to meeting phase after celebration
  setTimeout(() => askForKidName(), 3000);
}

// ══════════════════════════════════════════
// Phase 3: "What's YOUR name?"
// ami.b babbles curiously — wants to know the kid
// ══════════════════════════════════════════

function askForKidName() {
  faceApi.mood('curious');
  playSound('babble_question');

  // Slight pause then listen
  setTimeout(() => {
    faceApi.react('thinking');

    listenOnce((text) => {
      if (!text || text.trim().length < 2) {
        // Try again
        playSound('chirp_short');
        listenOnce(onKidName);
        return;
      }
      onKidName(text);
    });
  }, 800);
}

async function onKidName(text) {
  const name = extractName(text);

  console.log(`[onboarding] Kid's name: "${name}"`);
  await memory.setConfig('kidName', name);

  // Happy — ami.b knows its friend now!
  playSound('chirp_up');
  faceApi.react('love');
  faceApi.mood('happy');

  // Log to journal
  await memory.log({
    category: 'onboarding',
    skillId: 'system',
    data: { event: 'kid_named', name },
  });

  // Move to face scanning
  setTimeout(() => scanFace(name), 3000);
}

// ══════════════════════════════════════════
// Phase 4: Face scan
// ami.b's eyes become the scanner
// Captures the kid's face and enrolls it
// ══════════════════════════════════════════

async function scanFace(kidName) {
  phase = 'scanning';
  faceApi.mood('curious');
  playSound('chirp_short');

  // Trigger face enrollment with the kid's name
  // faces.js handles camera + detection + enrollment
  faces.enroll(kidName, 'owner');

  // Listen for enrollment result
  const { bus } = await import('./utils/events.js');

  const onEnrolled = () => {
    bus.off('face:enrolled', onEnrolled);
    bus.off('face:none', onFailed);

    console.log('[onboarding] Face enrolled');
    playSound('fanfare');
    faceApi.react('face_enrolled');
    faceApi.mood('happy');

    setTimeout(() => complete(), 3000);
  };

  const onFailed = () => {
    // No face detected — skip, we can enroll later
    bus.off('face:enrolled', onFailed);
    bus.off('face:none', onFailed);

    console.log('[onboarding] Face scan skipped');
    playSound('chirp_down');

    setTimeout(() => complete(), 1500);
  };

  bus.on('face:enrolled', onEnrolled);
  bus.on('face:none', onFailed);

  // Timeout fallback
  setTimeout(() => {
    if (phase === 'scanning') {
      bus.off('face:enrolled', onEnrolled);
      bus.off('face:none', onFailed);
      console.log('[onboarding] Face scan timeout');
      setTimeout(() => complete(), 1000);
    }
  }, 8000);
}

// ══════════════════════════════════════════
// Complete
// ══════════════════════════════════════════

async function complete() {
  phase = 'done';

  // Final celebration
  playSound('win');
  faceApi.react('child_laughed');
  faceApi.mood('happy');

  await memory.log({
    category: 'onboarding',
    skillId: 'system',
    data: { event: 'complete' },
  });

  console.log('[onboarding] Complete!');

  // Hand off to normal operation
  setTimeout(() => {
    if (onComplete) onComplete();
  }, 2000);
}

// ══════════════════════════════════════════
// Speech helpers
// ══════════════════════════════════════════

function listenOnce(callback) {
  if (!SR) {
    callback(null);
    return;
  }

  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript || '';
    recognition = null;
    callback(text.trim());
  };

  recognition.onerror = (e) => {
    if (e.error === 'no-speech') {
      // No speech — retry
      recognition = null;
      callback(null);
      return;
    }
    recognition = null;
    callback(null);
  };

  recognition.onend = () => {
    // If no result came, treat as silence
    if (recognition) {
      recognition = null;
      callback(null);
    }
  };

  try {
    recognition.start();
  } catch (e) {
    callback(null);
  }
}

function extractName(text) {
  if (!text) return 'ami';

  // Clean up
  const clean = text.trim();

  // If it's a single word, use it
  const words = clean.split(/\s+/);
  if (words.length === 1) {
    return capitalize(words[0]);
  }

  // Multiple words: take the last meaningful word
  // (kids often say "I want to call you Fluffy" or "my name is Tom")
  const skipWords = new Set([
    'i', 'my', 'me', 'the', 'a', 'is', 'am', 'you', 'your',
    'want', 'to', 'call', 'name', 'it', 'its', 'like', 'think',
    'um', 'uh', 'hmm', 'okay', 'so', 'well', 'let', 'be',
  ]);

  // Walk backwards to find the name
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].toLowerCase().replace(/[^a-z]/g, '');
    if (w.length >= 2 && !skipWords.has(w)) {
      return capitalize(w);
    }
  }

  // Fallback: first word
  return capitalize(words[0]);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
