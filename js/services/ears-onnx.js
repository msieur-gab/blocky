// ══════════════════════════════════════════
// Ears Service — On-device sherpa-onnx streaming ASR
// Drop-in replacement for ears.js (Web Speech API).
// Same public API, same bus events.
//
// Phase 1: always-active listening only.
// Phase 2 will add the wake-word stage (sherpa-onnx KWS).
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as memory from './memory.js';

// ── Vendor paths ──
// Loads sherpa-onnx wasm + the bundled ASR model from assets/sherpa/asr/.
// The .data blob (~183MB) is the LibriSpeech zipformer preloaded into MEMFS.
// Production target is to rebuild the WASM with the 20M streaming zipformer.
const VENDOR = './assets/sherpa/asr/';

// ── Module-scoped state ──
let creatureName = null;
let stage = 'off';            // 'off' | 'active'
let recognizer = null;
let recogStream = null;

let audioCtx = null;
let mediaStream = null;
let sourceNode = null;
let scriptNode = null;
let micSampleRate = 0;

let lastPartial = '';
const history = [];
const MAX_HISTORY = 5;

let initPromise = null;       // single-flight script + runtime init
let consecutiveErrors = 0;    // for stream recovery
const ERROR_RESET_THRESHOLD = 3;

// ── Public API ──

export async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    creatureName = await memory.getCreatureName();
    try {
      await loadRuntime();
      recognizer = window.createOnlineRecognizer(window.Module);
      console.log('[ears-onnx] Recognizer ready (creature name:',
                  creatureName ? `"${creatureName}"` : 'none', ')');
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
  return past + (past && lastPartial ? ' ' : '') + lastPartial;
}
export function getStage() { return stage; }
export function getCreatureName() { return creatureName; }

export function stop() {
  stopActive();
  stage = 'off';
}

export function forceActive() {
  if (stage === 'active') return;
  startActive();
}

// ── Runtime loader ──
// sherpa-onnx ships as classic scripts that pollute window globals
// (Module, createOnlineRecognizer). We inject them once and resolve
// when Module.onRuntimeInitialized fires.

function loadRuntime() {
  return new Promise((resolve, reject) => {
    if (window.createOnlineRecognizer && window.Module && window.Module._malloc) {
      resolve(); return;
    }

    window.Module = {};
    window.Module.locateFile = (path /* , scriptDir */) => VENDOR + path;
    window.Module.setStatus = (s) => {
      const m = s && s.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
      if (m) {
        const pct = m[2] === '0' ? 0 : Math.round((Number(m[1]) / Number(m[2])) * 100);
        console.log(`[ears-onnx] Loading model: ${pct}%`);
      }
    };
    window.Module.onRuntimeInitialized = () => resolve();

    const wrapper = document.createElement('script');
    wrapper.src = VENDOR + 'sherpa-onnx-asr.js';
    wrapper.onload = () => {
      const loader = document.createElement('script');
      loader.src = VENDOR + 'sherpa-onnx-wasm-main-asr.js';
      loader.onerror = () => reject(new Error('failed to load wasm loader'));
      document.head.appendChild(loader);
    };
    wrapper.onerror = () => reject(new Error('failed to load sherpa-onnx-asr.js'));
    document.head.appendChild(wrapper);
  });
}

// ── Active stage ──

async function startActive() {
  if (!recognizer) return;
  if (stage === 'active') return;

  try {
    audioCtx = new AudioContext({ sampleRate: 16000 });
    micSampleRate = audioCtx.sampleRate;
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    sourceNode = audioCtx.createMediaStreamSource(mediaStream);

    if (!recogStream) recogStream = recognizer.createStream();

    const bufSize = 4096;
    scriptNode = audioCtx.createScriptProcessor(bufSize, 1, 2);
    scriptNode.onaudioprocess = onAudio;

    sourceNode.connect(scriptNode);
    scriptNode.connect(audioCtx.destination);

    stage = 'active';
    bus.emit('ear:listening');
    console.log('[ears-onnx] Active listening');
  } catch (e) {
    if (e && (e.name === 'NotAllowedError' || e.message?.includes('permission'))) {
      bus.emit('ear:denied');
    } else {
      bus.emit('ear:unavailable');
    }
    console.warn('[ears-onnx] startActive failed:', e);
    throw e;
  }
}

function stopActive() {
  try { if (sourceNode && scriptNode) sourceNode.disconnect(scriptNode); } catch (e) {}
  try { if (scriptNode) scriptNode.disconnect(); } catch (e) {}
  if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
  if (audioCtx)    { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
  scriptNode = null;
  sourceNode = null;
}

// ── Audio pump ──

function onAudio(e) {
  let samples = new Float32Array(e.inputBuffer.getChannelData(0));
  if (micSampleRate !== 16000) samples = downsample(samples, micSampleRate, 16000);

  let result = '';
  let isEndpoint = false;
  try {
    recogStream.acceptWaveform(16000, samples);
    while (recognizer.isReady(recogStream)) recognizer.decode(recogStream);
    result = recognizer.getResult(recogStream).text || '';
    isEndpoint = recognizer.isEndpoint(recogStream);
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;
    if (consecutiveErrors === 1) {
      // Log once with full diagnostics; subsequent errors get a count.
      const heap = window.Module && window.Module.HEAPF32;
      console.warn('[ears-onnx] acceptWaveform/decode failed:',
                   { error: err.message,
                     samplesLen: samples.length,
                     heapLen: heap ? heap.length : '?',
                     heapBufLen: heap && heap.buffer ? heap.buffer.byteLength : '?',
                     wasmMemBufLen: window.Module && window.Module.wasmMemory
                       ? window.Module.wasmMemory.buffer.byteLength : '?' });
    }
    if (consecutiveErrors >= ERROR_RESET_THRESHOLD) {
      console.warn(`[ears-onnx] ${consecutiveErrors} errors — recreating recogStream`);
      try { recogStream && recogStream.free && recogStream.free(); } catch (e) {}
      try {
        recogStream = recognizer.createStream();
        consecutiveErrors = 0;
        lastPartial = '';
      } catch (e) {
        console.error('[ears-onnx] stream recreation failed:', e);
      }
    }
    return;
  }

  if (result && result !== lastPartial) {
    lastPartial = result;
    const interim = normalize(result);
    bus.emit('ear:interim', interim);
    bus.emit('ear:transcript', getDisplayTranscript());
  }

  if (isEndpoint) {
    if (lastPartial) {
      const sentence = normalize(lastPartial);
      if (sentence) {
        history.push(sentence);
        while (history.length > MAX_HISTORY) history.shift();
        bus.emit('ear:sentence', sentence);
        bus.emit('ear:transcript', getDisplayTranscript());
      }
    }
    try { recognizer.reset(recogStream); } catch (e) {}
    lastPartial = '';
  }
}

function getDisplayTranscript() {
  const past = history.join(' ');
  const live = lastPartial ? normalize(lastPartial) : '';
  return past + (past && live ? ' ' : '') + live;
}

// ── Helpers ──

// LibriSpeech zipformer outputs uppercase with leading space and no
// punctuation. intent.js / NLU expect normalized lowercase sentences.
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function downsample(buf, fromRate, toRate) {
  if (fromRate === toRate) return buf;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.round(buf.length / ratio));
  let oi = 0, bi = 0;
  while (oi < out.length) {
    const next = Math.round((oi + 1) * ratio);
    let acc = 0, n = 0;
    for (let i = bi; i < next && i < buf.length; i++) { acc += buf[i]; n++; }
    out[oi++] = n ? acc / n : 0;
    bi = next;
  }
  return out;
}
