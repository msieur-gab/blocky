// ══════════════════════════════════════════
// Companion State Machine
// Mood from intents + faces + games. Sensors feed energy.
// ══════════════════════════════════════════

import { bus } from './utils/events.js';
import { INTENT_MAP } from './services/intent.js';
import { setRadioMode, setScanning, isRadioPlaying } from './face.js';
import { makeTimeExpression, makeMinuteExpression } from './expressions.js';
import { play as playSound } from './services/voice.js';
import * as gestures from './services/gestures.js';
import * as rps from './games/rps.js';

export const state = {
  mood: 'calm',
  energy: 0.3,
  mode: 'presence',   // 'presence' | 'game' | 'look'
  attention: 0.5,
  silenceDuration: 0,
  interactionCount: 0,
  currentFace: null,
  lastIntent: null,
  _lookTimeout: null,
};

export function init() {
  // ── Intent reactions ──
  bus.on('intent:classified', ({ intent, entities, confidence }) => {
    const prevIntent = state.lastIntent;
    state.lastIntent = intent;

    // Always reset interaction state
    state.attention = 1;
    state.silenceDuration = 0;
    state.interactionCount++;

    // ── Mode transitions ──

    // Radio: only stop on explicit stop intent, not on every other intent
    if (intent === 'music') {
      setRadioMode(true, true);
    } else if (intent === 'stop' && isRadioPlaying()) {
      setRadioMode(false);
    }

    // Look mode
    if (intent === 'look' && state.mode === 'presence') {
      state.mode = 'look';
      setScanning(true);
      gestures.start();
      if (state._lookTimeout) clearTimeout(state._lookTimeout);
      state._lookTimeout = setTimeout(() => {
        if (state.mode === 'look') stopLookMode();
      }, 10000);
    } else if (state.mode === 'look' && intent !== 'look') {
      stopLookMode();
    }

    // Time
    if (intent === 'time') {
      showTime();
      return;
    }

    // Game mode
    if (intent === 'play' && state.mode === 'presence') {
      state.mode = 'game';
      rps.start();
      return;
    }
    if (state.mode === 'game' && intent !== 'play') {
      rps.stop();
      state.mode = 'presence';
    }

    // Stop intent: universal exit
    if (intent === 'stop') {
      if (state.mode === 'game') { rps.stop(); }
      if (state.mode === 'look') { stopLookMode(); }
      state.mode = 'presence';
      state.mood = 'calm';
      return;
    }

    // ── Trigger reaction from intent map ──
    const mapping = INTENT_MAP[intent];
    if (mapping) {
      state.mood = mapping.mood;
      if (mapping.reaction) bus.emit('reaction:trigger', mapping.reaction);
    }
  });

  // ── Game events → face expressions ──

  bus.on('game:countdown', ({ number }) => {
    bus.emit('expression:override', `countdown_${number}`);
  });

  bus.on('game:reveal', ({ move }) => {
    bus.emit('expression:override', `rps_${move}`);
  });

  bus.on('game:result', ({ winner }) => {
    bus.emit('expression:override', null);
    if (winner === 'blocky') state.mood = 'happy';
    else if (winner === 'player') state.mood = 'sad';
    else state.mood = 'calm';
  });

  bus.on('game:over', ({ winner }) => {
    bus.emit('expression:override', null);
    bus.emit('reaction:trigger', winner === 'player' ? 'game_over_player' : 'game_over_blocky');
  });

  bus.on('game:end', () => {
    state.mode = 'presence';
    state.mood = 'calm';
    bus.emit('expression:override', null);
  });

  bus.on('game:no_hand', () => {
    bus.emit('expression:override', 'curious');
  });

  // ── Gesture reactions (presence / look mode) ──
  bus.on('gesture:detected', ({ gesture }) => {
    if (state.mode === 'game') return;

    const GESTURE_REACTIONS = {
      heart:      { reaction: 'love',          mood: 'happy' },
      thumbsup:   { reaction: 'child_laughed', mood: 'happy' },
      thumbsdown: { reaction: 'child_sad',     mood: 'sad' },
      love_sign:  { reaction: 'love',          mood: 'happy' },
      paper:      { reaction: 'surprised',     mood: 'excited' },
      point:      { reaction: 'curious_loop',  mood: 'curious' },
    };

    const mapping = GESTURE_REACTIONS[gesture];
    if (mapping) {
      console.log(`[companion] Gesture: ${gesture} → ${mapping.reaction}`);
      state.mood = mapping.mood;
      state.attention = 1;
      state.interactionCount++;
      bus.emit('reaction:trigger', mapping.reaction);

      if (state.mode === 'look') {
        setTimeout(() => stopLookMode(), 500);
      }
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

// ── Time display ──

function showTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  const hourExpr = makeTimeExpression(h, m);
  const minExpr = makeMinuteExpression(m);

  playSound('chirp_up');
  bus.emit('expression:raw', hourExpr);

  setTimeout(() => playSound('countdown_beep'), 300);

  setTimeout(() => {
    bus.emit('expression:raw', null);
  }, 1800);

  setTimeout(() => {
    playSound('chirp_short');
    bus.emit('expression:raw', minExpr);
  }, 2200);

  setTimeout(() => playSound('countdown_beep'), 2500);

  setTimeout(() => {
    bus.emit('expression:raw', null);
    playSound('chirp_down');
  }, 4200);

  console.log(`[companion] Time: ${h}:${String(m).padStart(2, '0')}`);
}

// ── Look mode ──

function stopLookMode() {
  if (state.mode !== 'look') return;
  state.mode = 'presence';
  setScanning(false);
  gestures.stop();
  if (state._lookTimeout) {
    clearTimeout(state._lookTimeout);
    state._lookTimeout = null;
  }
  console.log('[companion] Look mode ended');
}

// ── Update ──

export function update(dt, sensorState) {
  if (sensorState.shake > 0.2) {
    state.energy = Math.min(1, state.energy + dt * 0.5);
  } else {
    state.energy = Math.max(0.1, state.energy - dt * 0.02);
  }

  state.attention = Math.max(0, state.attention - dt * 0.01);
  state.silenceDuration += dt;
}
