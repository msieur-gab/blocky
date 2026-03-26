// ══════════════════════════════════════════
// Kernel — ami.b's tiny brain
// Routes intents to skills. That's it.
// ══════════════════════════════════════════

import { bus } from './utils/events.js';
import * as faceApi from './face-api.js';
import * as memory from './services/memory.js';
import * as voice from './services/voice.js';
import * as nlu from './services/nlu.js';

// ── State ──

export const state = {
  mood: 'calm',
  energy: 0.3,
  attention: 0.5,
  silenceDuration: 0,
  interactionCount: 0,
  currentFace: null,
  lastIntent: null,
};

// ── Skills ──

const skills = new Map();
let activeSkill = null;
let presenceSkill = null;

// ── Skill context factory ──

function makeContext(skill) {
  return {
    face: {
      mood:      (name) => faceApi.mood(name),
      react:     (name) => faceApi.react(name),
      override:  (expr) => faceApi.override(expr),
      overrideRaw: (obj) => faceApi.overrideRaw(obj),
      release:   () => faceApi.releaseOverride(),
      startScan: () => faceApi.startScan(),
      stopScan:  () => faceApi.stopScan(),
      setRadioMode: (on, auto) => faceApi.setRadioMode(on, auto),
      isRadioPlaying: () => faceApi.isRadioPlaying(),
    },
    voice: {
      play:   (name, dur) => voice.play(name, dur),
      babble: (style) => voice.sounds[`babble_${style}`]?.(),
      speak:  (word) => voice.speak(word),
    },
    memory: {
      log:       (data) => memory.log({ ...data, skillId: skill.id, category: data.category || skill.journal?.category || skill.id }),
      getConfig: (key) => memory.getConfig(key),
      setConfig: (key, val) => memory.setConfig(key, val),
      getFaces:  () => memory.getFaces(),
      putFace:   (r) => memory.putFace(r),
    },
    bus: {
      emit: (event, data) => bus.emit(`${skill.id}:${event}`, data),
      on:   (event, fn) => bus.on(`${skill.id}:${event}`, fn),
      onGlobal: (event, fn) => bus.on(event, fn),
    },
    state, // read-only reference to kernel state

    // Signal the kernel this skill is done — returns to presence
    done: () => {
      if (activeSkill === skill) {
        activeSkill = null;
        console.log(`[kernel] Skill done: ${skill.id}`);
      }
    },
  };
}

// ── Registration ──

export function register(skill) {
  skills.set(skill.id, skill);

  if (skill.id === 'presence') presenceSkill = skill;

  // Register reactions from skill
  if (skill.reactions) faceApi.registerReactions(skill.reactions);
  if (skill.exemplars) nlu.addExemplars(skill.exemplars);

  // Register skill in memory
  memory.registerSkill(skill.id, skill.name || skill.id);

  console.log(`[kernel] Registered skill: ${skill.id}`);
}

// ── Intent routing ──

function onIntent({ intent, entities, confidence, source }) {
  state.lastIntent = intent;
  state.attention = 1;
  state.silenceDuration = 0;
  state.interactionCount++;

  // 1. Active skill gets first shot
  if (activeSkill && activeSkill.handleIntent?.(intent, entities)) return;

  // 2. Find a skill that claims this intent
  for (const [id, skill] of skills) {
    if (id === 'presence') continue; // presence is fallback
    if (skill.intents?.includes(intent)) {
      activate(skill);
      skill.handleIntent?.(intent, entities);
      return;
    }
  }

  // 3. Presence skill (fallback)
  if (presenceSkill?.handleIntent) {
    presenceSkill.handleIntent(intent, entities);
  }
}

function activate(skill) {
  if (activeSkill && activeSkill !== skill) {
    activeSkill.deactivate?.();
    console.log(`[kernel] Deactivated: ${activeSkill.id}`);
  }

  if (skill.id === 'presence') {
    activeSkill = null; // presence is not "active" — it's the default
    return;
  }

  activeSkill = skill;
  skill.activate?.(makeContext(skill));
  console.log(`[kernel] Activated: ${skill.id}`);
}

export function deactivateSkill() {
  if (activeSkill) {
    activeSkill.deactivate?.();
    console.log(`[kernel] Deactivated: ${activeSkill.id}`);
    activeSkill = null;
  }
}

// ── Update (main loop) ──

export function update(dt, sensorState) {
  if (sensorState.shake > 0.2) {
    state.energy = Math.min(1, state.energy + dt * 0.5);
  } else {
    state.energy = Math.max(0.1, state.energy - dt * 0.02);
  }

  state.attention = Math.max(0, state.attention - dt * 0.01);
  state.silenceDuration += dt;
}

// ── Init ──

export function init() {
  bus.on('intent:classified', onIntent);

  // Face events → kernel state
  bus.on('face:recognized', ({ name, role, confidence }) => {
    state.currentFace = { name, role };
    state.attention = 1;
    state.silenceDuration = 0;
    state.interactionCount++;
    faceApi.react('face_recognized');
  });

  bus.on('face:enrolled', ({ name, role }) => {
    state.currentFace = { name, role };
    state.attention = 1;
    state.interactionCount++;
    faceApi.react('face_enrolled');
  });

  bus.on('face:unknown', () => {
    state.currentFace = null;
  });

  console.log('[kernel] Ready');
}

// ── Accessors ──

export function getActiveSkill() { return activeSkill?.id || 'presence'; }
export function getSkills() { return [...skills.keys()]; }
