// ══════════════════════════════════════════
// Ears Service — Two-stage listening
// Stage 1: Wake word detection (lightweight)
// Stage 2: Active listening (full speech)
// The wake word IS the creature's name
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as memory from './memory.js';

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let creatureName = null;       // the child's chosen name for ami.b
let stage = 'off';             // 'off' | 'wake' | 'active'
let wakeTimer = null;
let activeTimer = null;
let transcript = '';
let history = [];
const MAX_HISTORY = 5;

// Timing
const WAKE_LISTEN_MS = 2500;   // listen window in wake mode
const WAKE_PAUSE_MS = 1000;    // pause between wake windows
const ACTIVE_TIMEOUT_MS = 12000; // return to wake after silence

// Restarting the recognizer
const MAX_FAILURES = 5;        // real errors in a row before giving up
let failures = 0;
let lastError = null;
let restartTimer = null;
let heardStart = false;        // the recognizer said it began listening since the last start()

// ── Init ──

export async function init() {
  if (!SR) {
    console.warn('[ears] Web Speech API not available');
    bus.emit('ear:unavailable');
    return;
  }

  // Load creature name from memory
  creatureName = await memory.getCreatureName();

  // Always start in active listening mode for now
  // Wake word system is built but not stable enough yet
  // TODO: re-enable wake mode when onboarding + revoice are tested
  console.log(`[ears] Active listening (creature name: "${creatureName || 'none'}")`);
  startActive();
}

// ── Stage 1: Wake word detection ──

function startWake() {
  stage = 'wake';

  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript?.toLowerCase() || '';
    console.log(`[ears:wake] Heard: "${text}"`);

    if (matchesWakeWord(text)) {
      console.log(`[ears] Wake word detected: "${creatureName}"`);
      bus.emit('ami:wake', { name: creatureName });
      stopWake();
      startActive();
    }
  };

  recognition.onend = () => {
    if (stage !== 'wake') return;
    // Pause then listen again
    wakeTimer = setTimeout(() => {
      if (stage === 'wake') {
        try { recognition.start(); } catch (e) { /* noop */ }
      }
    }, WAKE_PAUSE_MS);
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      console.warn('[ears] Microphone denied');
      bus.emit('ear:denied');
      return;
    }
    // Restart on transient errors
    if (stage === 'wake') {
      wakeTimer = setTimeout(() => {
        try { recognition.start(); } catch (ex) { /* noop */ }
      }, WAKE_PAUSE_MS);
    }
  };

  try {
    recognition.start();
  } catch (e) {
    console.warn('[ears] Failed to start wake detection:', e);
  }
}

function stopWake() {
  if (wakeTimer) { clearTimeout(wakeTimer); wakeTimer = null; }
  if (recognition && stage === 'wake') {
    recognition.onend = null;
    try { recognition.stop(); } catch (e) { /* noop */ }
  }
}

// ── Stage 2: Active listening ──

function startActive() {
  stage = 'active';
  transcript = '';
  failures = 0;

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    let finalText = '';
    let interimText = '';

    failures = 0;     // it heard something: the service works

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const result = e.results[i];
      const text = result[0].transcript;

      if (result.isFinal) {
        finalText += text;
      } else {
        interimText += text;
      }
    }

    if (finalText.trim()) {
      const sentence = finalText.trim();
      history.push(sentence);
      while (history.length > MAX_HISTORY) history.shift();
      transcript = history.join(' ') + (interimText ? ' ' + interimText : '');

      bus.emit('ear:sentence', sentence);
      bus.emit('ear:transcript', transcript);

      // Reset active timeout — child is still talking
      resetActiveTimeout();
    }

    if (interimText.trim()) {
      transcript = history.join(' ') + ' ' + interimText.trim();
      bus.emit('ear:interim', interimText.trim());
      bus.emit('ear:transcript', transcript);
    }
  };

  // The recognizer stops by itself after every phrase or silence, and is started again here.
  // One restart path only (onend), with a growing pause when it keeps failing: restarting at once,
  // from both onend and onerror, hammered the microphone in browsers that have no speech service
  // (Brave), made the page stutter, and never recognized anything.
  recognition.onstart = () => { heardStart = true; };

  recognition.onend = () => {
    if (stage !== 'active') return;
    // Brave has the API but no speech service behind it: start() is followed by an end,
    // with no start and no error in between. That is a failure too.
    if (!heardStart) { failures++; lastError = lastError || 'no-service'; }
    if (failures >= MAX_FAILURES) {
      console.warn(`[ears] Speech recognition is not working here (${lastError}); giving up`);
      stage = 'off';
      bus.emit('ear:unavailable', { reason: lastError });
      return;
    }
    const pause = failures === 0 ? 250 : Math.min(8000, 500 * 2 ** failures);
    restartTimer = setTimeout(() => {
      if (stage !== 'active') return;
      heardStart = false;
      try { recognition.start(); } catch (e) { /* already started */ }
    }, pause);
  };

  recognition.onerror = (e) => {
    lastError = e.error;
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      stage = 'off';
      bus.emit('ear:denied');
      return;
    }
    // Silence and a deliberate stop are normal; anything else counts against the service
    if (e.error !== 'no-speech' && e.error !== 'aborted') failures++;
  };

  // Active timeout: return to wake after silence
  resetActiveTimeout();

  try {
    heardStart = false;
    recognition.start();
    bus.emit('ear:listening');
    bus.emit('ear:ready');
    console.log('[ears] Active listening started');
  } catch (e) {
    console.warn('[ears] Failed to start active listening:', e);
  }
}

function resetActiveTimeout() {
  // Disabled: active timeout was causing ears to go silent mid-session
  // TODO: re-enable when wake word system is stable
}

function stopActive() {
  if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  if (recognition && stage === 'active') {
    recognition.onend = null;
    try { recognition.stop(); } catch (e) { /* noop */ }
  }
  stage = 'off';
}

// ── Naming ceremony ──

export async function setName(name) {
  creatureName = name;
  await memory.setCreatureName(name);
  console.log(`[ears] Creature named: "${name}"`);
  bus.emit('ami:named', { name });
}

// ── Public API ──

export function getTranscript() { return transcript; }
export function getStage() { return stage; }
export function getCreatureName() { return creatureName; }

export function stop() {
  stopWake();
  stopActive();
  stage = 'off';
}

// Force active mode (bypass wake word — for first-use or testing)
export function forceActive() {
  stopWake();
  startActive();
}

// ── Fuzzy wake word matching ──
// Kids say "dodo" but speech recognition might hear "do do", "doodle", "du du", "doudou"
// Match with tolerance for common speech-to-text variations

function matchesWakeWord(text) {
  if (!creatureName) return false;

  const name = creatureName.toLowerCase();
  const heard = text.toLowerCase();

  // Exact match
  if (heard.includes(name)) return true;

  // Build fuzzy variants from the name
  const variants = buildVariants(name);
  for (const v of variants) {
    if (heard.includes(v)) return true;
  }

  // Check each word against name with edit distance (generous: up to 2)
  const words = heard.split(/\s+/);
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (clean.length >= 2 && editDistance(clean, name) <= 2) {
      return true;
    }
  }

  // Check consecutive word pairs (catches "doo doo" → "doodoo")
  for (let i = 0; i < words.length - 1; i++) {
    const merged = words[i].replace(/[^a-z]/g, '') + words[i + 1].replace(/[^a-z]/g, '');
    if (editDistance(merged, name) <= 2) {
      return true;
    }
  }

  return false;
}

function buildVariants(name) {
  const variants = new Set();

  // With spaces: "dodo" → "do do"
  for (let i = 1; i < name.length; i++) {
    variants.add(name.slice(0, i) + ' ' + name.slice(i));
  }

  // Vowel swaps: "dodo" → "doudou", "dudu", "doodoo", etc.
  const vowelSwaps = {
    'o': ['ou', 'oo', 'u', 'aw'],
    'u': ['ou', 'oo', 'o'],
    'a': ['ah', 'aa', 'uh'],
    'e': ['ee', 'eh', 'ay'],
    'i': ['ee', 'y', 'ie'],
  };
  for (const [from, tos] of Object.entries(vowelSwaps)) {
    for (const to of tos) {
      if (name.includes(from)) {
        variants.add(name.replaceAll(from, to));
      }
    }
  }

  // Explicit common mishearings for short names
  // "dodo" specific but pattern works for others
  variants.add(name + name.slice(-2)); // "dododo"
  variants.add(name.slice(0, 2) + ' ' + name.slice(0, 2)); // "do do"
  variants.add(name.slice(0, 3) + ' ' + name.slice(0, 3)); // "dod dod"
  variants.add(name + 'le');  // "doodle"
  variants.add(name + 'dle'); // "dododle"
  variants.add(name + 's');
  variants.add('hey ' + name);
  variants.add('hey ' + name.slice(0, 2) + ' ' + name.slice(2));

  return variants;
}

function editDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}
