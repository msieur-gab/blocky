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

// ── Init ──

export async function init() {
  if (!SR) {
    console.warn('[ears] Web Speech API not available');
    bus.emit('ear:unavailable');
    return;
  }

  // Load creature name from memory
  creatureName = await memory.getCreatureName();

  if (!creatureName) {
    // No name yet — go straight to active listening for naming ceremony
    console.log('[ears] No creature name set — entering naming mode');
    startActive();
    bus.emit('ear:naming');
    return;
  }

  console.log(`[ears] Listening for wake word: "${creatureName}"`);
  startWake();
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

    if (creatureName && text.includes(creatureName.toLowerCase())) {
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

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (e) => {
    let finalText = '';
    let interimText = '';

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

  recognition.onend = () => {
    if (stage === 'active') {
      try { recognition.start(); } catch (e) { /* noop */ }
    }
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      bus.emit('ear:denied');
      return;
    }
    if (stage === 'active') {
      setTimeout(() => {
        try { recognition.start(); } catch (ex) { /* noop */ }
      }, 500);
    }
  };

  // Active timeout: return to wake after silence
  resetActiveTimeout();

  try {
    recognition.start();
    bus.emit('ear:listening');
    console.log('[ears] Active listening started');
  } catch (e) {
    console.warn('[ears] Failed to start active listening:', e);
  }
}

function resetActiveTimeout() {
  if (activeTimer) clearTimeout(activeTimer);
  activeTimer = setTimeout(() => {
    if (stage === 'active' && creatureName) {
      console.log('[ears] Active timeout — returning to wake mode');
      stopActive();
      startWake();
      bus.emit('ami:sleep');
    }
  }, ACTIVE_TIMEOUT_MS);
}

function stopActive() {
  if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
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
