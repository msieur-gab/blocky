// ══════════════════════════════════════════
// Companion State Machine
// Mood from intents + faces. Sensors feed energy.
// ══════════════════════════════════════════

import { bus } from './utils/events.js';
import { INTENT_MAP } from './services/intent.js';
import { setRadioMode } from './face.js';

export const state = {
  mood: 'calm',
  energy: 0.3,
  mode: 'presence',
  attention: 0.5,
  silenceDuration: 0,
  interactionCount: 0,
  currentFace: null,   // { name, role } of last recognized person
  lastIntent: null,    // last classified intent name
};

export function init() {
  // ── Intent reactions (replaces command:matched) ──
  bus.on('intent:classified', ({ intent, entities, confidence }) => {
    state.lastIntent = intent;

    // Radio: auto-play on music intent, stop on anything else
    if (intent === 'music') {
      setRadioMode(true, true); // activate + auto-play
    } else if (state.lastIntent === 'music' && intent !== 'music') {
      setRadioMode(false);
    }

    const mapping = INTENT_MAP[intent];
    if (mapping) {
      state.mood = mapping.mood;
      state.attention = 1;
      state.silenceDuration = 0;
      state.interactionCount++;
      bus.emit('reaction:trigger', mapping.reaction);
    }
  });

  // ── Face reactions ──
  bus.on('face:recognized', ({ id, name, role, confidence }) => {
    state.currentFace = { name, role };
    state.attention = 1;
    state.silenceDuration = 0;
    state.mood = 'happy';
    state.interactionCount++;
    bus.emit('reaction:trigger', 'face_recognized');
    console.log(`[companion] Recognized ${name} (${role}, ${(confidence * 100).toFixed(0)}%)`);
  });

  bus.on('face:unknown', () => {
    state.currentFace = null;
    // Don't override mood — face:unknown is informational, not disruptive
  });

  bus.on('face:enrolled', ({ name, role }) => {
    state.currentFace = { name, role };
    state.mood = 'excited';
    state.attention = 1;
    state.interactionCount++;
    bus.emit('reaction:trigger', 'face_enrolled');
    console.log(`[companion] Enrolled ${name} as ${role}`);
  });
}

export function update(dt, sensorState) {
  // Energy: rises with shake, decays over time
  if (sensorState.shake > 0.2) {
    state.energy = Math.min(1, state.energy + dt * 0.5);
  } else {
    state.energy = Math.max(0.1, state.energy - dt * 0.02);
  }

  // Attention decays
  state.attention = Math.max(0, state.attention - dt * 0.01);

  // Silence grows when no interaction
  state.silenceDuration += dt;
}
