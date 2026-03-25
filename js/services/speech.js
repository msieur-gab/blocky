// ══════════════════════════════════════════
// Speech Service
// Web Speech API — continuous recognition
// Sentence-aware: emits per-sentence events
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';

let recognition = null;

// Current interim text being spoken (not yet finalized)
let interim = '';

// Last finalized sentence (for display)
let lastFinal = '';

// Rolling history of recent final sentences (for display)
const history = [];
const MAX_HISTORY = 5;

export function getTranscript() {
  // Show recent history + current interim
  const past = history.join(' ');
  const current = interim || '';
  return past + (past && current ? ' ' : '') + current;
}

export function getLastSentence() {
  return lastFinal;
}

export function init() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.warn('[speech] Web Speech API not available');
    bus.emit('speech:unavailable');
    return;
  }

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

    // New final sentence detected
    if (finalText.trim()) {
      lastFinal = finalText.trim();
      history.push(lastFinal);
      while (history.length > MAX_HISTORY) history.shift();
      interim = '';

      // Emit the completed sentence — this is what intent.js should classify
      bus.emit('speech:sentence', lastFinal);
      bus.emit('speech:transcript', getTranscript());
    }

    // Interim update (still speaking)
    if (interimText.trim()) {
      interim = interimText.trim();
      bus.emit('speech:interim', interim);
      bus.emit('speech:transcript', getTranscript());
    }
  };

  recognition.onend = () => {
    // Auto-restart for continuous listening
    try { recognition.start(); } catch (e) { /* already started */ }
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      console.warn('[speech] Microphone permission denied');
      bus.emit('speech:denied');
      return;
    }
    // Restart on transient errors
    setTimeout(() => {
      try { recognition.start(); } catch (ex) { /* noop */ }
    }, 500);
  };

  try {
    recognition.start();
    bus.emit('speech:ready');
  } catch (e) {
    console.warn('[speech] Failed to start:', e);
  }
}

export function stop() {
  if (recognition) {
    recognition.onend = null;
    try { recognition.stop(); } catch (e) { /* noop */ }
  }
}
