// ══════════════════════════════════════════
// Faces Service
// Face detection + embedding + recognition
// UltraFace (detection) + MobileFaceNet (embedding)
// via ONNX Runtime Web
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as camera from './camera.js';
import * as storage from './storage.js';
import * as faceRenderer from '../face.js';

// ── Model paths ──

const DETECT_MODEL = 'assets/models/version-RFB-320.onnx';
const EMBED_MODEL  = 'assets/models/w600k_mbf.onnx';

// ── Model sessions (lazy loaded) ──

let detectSession = null;
let embedSession  = null;
let modelsLoading = false;

// ── Detection constants ──

const DETECT_W = 320;
const DETECT_H = 240;
const DETECT_CONF_THRESHOLD = 0.7;
const EMBED_SIZE = 112;
const MATCH_THRESHOLD = 0.45;

// ── State ──

let knownFaces = [];    // loaded from storage
let pendingName = null;  // queued name from introduction
let pendingNameTimeout = null;
let lookTimer = null;
let lastRecognized = null;
let lastRecognizedTime = 0;
const RECOGNITION_COOLDOWN = 5000; // don't re-greet within 5s

// Last unknown face embedding — kept briefly so a name spoken right after
// a scan can still be associated retroactively
let lastUnknownEmbedding = null;
let lastUnknownTime = 0;
const UNKNOWN_RETENTION = 10000; // 10s window to associate a name

// ── Off-screen canvases ──

const detectCanvas = document.createElement('canvas');
detectCanvas.width = DETECT_W;
detectCanvas.height = DETECT_H;
const detectCtx = detectCanvas.getContext('2d', { willReadFrequently: true });

const cropCanvas = document.createElement('canvas');
cropCanvas.width = EMBED_SIZE;
cropCanvas.height = EMBED_SIZE;
const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

// ── Model loading ──

async function ensureModels() {
  if (detectSession && embedSession) return true;
  if (modelsLoading) return false;
  if (!window.ort) {
    console.warn('[faces] ONNX Runtime not available');
    return false;
  }

  modelsLoading = true;
  bus.emit('faces:loading');
  console.log('[faces] Loading models...');

  try {
    // Configure ONNX Runtime
    ort.env.wasm.numThreads = 1;

    const [ds, es] = await Promise.all([
      ort.InferenceSession.create(DETECT_MODEL, {
        executionProviders: ['wasm'],
      }),
      ort.InferenceSession.create(EMBED_MODEL, {
        executionProviders: ['wasm'],
      }),
    ]);

    detectSession = ds;
    embedSession = es;
    modelsLoading = false;
    bus.emit('faces:ready');
    console.log('[faces] Models loaded');
    return true;
  } catch (e) {
    modelsLoading = false;
    console.error('[faces] Model loading failed:', e);
    bus.emit('faces:error', e.message);
    return false;
  }
}

// ── Preprocessing ──

function imageToTensor(imageData, width, height, mean, scale) {
  const { data } = imageData; // RGBA Uint8ClampedArray
  const size = width * height;
  const float32 = new Float32Array(3 * size);

  for (let i = 0; i < size; i++) {
    const ri = i * 4;
    float32[i]            = (data[ri]     - mean) / scale; // R
    float32[i + size]     = (data[ri + 1] - mean) / scale; // G
    float32[i + 2 * size] = (data[ri + 2] - mean) / scale; // B
  }

  return float32;
}

// ── Face detection (UltraFace) ──

async function detectFaces(video) {
  // Draw video frame to detection canvas
  detectCtx.drawImage(video, 0, 0, DETECT_W, DETECT_H);
  const imageData = detectCtx.getImageData(0, 0, DETECT_W, DETECT_H);

  // Preprocess: (pixel - 127) / 128
  const tensorData = imageToTensor(imageData, DETECT_W, DETECT_H, 127, 128);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, DETECT_H, DETECT_W]);

  // Run detection
  const results = await detectSession.run({ input: inputTensor });
  const scores = results.scores.data;  // [1, 4420, 2]
  const boxes = results.boxes.data;    // [1, 4420, 4]

  // Parse detections
  const faces = [];
  const numAnchors = 4420;

  for (let i = 0; i < numAnchors; i++) {
    const confidence = scores[i * 2 + 1]; // face class
    if (confidence < DETECT_CONF_THRESHOLD) continue;

    faces.push({
      x1: boxes[i * 4],
      y1: boxes[i * 4 + 1],
      x2: boxes[i * 4 + 2],
      y2: boxes[i * 4 + 3],
      confidence,
    });
  }

  // Simple NMS: sort by confidence, suppress overlapping
  faces.sort((a, b) => b.confidence - a.confidence);
  const kept = [];
  for (const face of faces) {
    let dominated = false;
    for (const k of kept) {
      if (iou(face, k) > 0.3) { dominated = true; break; }
    }
    if (!dominated) kept.push(face);
  }

  return kept;
}

function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
  return inter / (areaA + areaB - inter);
}

// ── Face embedding (MobileFaceNet w600k) ──

async function embedFace(video, box) {
  // Get pixel coordinates from normalized box
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const px1 = Math.max(0, Math.floor(box.x1 * vw));
  const py1 = Math.max(0, Math.floor(box.y1 * vh));
  const px2 = Math.min(vw, Math.ceil(box.x2 * vw));
  const py2 = Math.min(vh, Math.ceil(box.y2 * vh));
  const pw = px2 - px1;
  const ph = py2 - py1;

  if (pw < 10 || ph < 10) return null; // too small

  // Crop and resize to 112x112
  cropCtx.drawImage(video, px1, py1, pw, ph, 0, 0, EMBED_SIZE, EMBED_SIZE);
  const imageData = cropCtx.getImageData(0, 0, EMBED_SIZE, EMBED_SIZE);

  // Preprocess: (pixel - 127.5) / 127.5
  const tensorData = imageToTensor(imageData, EMBED_SIZE, EMBED_SIZE, 127.5, 127.5);
  const inputTensor = new ort.Tensor('float32', tensorData, [1, 3, EMBED_SIZE, EMBED_SIZE]);

  // Run embedding
  const results = await embedSession.run({ 'input.1': inputTensor });
  const embedding = results['516'].data; // Float32Array, 512-d

  // L2 normalize
  return l2Normalize(Array.from(embedding));
}

function l2Normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map(v => v / norm);
}

// ── Matching ──

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both L2-normalized, so dot product = cosine similarity
}

function matchFace(embedding) {
  let bestMatch = null;
  let bestScore = -1;

  for (const face of knownFaces) {
    const score = cosineSimilarity(embedding, face.embedding);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = face;
    }
  }

  if (bestMatch && bestScore >= MATCH_THRESHOLD) {
    return { ...bestMatch, confidence: bestScore };
  }
  return null;
}

// ── Enrollment ──

async function enrollFace(embedding, name, role = 'known') {
  // Check if we already know this face (update existing)
  const match = matchFace(embedding);

  if (match && match.confidence > 0.5) {
    // Update existing face with new name and EMA embedding
    match.name = name;
    match.role = role;
    match.embedding = emaUpdate(match.embedding, embedding);
    match.lastSeen = Date.now();
    match.seeCount++;
    await storage.putFace(match);
    console.log('[faces] Updated face:', name);
    bus.emit('face:enrolled', { id: match.id, name, role, updated: true });
    return match;
  }

  // New face
  const record = {
    id: crypto.randomUUID(),
    name,
    role,
    embedding,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    seeCount: 1,
  };

  knownFaces.push(record);
  await storage.putFace(record);
  console.log('[faces] Enrolled new face:', name);
  bus.emit('face:enrolled', { id: record.id, name, role, updated: false });
  return record;
}

function emaUpdate(stored, fresh) {
  const alpha = 0.1;
  const updated = stored.map((v, i) => (1 - alpha) * v + alpha * fresh[i]);
  return l2Normalize(updated);
}

// ── Scanning session ──
// Opens camera, scans for faces over SCAN_DURATION,
// attempts detection every SCAN_INTERVAL ms.

const SCAN_DURATION = 3000;  // total scan window
const SCAN_INTERVAL = 500;   // ms between detection attempts
const SCAN_SETTLE = 800;     // ms to let camera auto-expose before first attempt

let scanning = false;

async function startScan() {
  if (scanning) return;
  scanning = true;
  faceRenderer.setScanning(true);
  console.log('[faces] Scan started');

  // Acquire camera
  const cam = await camera.acquire('faces');
  if (!cam) {
    endScan();
    return;
  }

  const { video } = cam;

  // Wait for video to produce frames
  if (video.readyState < 2) {
    await new Promise(resolve => {
      video.addEventListener('loadeddata', resolve, { once: true });
      setTimeout(resolve, 3000);
    });
  }

  // Let camera auto-expose settle
  await sleep(SCAN_SETTLE);

  // Load models (may already be cached)
  const ready = await ensureModels();
  if (!ready) {
    endScan();
    return;
  }

  // Run detection attempts over the scan window
  const deadline = Date.now() + SCAN_DURATION;
  let found = false;

  while (Date.now() < deadline && !found) {
    try {
      found = await attemptDetection(video);
    } catch (e) {
      console.error('[faces] Detection attempt error:', e);
    }
    if (!found) await sleep(SCAN_INTERVAL);
  }

  if (!found) {
    console.log('[faces] Scan complete — no face found');
    bus.emit('face:none');
  }

  endScan();
}

function endScan() {
  scanning = false;
  faceRenderer.setScanning(false);
  camera.release('faces');
  console.log('[faces] Scan ended');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Single detection attempt ──

async function attemptDetection(video) {
  const faces = await detectFaces(video);
  if (faces.length === 0) return false;

  // Take largest face
  const biggest = faces.reduce((a, b) => {
    const areaA = (a.x2 - a.x1) * (a.y2 - a.y1);
    const areaB = (b.x2 - b.x1) * (b.y2 - b.y1);
    return areaA > areaB ? a : b;
  });

  console.log('[faces] Face detected:', biggest.confidence.toFixed(2));
  bus.emit('face:detected', { box: biggest, confidence: biggest.confidence });

  // Generate embedding
  const embedding = await embedFace(video, biggest);
  if (!embedding) return false;

  // Check for pending name (from introduction)
  if (pendingName) {
    const name = pendingName;
    pendingName = null;
    if (pendingNameTimeout) clearTimeout(pendingNameTimeout);
    await enrollFace(embedding, name);
    return true;
  }

  // Match against known faces
  const match = matchFace(embedding);

  if (match) {
    const now = Date.now();
    if (match.id === lastRecognized && now - lastRecognizedTime < RECOGNITION_COOLDOWN) {
      return true; // same person, skip greeting
    }

    lastRecognized = match.id;
    lastRecognizedTime = now;

    match.lastSeen = now;
    match.seeCount++;
    match.embedding = emaUpdate(match.embedding, embedding);
    await storage.putFace(match);

    bus.emit('face:recognized', {
      id: match.id,
      name: match.name,
      role: match.role,
      confidence: match.confidence,
    });
  } else {
    // Cache the unknown embedding so a name spoken shortly after can still enroll
    lastUnknownEmbedding = embedding;
    lastUnknownTime = Date.now();
    bus.emit('face:unknown', { embedding });
  }

  return true;
}

// ── Trigger: look ──

export function look() {
  if (lookTimer || scanning) return;
  startScan();
  lookTimer = setTimeout(() => { lookTimer = null; }, SCAN_DURATION + SCAN_SETTLE + 1000);
}

// ── Public API ──

export async function init() {
  // Load known faces from storage
  knownFaces = await storage.getFaces();
  console.log('[faces] Loaded', knownFaces.length, 'known faces');

  // Listen for introductions
  bus.on('intent:introduction', async ({ name }) => {
    console.log('[faces] Name received:', name);

    // Skip if this person is already enrolled
    const existing = knownFaces.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      console.log('[faces] Already know', name, '— skipping enrollment');
      return;
    }

    // Option 1: We recently saw an unknown face — enroll retroactively
    if (lastUnknownEmbedding && (Date.now() - lastUnknownTime < UNKNOWN_RETENTION)) {
      console.log('[faces] Retroactive enrollment with cached face');
      const embedding = lastUnknownEmbedding;
      lastUnknownEmbedding = null;
      await enrollFace(embedding, name);
      return;
    }

    // Option 2: Camera is currently scanning — set pending name for next detection
    if (scanning) {
      pendingName = name;
      return;
    }

    // Option 3: No recent face — open camera to find one
    pendingName = name;
    if (pendingNameTimeout) clearTimeout(pendingNameTimeout);
    pendingNameTimeout = setTimeout(() => {
      console.log('[faces] Pending name expired:', name);
      pendingName = null;
    }, 8000);
    look();
  });

  bus.emit('faces:init');
}

export async function recognize() {
  return startScan();
}

export async function enroll(name, role = 'known') {
  // Manual enrollment: open camera, detect face, enroll with given name
  pendingName = name;
  return look();
}

export function getKnownFaces() {
  return knownFaces.map(f => ({
    id: f.id,
    name: f.name,
    role: f.role,
    lastSeen: f.lastSeen,
    seeCount: f.seeCount,
  }));
}

export async function forgetFace(id) {
  knownFaces = knownFaces.filter(f => f.id !== id);
  await storage.deleteFace(id);
  console.log('[faces] Forgot face:', id);
}

export function isModelReady() {
  return !!(detectSession && embedSession);
}

export function isScanning() {
  return scanning;
}
