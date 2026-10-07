// ══════════════════════════════════════════
// Sensors Service
// Accelerometer, gyroscope, shake/tilt/rotation
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';

// ── State ──

export const state = {
  tiltX: 0,           // left/right tilt (-1 to 1)
  tiltY: 0,           // forward/back tilt (-1 to 1)
  shake: 0,           // shake intensity (0 to 1)
  rotating: false,    // device being rotated
  faceDown: false,    // screen facing down
};

let prevAccel = { x: 0, y: 0, z: 0 };
let shakeDecay = 0;
let rotationAccum = 0;
let rotationCooldown = 0;
let lastOrientation = null;

// Thresholds
const SHAKE_THRESHOLD = 20;
const SHAKE_DECAY = 0.92;
const ROTATION_THRESHOLD = 120; // degrees/sec
const ROTATION_COOLDOWN = 3;   // seconds

export function init() {
  // Accelerometer + gyroscope via DeviceMotion
  if ('DeviceMotionEvent' in window) {
    // iOS 13+ requires permission
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(response => {
        if (response === 'granted') {
          window.addEventListener('devicemotion', onMotion);
        }
      }).catch(() => {});
    } else {
      window.addEventListener('devicemotion', onMotion);
    }
  }

  // Orientation for tilt
  if ('DeviceOrientationEvent' in window) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(response => {
        if (response === 'granted') {
          window.addEventListener('deviceorientation', onOrientation);
        }
      }).catch(() => {});
    } else {
      window.addEventListener('deviceorientation', onOrientation);
    }
  }
}

function onMotion(e) {
  const a = e.accelerationIncludingGravity;
  if (!a) return;

  // Shake detection: delta between consecutive readings
  const dx = Math.abs(a.x - prevAccel.x);
  const dy = Math.abs(a.y - prevAccel.y);
  const dz = Math.abs(a.z - prevAccel.z);
  const delta = dx + dy + dz;

  if (delta > SHAKE_THRESHOLD) {
    shakeDecay = Math.min(1, shakeDecay + delta * 0.01);
  }

  // Face down detection (z-axis gravity)
  state.faceDown = a.z < -7;

  prevAccel = { x: a.x, y: a.y, z: a.z };

  // Rotation detection from gyroscope
  const r = e.rotationRate;
  if (r) {
    const rotSpeed = Math.abs(r.alpha || 0) + Math.abs(r.beta || 0) + Math.abs(r.gamma || 0);
    rotationAccum = rotSpeed;
  }
}

function onOrientation(e) {
  // gamma = left/right tilt (-90 to 90)
  // beta = front/back tilt (-180 to 180)
  if (e.gamma !== null) {
    state.tiltX = Math.max(-1, Math.min(1, e.gamma / 45));
  }
  if (e.beta !== null) {
    state.tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
  }
}

// Called every frame from app.js
export function update(dt) {
  // Shake smoothing + decay
  shakeDecay *= SHAKE_DECAY;
  state.shake = shakeDecay;

  if (state.shake > 0.3) {
    bus.emit('sensor:shake', state.shake);
  }

  // Rotation detection
  rotationCooldown = Math.max(0, rotationCooldown - dt);

  if (rotationAccum > ROTATION_THRESHOLD && rotationCooldown === 0) {
    state.rotating = true;
    bus.emit('reaction:trigger', 'shaken');
    rotationCooldown = ROTATION_COOLDOWN;
  } else if (rotationAccum < 30) {
    state.rotating = false;
  }

  rotationAccum *= 0.85;
}

// Haptic feedback
export function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
