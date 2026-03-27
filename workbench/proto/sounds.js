// ══════════════════════════════════════════
// Sound Catalog
// Wraps synth.js — each sound is a named recipe
// ══════════════════════════════════════════

import { init as synthInit, tone, noise, seq } from '../../js/utils/synth.js';

let ready = false;
let audioCtx = null;

export function init() {
  if (ready) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const master = audioCtx.createGain();
  master.gain.value = 0.7;
  master.connect(audioCtx.destination);
  synthInit(audioCtx, master);
  ready = true;
}

export function resume() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function play(name) {
  init();
  if (catalog[name]) catalog[name]();
}

export const catalog = {

  // ── Breathing ──
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

  // ── Vocal ──
  yawn() {
    tone({ type: 'sine', freq: [200, 350, 150], duration: 1.0, attack: 0.2 });
  },

  hum_sad() {
    tone({ type: 'sine', freq: [250, 200], duration: 0.6, attack: 0.1, vibrato: { rate: 4, depth: 6 } });
  },

  // ── Chirps ──
  chirp_up() {
    tone({ type: 'sine', freq: [400, 900], duration: 0.15 });
  },

  chirp_down() {
    tone({ type: 'sine', freq: [800, 300], duration: 0.15 });
  },

  babble_excited() {
    seq([
      { freq: [350, 500], dur: 0.08 },
      { freq: [500, 650], dur: 0.08 },
      { freq: [400, 700], dur: 0.1 },
    ], { gap: 0.02 });
  },
};
