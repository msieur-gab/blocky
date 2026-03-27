// ══════════════════════════════════════════
// Face API — behavior/chain/gesture player
// Three layers that don't compete:
//   Layer 1 (Eyes)    — emotion pattern from behaviors
//   Layer 2 (Sight)   — autonomous gaze (handled in renderer)
//   Layer 3 (Face)    — head movements from behaviors + gesture overlays
// ══════════════════════════════════════════

import { catalog as EYES, DEFAULT as EYE_DEFAULT } from './data/eyes.js';
import { catalog as MOUTHS, DEFAULT as MOUTH_DEFAULT } from './data/mouths.js';
import { catalog as BEHAVIORS } from './data/behaviors.js';
import { catalog as CHAINS } from './data/chains.js';
import { catalog as GESTURES } from './data/gestures.js';
import { bus } from './utils/events.js';
import * as renderer from './face.js';
import { play as playSound } from './services/voice.js';

// ══════════════════════════════════════════
// State
// ══════════════════════════════════════════

const FACE_DEFAULT = { x: 0, y: 0, scale: 1, tilt: 0, squash: 0, skewX: 0, skewY: 0 };

const target = {
  left:  { ...EYE_DEFAULT },
  right: { ...EYE_DEFAULT },
  mouth: { ...MOUTH_DEFAULT },
  face:  { ...FACE_DEFAULT },
  gap: 400,
};

// Behavior player
let currentBehavior = null;
let currentBehaviorName = null;
let behaviorLoop = null;
let loopIndex = 0;
let loopTimer = 0;

// Chain/mode player
let chain = null;
let chainIndex = 0;
let chainTimer = 0;
let activeMode = null;
let chainPhase = 'none';  // 'none' | 'intro' | 'hold' | 'outro'
let pendingChain = null;
let ambientBehavior = 'calm';

// Gesture overlay
let gesture = null;
let gestureIndex = 0;
let gestureTimer = 0;
const gestureOffset = { x: 0, y: 0, tilt: 0, scale: 0 };

// Override (for skills like game/radio that need direct control)
let overrideActive = false;

// ══════════════════════════════════════════
// Eye mirroring
// ══════════════════════════════════════════

function mirrorEye(eye) {
  return {
    ...eye,
    tl: eye.tr, tr: eye.tl,
    bl: eye.br, br: eye.bl,
    tilt: -(eye.tilt || 0),
    shiftTop: -(eye.shiftTop || 0),
    shiftBot: -(eye.shiftBot || 0),
    x: -(eye.x || 0),
  };
}

// ══════════════════════════════════════════
// Target setters
// ══════════════════════════════════════════

function setEyes(name) {
  if (!name) return;

  // Asymmetric: { left: 'name', right: 'name' }
  if (typeof name === 'object') {
    const l = EYES[name.left];
    const r = EYES[name.right];
    if (l) Object.assign(target.left, l);
    if (r) Object.assign(target.right, mirrorEye(r));
    return;
  }

  // Symmetric
  const e = EYES[name];
  if (!e) return;
  Object.assign(target.left, e);
  Object.assign(target.right, mirrorEye(e));
}

function setMouth(name) {
  const m = MOUTHS[name || 'none'];
  if (m) Object.assign(target.mouth, m);
}

function setFace(f) {
  Object.assign(target.face, FACE_DEFAULT, f || {});
}

// ══════════════════════════════════════════
// Behavior player
// ══════════════════════════════════════════

function enterBehavior(name) {
  const b = BEHAVIORS[name];
  if (!b) { console.warn(`[face-api] Unknown behavior: ${name}`); return; }

  currentBehavior = b;
  currentBehaviorName = name;

  setEyes(b.eyes);
  setMouth(b.mouth || 'none');
  if (b.face) setFace(b.face);
  if (b.gap !== undefined) target.gap = b.gap;
  if (b.sound) playSound(b.sound);

  if (b.loop) {
    behaviorLoop = b.loop;
    loopIndex = 0;
    loopTimer = 0;
    applyLoopFrame(behaviorLoop[0]);
  } else {
    behaviorLoop = null;
  }

  bus.emit('face:behavior', name);
}

function applyLoopFrame(frame) {
  if (frame.eyes) setEyes(frame.eyes);
  if (frame.mouth) setMouth(frame.mouth);
  if (frame.face) setFace(frame.face);
  if (frame.sound) playSound(frame.sound);
}

function updateBehavior(dt) {
  if (!behaviorLoop) return;

  loopTimer += dt * 1000;
  const frame = behaviorLoop[loopIndex];

  if (loopTimer >= frame.dur) {
    loopTimer = 0;
    loopIndex = (loopIndex + 1) % behaviorLoop.length;
    applyLoopFrame(behaviorLoop[loopIndex]);
  }
}

// ══════════════════════════════════════════
// Chain/mode player
// ══════════════════════════════════════════

function playChain(name) {
  const entry = CHAINS[name];

  if (!entry) {
    if (BEHAVIORS[name]) {
      interruptCurrent();
      enterBehavior(name);
    }
    return;
  }

  if (entry.steps) {
    interruptCurrent();
    chain = entry.steps;
    activeMode = null;
    chainPhase = 'none';
    chainIndex = 0;
    chainTimer = 0;
    enterBehavior(chain[0].behavior);
  } else if (entry.intro) {
    if (chainPhase === 'hold' && activeMode && activeMode.outro) {
      pendingChain = name;
      interrupt();
    } else {
      interruptCurrent();
      activeMode = entry;
      chain = entry.intro;
      chainPhase = 'intro';
      chainIndex = 0;
      chainTimer = 0;
      enterBehavior(chain[0].behavior);
    }
  }
}

function interrupt() {
  if (chainPhase === 'hold' && activeMode && activeMode.outro) {
    chain = activeMode.outro;
    chainPhase = 'outro';
    chainIndex = 0;
    chainTimer = 0;
    enterBehavior(chain[0].behavior);
    return true;
  }
  return false;
}

function interruptCurrent() {
  if (chainPhase === 'hold' && activeMode && activeMode.outro) return;
  chain = null;
  activeMode = null;
  chainPhase = 'none';
  behaviorLoop = null;
}

function updateChain(dt) {
  if (!chain) return;

  const step = chain[chainIndex];
  if (!step.dur) {
    if (chainPhase === 'intro' && activeMode && activeMode.hold) {
      chainPhase = 'hold';
      chain = null;
      enterBehavior(activeMode.hold);
      return;
    }
    if (chainPhase === 'outro') {
      finishOutro();
      return;
    }
    chain = null;
    enterBehavior(ambientBehavior);
    return;
  }

  chainTimer += dt * 1000;
  if (chainTimer >= step.dur) {
    chainTimer = 0;
    chainIndex++;
    if (chainIndex >= chain.length) {
      if (chainPhase === 'intro' && activeMode && activeMode.hold) {
        chainPhase = 'hold';
        chain = null;
        enterBehavior(activeMode.hold);
      } else if (chainPhase === 'outro') {
        finishOutro();
      } else {
        chain = null;
        enterBehavior(ambientBehavior);
        bus.emit('face:chainEnd');
      }
      return;
    }
    enterBehavior(chain[chainIndex].behavior);
  }
}

function finishOutro() {
  chainPhase = 'none';
  chain = null;
  activeMode = null;
  if (pendingChain) {
    const next = pendingChain;
    pendingChain = null;
    playChain(next);
  } else {
    enterBehavior(ambientBehavior);
    bus.emit('face:chainEnd');
  }
}

// ══════════════════════════════════════════
// Gesture overlay
// ══════════════════════════════════════════

function playGesture(name) {
  const g = GESTURES[name];
  if (!g) return;
  gesture = g;
  gestureIndex = 0;
  gestureTimer = 0;
  applyGestureFrame(g[0]);
  bus.emit('face:gesture', name);
}

function applyGestureFrame(frame) {
  gestureOffset.x = frame.x || 0;
  gestureOffset.y = frame.y || 0;
  gestureOffset.tilt = frame.tilt || 0;
  gestureOffset.scale = frame.scale || 0;
  if (frame.sound) playSound(frame.sound);
}

function updateGesture(dt) {
  if (!gesture) {
    gestureOffset.x *= 0.85;
    gestureOffset.y *= 0.85;
    gestureOffset.tilt *= 0.85;
    gestureOffset.scale *= 0.85;
    return;
  }

  gestureTimer += dt * 1000;
  const frame = gesture[gestureIndex];

  if (gestureTimer >= frame.dur) {
    gestureTimer = 0;
    gestureIndex++;
    if (gestureIndex >= gesture.length) {
      gesture = null;
      return;
    }
    applyGestureFrame(gesture[gestureIndex]);
  }
}

// ══════════════════════════════════════════
// Public API
// ══════════════════════════════════════════

// New API — behaviors and chains
export function behavior(name) { enterBehavior(name); }
export function chain(name) { playChain(name); }
export function head(name) { playGesture(name); }
export function setAmbient(name) { ambientBehavior = name; }

// Interrupt current mode (triggers outro if exists)
export function interruptMode() {
  if (chainPhase === 'hold' && activeMode && activeMode.outro) {
    interrupt();
    return true;
  }
  interruptCurrent();
  enterBehavior(ambientBehavior);
  return false;
}

// Override — skills that need direct face control (game, radio, time)
export function override(behaviorName) {
  overrideActive = true;
  interruptCurrent();
  enterBehavior(behaviorName);
}

export function overrideRaw(eyeObj) {
  overrideActive = true;
  interruptCurrent();
  if (eyeObj) {
    // Direct eye target — for time display etc.
    if (eyeObj.leftEye) Object.assign(target.left, eyeObj.leftEye);
    if (eyeObj.rightEye) Object.assign(target.right, eyeObj.rightEye);
    if (eyeObj.mouth) Object.assign(target.mouth, eyeObj.mouth);
    if (eyeObj.face) Object.assign(target.face, eyeObj.face);
    if (eyeObj.eyeGap) target.gap = eyeObj.eyeGap;
  }
}

export function releaseOverride() {
  overrideActive = false;
  enterBehavior(ambientBehavior);
}

// Legacy API — maps old calls to new system
export function mood(name) {
  if (BEHAVIORS[name]) {
    ambientBehavior = name;
    if (!overrideActive && !chain && chainPhase === 'none') {
      enterBehavior(name);
    }
  }
}

export function react(name) {
  // Try as chain first, then as behavior
  if (CHAINS[name]) {
    playChain(name);
  } else if (BEHAVIORS[name]) {
    enterBehavior(name);
  }
}

export function registerReactions() { /* no-op — reactions now in chains.js */ }

// Special modes
export function startScan() { renderer.setScanning(true); }
export function stopScan() { renderer.setScanning(false); }
export function setRadioMode(on, autoPlay) { renderer.setRadioMode(on, autoPlay); }
export function isRadioPlaying() { return renderer.isRadioPlaying(); }

// State queries
export function getTarget() { return target; }
export function isIdleBlocked() { return overrideActive || chain !== null || chainPhase !== 'none'; }
export function getCurrentBehavior() { return currentBehaviorName; }
export function getPhase() { return chainPhase; }
export function getReactions() { return CHAINS; } // legacy compat

// ══════════════════════════════════════════
// Update (called from main loop)
// ══════════════════════════════════════════

export function update(dt) {
  if (!overrideActive) {
    updateChain(dt);
    updateBehavior(dt);
  }
  updateGesture(dt);
}

// ══════════════════════════════════════════
// Init
// ══════════════════════════════════════════

export function init(canvasEl) {
  renderer.init(canvasEl);

  // Legacy bus events — map to new API
  bus.on('reaction:trigger', react);
  bus.on('expression:override', (name) => name ? override(name) : releaseOverride());
  bus.on('expression:raw', (obj) => obj ? overrideRaw(obj) : releaseOverride());
  bus.on('reactions:register', () => {}); // no-op

  // Start with calm
  enterBehavior('calm');
}

export function resize() { renderer.resize(); }
export function setTheme(dark) { renderer.setTheme(dark); }

export function render(dt) {
  // Apply gesture offset to face target before rendering
  const renderTarget = {
    ...target,
    face: {
      ...target.face,
      x: (target.face.x || 0) + gestureOffset.x,
      y: (target.face.y || 0) + gestureOffset.y,
      tilt: (target.face.tilt || 0) + gestureOffset.tilt,
      scale: (target.face.scale || 1) * (1 + gestureOffset.scale),
    },
  };
  renderer.update(dt, renderTarget);
  renderer.draw();
}
