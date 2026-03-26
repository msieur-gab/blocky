// ══════════════════════════════════════════
// Face API — single interface for face control
// Priority: override > reaction > mood
// Skills use this API, never touch face.js directly
// ══════════════════════════════════════════

import { resolve } from './expressions.js';
import { bus } from './utils/events.js';
import * as renderer from './face.js';
import { play as playSound } from './services/voice.js';

// ── Priority state ──

let currentOverride = null;   // Priority 1: skill override
let currentReaction = null;   // Priority 2: reaction sequence
let reactionIndex = 0;
let reactionTimer = 0;
let reactionLoop = false;
let currentMood = 'calm';     // Priority 3: ambient mood
let idleBlocked = false;

// ── Active target (sent to renderer each frame) ──

let target = resolve('calm');

// ══════════════════════════════════════════
// Priority 1: Override (skills take control)
// ══════════════════════════════════════════

export function override(exprName) {
  currentOverride = resolve(exprName);
  target = currentOverride;
  idleBlocked = true;
}

export function overrideRaw(exprObj) {
  currentOverride = exprObj;
  target = currentOverride;
  idleBlocked = true;
}

export function releaseOverride() {
  currentOverride = null;
  idleBlocked = false;
  recalcTarget();
}

// ══════════════════════════════════════════
// Priority 2: Reactions (multi-beat sequences)
// ══════════════════════════════════════════

const REACTIONS = {};

export function registerReactions(reactions) {
  Object.assign(REACTIONS, reactions);
}

export function react(name) {
  const raw = REACTIONS[name];
  if (!raw) return;

  const frames = Array.isArray(raw) ? raw : raw.frames;
  reactionLoop = Array.isArray(raw) ? false : !!raw.loop;

  if (!frames || frames.length === 0) return;

  currentReaction = frames;
  reactionIndex = 0;
  reactionTimer = 0;
  idleBlocked = true;

  const first = currentReaction[0];
  target = applyKeyframe(first);
  if (first.sound) playSound(first.sound);

  bus.emit('face:reaction', name);
}

function applyKeyframe(frame) {
  const resolved = resolve(frame.expr);
  const overrides = {};
  if (frame.tilt !== undefined) overrides.tilt = frame.tilt;
  if (frame.scale !== undefined) overrides.scale = frame.scale;
  if (frame.x !== undefined) overrides.x = frame.x;
  if (frame.y !== undefined) overrides.y = frame.y;
  if (frame.skewX !== undefined) overrides.skewX = frame.skewX;

  if (Object.keys(overrides).length > 0) {
    return { ...resolved, face: { ...resolved.face, ...overrides } };
  }
  return resolved;
}

// ══════════════════════════════════════════
// Priority 3: Mood (ambient state)
// ══════════════════════════════════════════

export function mood(name) {
  currentMood = name;
  if (!currentOverride && !currentReaction) {
    target = resolve(name);
  }
}

// ══════════════════════════════════════════
// Special modes (composable, layer on top)
// ══════════════════════════════════════════

export function startScan() { renderer.setScanning(true); }
export function stopScan() { renderer.setScanning(false); }
export function startGroove() { /* handled in renderer via radioPlaying */ }
export function stopGroove() { /* handled in renderer */ }

// Delegate to renderer
export function setRadioMode(on, autoPlay) { renderer.setRadioMode(on, autoPlay); }
export function isRadioPlaying() { return renderer.isRadioPlaying(); }

// ══════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════

export function showDigits(left, right, duration = 2000) {
  const { makeTimeExpression, makeMinuteExpression } = require('./expressions.js');
  // This is handled by skills directly via overrideRaw
}

// ══════════════════════════════════════════
// Update (called from main loop)
// ══════════════════════════════════════════

export function update(dt) {
  // Override always wins
  if (currentOverride) {
    target = currentOverride;
    return;
  }

  // Reaction sequencer
  if (currentReaction) {
    reactionTimer += dt * 1000;
    const frame = currentReaction[reactionIndex];

    if (reactionTimer >= frame.duration) {
      reactionTimer = 0;
      reactionIndex++;

      if (reactionIndex >= currentReaction.length) {
        if (reactionLoop) {
          reactionIndex = 0;
          const first = currentReaction[0];
          target = applyKeyframe(first);
          if (first.sound) playSound(first.sound);
          return;
        }

        // Sequence done
        currentReaction = null;
        reactionLoop = false;
        reactionIndex = 0;
        idleBlocked = false;
        recalcTarget();
        bus.emit('face:reactionEnd');
      } else {
        const next = currentReaction[reactionIndex];
        target = applyKeyframe(next);
        if (next.sound) playSound(next.sound);
      }
    }
    return;
  }

  // Mood (ambient) — radio overrides mood when playing
  if (renderer.isRadioPlaying()) {
    target = resolve('radio');
  } else {
    target = resolve(currentMood);
  }
}

function recalcTarget() {
  if (currentOverride) target = currentOverride;
  else if (currentReaction) target = applyKeyframe(currentReaction[reactionIndex]);
  else if (renderer.isRadioPlaying()) target = resolve('radio');
  else target = resolve(currentMood);
}

export function getTarget() { return target; }
export function isIdleBlocked() { return idleBlocked; }
export function getReactions() { return REACTIONS; }

// ══════════════════════════════════════════
// Init
// ══════════════════════════════════════════

export function init(canvasEl) {
  renderer.init(canvasEl);

  // Legacy compatibility: listen to old events during migration
  bus.on('reaction:trigger', react);
  bus.on('expression:override', (name) => name ? override(name) : releaseOverride());
  bus.on('expression:raw', (obj) => obj ? overrideRaw(obj) : releaseOverride());
  bus.on('reactions:register', registerReactions);
}

export function resize() { renderer.resize(); }
export function setTheme(dark) { renderer.setTheme(dark); }

export function render(dt) {
  renderer.update(dt, target);
  renderer.draw();
}
