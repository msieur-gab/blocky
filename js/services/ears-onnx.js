// ══════════════════════════════════════════
// Ears Service — On-device sherpa-onnx streaming ASR (Worker edition)
// Drop-in replacement for ears.js (Web Speech API).
// Same public API, same bus events.
//
// Architecture:
//   AudioWorkletProcessor (audio thread)
//        │  postMessage(Float32Array, transferred)
//        ▼
//   ears-onnx.js (main thread, this file — just a bridge)
//        │  worker.postMessage(samples, transferred)
//        ▼
//   ears-worker.js (Worker thread)
//        │  sherpa-onnx WASM decodes
//        ▼
//   worker.onmessage  →  bus.emit(ear:sentence / ear:interim / …)
//
// Why this shape:
// - Sherpa-onnx and MediaPipe both use the Emscripten "global Module"
//   pattern. On the main thread they fight over window.Module and the
//   second loader clobbers the first's HEAPF32 view. Putting sherpa in
//   a Worker gives it its own self.Module — collision impossible.
// - AudioWorklet runs on the audio thread, so capture is never starved
//   by main-thread rendering or MediaPipe inference.
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as memory from './memory.js';

const VENDOR = './assets/sherpa/asr/';

// ── Module-scoped state ──
let creatureName = null;
let stage = 'off';            // 'off' | 'active'

let worker = null;
let workerReady = false;

let audioCtx = null;
let mediaStream = null;
let sourceNode = null;
let workletNode = null;

let lastInterim = '';
const history = [];
const MAX_HISTORY = 5;

let initPromise = null;

// ── Public API ──

export async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    creatureName = await memory.getCreatureName();
    try {
      await startWorker();
      console.log(`[ears-onnx] Worker ready (creature: ${creatureName || 'none'})`);
      await startActive();
    } catch (e) {
      console.warn('[ears-onnx] Init failed:', e);
      bus.emit('ear:unavailable');
      throw e;
    }
  })();
  return initPromise;
}

export async function setName(name) {
  creatureName = name;
  await memory.setCreatureName(name);
  bus.emit('ami:named', { name });
}

export function getTranscript() {
  const past = history.join(' ');
  return past + (past && lastInterim ? ' ' : '') + lastInterim;
}
export function getStage() { return stage; }
export function getCreatureName() { return creatureName; }

export function stop() {
  stopActive();
  if (worker) {
    try { worker.postMessage({ type: 'stop' }); } catch (e) {}
    try { worker.terminate(); } catch (e) {}
    worker = null;
    workerReady = false;
  }
  stage = 'off';
}

// Kept for API compatibility with ears-webspeech.js. With the wake stage
// stripped, this is a no-op when already active.
export function forceActive() {
  if (stage === 'off') return;
  // already 'active'
}

// ── Worker lifecycle ──

function startWorker() {
  return new Promise((resolve, reject) => {
    const vendorUrl = new URL(VENDOR, window.location.href).href;

    worker = new Worker(new URL('./ears-worker.js', import.meta.url), { type: 'classic' });

    worker.onmessage = (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          if (msg.pct === 0 || msg.pct === 100 || msg.pct % 10 === 0) {
            console.log(`[ears-onnx] Loading model: ${msg.pct}%`);
          }
          break;
        case 'ready':
          workerReady = true;
          resolve();
          break;
        case 'partial':
          handlePartial(msg.text);
          break;
        case 'sentence':
          handleSentence(msg.text);
          break;
        case 'error':
          console.warn('[ears-onnx] Worker error:', msg.message);
          // Non-fatal — worker recreates its stream internally.
          break;
      }
    };
    worker.onerror = (err) => {
      console.error('[ears-onnx] Worker fatal:', err.message || err);
      reject(new Error(err.message || 'worker error'));
    };

    worker.postMessage({ type: 'init', vendorUrl });
  });
}

// ── Active stage (capture + forward) ──

async function startActive() {
  if (!workerReady) return;
  if (stage === 'active') return;

  try {
    // Some Android WebViews reject the sampleRate hint outright; fall back
    // to the device default and let the worklet resample to 16k.
    try {
      audioCtx = new AudioContext({ sampleRate: 16000 });
    } catch (e) {
      console.warn('[ears-onnx] AudioContext({sampleRate:16000}) rejected, using default:', e.message);
      audioCtx = new AudioContext();
    }
    console.log('[ears-onnx] AudioContext rate=', audioCtx.sampleRate, 'state=', audioCtx.state);

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    sourceNode = audioCtx.createMediaStreamSource(mediaStream);

    // AudioWorklet module load is idempotent — safe to call again on restart.
    await audioCtx.audioWorklet.addModule(
      new URL('./audio-capture-processor.js', import.meta.url).href
    );

    workletNode = new AudioWorkletNode(audioCtx, 'capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      processorOptions: { targetRate: 16000 },
    });

    let frameCount = 0;
    workletNode.port.onmessage = (e) => {
      const samples = e.data;
      frameCount++;
      if (frameCount === 1 || frameCount % 200 === 0) {
        console.log('[ears-onnx] worklet→main frame', frameCount, 'len=', samples.length);
      }
      if (worker) {
        worker.postMessage({ type: 'audio', samples }, [samples.buffer]);
      }
    };

    sourceNode.connect(workletNode);

    // Android WebView often delivers the AudioContext in 'suspended' state
    // even with mediaPlaybackRequiresUserGesture=false. Resume explicitly.
    if (audioCtx.state === 'suspended') {
      try { await audioCtx.resume(); } catch (e) {
        console.warn('[ears-onnx] resume() failed:', e.message);
      }
    }
    console.log('[ears-onnx] post-connect state=', audioCtx.state);

    stage = 'active';
    bus.emit('ear:listening');
    console.log('[ears-onnx] Active listening (AudioWorklet → Worker pipeline)');
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || (e.message || '').includes('permission'))) {
      bus.emit('ear:denied');
    } else {
      bus.emit('ear:unavailable');
    }
    console.warn('[ears-onnx] startActive failed:', e);
    throw e;
  }
}

function stopActive() {
  try { if (sourceNode && workletNode) sourceNode.disconnect(workletNode); } catch (e) {}
  try { if (workletNode) { workletNode.port.onmessage = null; workletNode.disconnect(); } } catch (e) {}
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (audioCtx)    { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
  workletNode = null;
  sourceNode = null;
}

// ── Result handlers ──

function handlePartial(text) {
  const norm = normalize(text);
  if (!norm || norm === lastInterim) return;
  lastInterim = norm;
  bus.emit('ear:interim', norm);
  bus.emit('ear:transcript', getDisplayTranscript());
}

function handleSentence(text) {
  const sentence = normalize(text);
  if (!sentence) return;
  history.push(sentence);
  while (history.length > MAX_HISTORY) history.shift();
  bus.emit('ear:sentence', sentence);
  bus.emit('ear:transcript', getDisplayTranscript());
  lastInterim = '';
}

function getDisplayTranscript() {
  const past = history.join(' ');
  return past + (past && lastInterim ? ' ' : '') + lastInterim;
}

// ── Helpers ──

// LibriSpeech zipformer outputs uppercase with leading space and no
// punctuation. intent.js / NLU expect normalized lowercase sentences.
function normalize(text) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
