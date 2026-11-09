// ══════════════════════════════════════════
// Gesture Service
// MediaPipe Gesture Recognizer
// Detects hand gestures from camera
// Game mode: rock/paper/scissors
// Presence mode: heart, thumbs up, wave, etc.
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as camera from './camera.js';

let gestureRecognizer = null;
let running = false;
let loopTimer = null;
let lastGesture = null;
let lastGestureTime = 0;

// A heart counts once it has been seen in HEART_FRAMES frames in a row (~0.3 s at 10 fps):
// drawn from landmarks by hand, it appeared from nowhere on one frame (2026-11-09).
// MediaPipe's own gestures count on the first frame, as before: held to 3 frames, an open
// palm (paper) flickered and was missed, and the game lost its fun.
const HEART_FRAMES = 3;
let candidate = null;
let candidateFrames = 0;

// MediaPipe built-in gesture → our gesture name
const GESTURE_MAP = {
  'Closed_Fist':  'rock',
  'Open_Palm':    'paper',
  'Victory':      'scissors',
  'Thumb_Up':     'thumbsup',
  'Thumb_Down':   'thumbsdown',
  'Pointing_Up':  'point',
  'ILoveYou':     'love_sign',
};

// ── Init MediaPipe (lazy) ──

async function ensureRecognizer() {
  if (gestureRecognizer) return true;

  // MediaPipe tasks-vision 1.1.0 and its model are kept in assets/vendor/mediapipe/
  const VENDOR = new URL('../../assets/vendor/mediapipe/', import.meta.url).href;

  const { FilesetResolver, GestureRecognizer } = await import(VENDOR + 'vision_bundle.mjs');

  const vision = await FilesetResolver.forVisionTasks(VENDOR + 'wasm');

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: VENDOR + 'gesture_recognizer.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2, // need 2 for heart detection
  });

  console.log('[gestures] MediaPipe Gesture Recognizer loaded');
  return true;
}

// ── Detection loop ──

function detectLoop(video) {
  if (!running || !gestureRecognizer) return;

  try {
    const now = performance.now();
    const results = gestureRecognizer.recognizeForVideo(video, now);

    // One reading per frame. MediaPipe's own gestures first: a fist is rock, not a heart
    // (the finger-heart test alone took every fist for one).
    let seen = null;
    if (results.gestures && results.gestures.length > 0) {
      const topGesture = results.gestures[0][0];
      const name = topGesture.categoryName;
      const confidence = topGesture.score;

      // Log ALL gestures for debugging
      if (name !== 'None' && confidence > 0.3) {
        bus.emit('gesture:raw', { raw: name, confidence });
      }

      const mapped = GESTURE_MAP[name];
      if (mapped && confidence > 0.4) seen = { gesture: mapped, confidence, raw: name };
    }

    // Hearts: drawn by hand, looked for only when MediaPipe is not sure of one of its own
    if (!seen && results.landmarks && results.landmarks.length > 0) {
      const heart2 = results.landmarks.length === 2 && detectTwoHandHeart(results.landmarks[0], results.landmarks[1]);
      const heart1 = !heart2 && detectFingerHeart(results.landmarks[0]);
      if (heart2) seen = { gesture: 'heart', confidence: heart2.confidence, raw: 'two_hand_heart' };
      else if (heart1) seen = { gesture: 'heart', confidence: heart1.confidence, raw: 'finger_heart' };
    }

    // A heart must be held, not glimpsed
    if (seen && candidate === seen.gesture) candidateFrames++;
    else { candidate = seen?.gesture || null; candidateFrames = seen ? 1 : 0; }

    if (seen && (seen.gesture !== 'heart' || candidateFrames >= HEART_FRAMES)) {
      lastGesture = seen.gesture;
      lastGestureTime = Date.now();
      bus.emit('gesture:detected', seen);
    }
  } catch (e) {
    // Ignore transient detection errors
  }

  // Run at ~10fps
  if (running) {
    loopTimer = setTimeout(() => detectLoop(video), 100);
  }
}

// ── Heart detection ──

// Finger heart (one hand): thumb tip (4) and index tip (8) cross/touch
// while middle (12), ring (16), pinky (20) are curled down
// Landmarks: 0=wrist, 4=thumb_tip, 8=index_tip, 12=middle_tip, 16=ring_tip, 20=pinky_tip
// PIP joints: 6=index_pip, 10=middle_pip, 14=ring_pip, 18=pinky_pip

// Korean finger heart: thumb crosses over index finger
// Thumb tip (4) rests on index finger near DIP (7) or tip (8)
// Middle (12), ring (16), pinky (20) curled into palm
// Landmarks: 3=thumb_ip, 4=thumb_tip, 6=index_pip, 7=index_dip, 8=index_tip

function detectFingerHeart(hand) {
  const thumbTip  = hand[4];
  const thumbIp   = hand[3];   // thumb interphalangeal joint
  const indexTip  = hand[8];
  const indexDip  = hand[7];   // index distal joint — where thumb crosses
  const indexPip  = hand[6];
  const middleTip = hand[12];
  const ringTip   = hand[16];
  const pinkyTip  = hand[20];

  const middlePip = hand[10];
  const ringPip   = hand[14];
  const pinkyPip  = hand[18];

  // Thumb tip should be close to index tip OR index DIP (crossing point)
  const distToTip = dist(thumbTip, indexTip);
  const distToDip = dist(thumbTip, indexDip);
  const closestDist = Math.min(distToTip, distToDip);

  if (closestDist > 0.09) return null; // generous threshold for crossing

  // Thumb and index should be crossing — thumb tip X should differ
  // from thumb base X (the thumb reaches across the index)
  const thumbReaching = Math.abs(thumbTip.x - thumbIp.x) > 0.02;

  // Middle, ring, pinky should be curled (tip Y >= PIP Y in screen coords)
  const middleCurled = middleTip.y > middlePip.y - 0.03;
  const ringCurled   = ringTip.y > ringPip.y - 0.03;
  const pinkyCurled  = pinkyTip.y > pinkyPip.y - 0.03;

  const curledCount = [middleCurled, ringCurled, pinkyCurled].filter(Boolean).length;

  // Need at least 2 of 3 fingers curled, and thumb reaching across
  if (curledCount < 2) return null;

  // The index reaches out (its tip further from the wrist than its middle joint). In a fist
  // it folds back into the palm, with the thumb lying across it: that was read as a heart.
  const wrist = hand[0];
  if (dist(indexTip, wrist) < dist(indexPip, wrist)) return null;

  const distScore = 1 - closestDist / 0.09;
  const curlScore = curledCount / 3;
  const reachBonus = thumbReaching ? 0.15 : 0;
  const confidence = distScore * 0.45 + curlScore * 0.4 + reachBonus;

  return { confidence: Math.min(1, confidence) };
}

// Two-hand heart: thumb tips (4) and index tips (8) of both hands close together
function detectTwoHandHeart(hand1, hand2) {
  const t1 = hand1[4];
  const t2 = hand2[4];
  const i1 = hand1[8];
  const i2 = hand2[8];

  const thumbDist = dist(t1, t2);
  const indexDist = dist(i1, i2);

  const tipsClose = 0.08;

  if (thumbDist < tipsClose && indexDist < tipsClose) {
    const thumbY = (t1.y + t2.y) / 2;
    const indexY = (i1.y + i2.y) / 2;

    if (thumbY > indexY) {
      const confidence = 1 - (thumbDist + indexDist) / (tipsClose * 2);
      return { confidence: Math.min(1, confidence) };
    }
  }

  return null;
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Public API ──

export async function init() {
  // Lazy — loads on first start()
}

// Opening the camera and loading MediaPipe take seconds on a phone. A stop() that arrives
// meanwhile must win: without this check, start() carried on afterwards and left the camera
// and the detection loop running for good, under whatever came next (the radio, for one).
let wanted = 0;

export async function start() {
  if (running) return;
  const mine = ++wanted;

  const cam = await camera.acquire('gestures');
  if (!cam) {
    console.warn('[gestures] Camera not available');
    return;
  }
  if (mine !== wanted) { camera.release('gestures'); return; }

  try {
    await ensureRecognizer();
  } catch (e) {
    console.error('[gestures] MediaPipe load failed:', e);
    camera.release('gestures');
    return;
  }
  if (mine !== wanted) { camera.release('gestures'); return; }

  running = true;
  lastGesture = null;
  candidate = null; candidateFrames = 0;
  console.log('[gestures] Detection started');
  bus.emit('gestures:started');

  detectLoop(cam.video);
}

export function stop() {
  wanted++;
  running = false;
  if (loopTimer) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  lastGesture = null;
  camera.release('gestures');
  console.log('[gestures] Detection stopped');
  bus.emit('gestures:stopped');
}

export function getGesture() { return lastGesture; }
export function getGestureAge() { return Date.now() - lastGestureTime; }
export function isRunning() { return running; }
export function clearGesture() { lastGesture = null; candidate = null; candidateFrames = 0; }
