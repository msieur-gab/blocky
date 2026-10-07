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
//
// The name gate (from babiban's runtime/wake.py): blocky hears everything but only acts on
// what is addressed to it. A sentence with its name in it opens a short window; what is said
// inside the window is passed on; everything else is dropped. The radio, blocky's own noises
// and people talking in the room carry no name, so they no longer reach the intents.
// There is no hot-word model: the name is looked for in the recognizer's text.
//
// PARKED 2026-10-07 (Gab): the gate is off unless asked for. The recognizer does not know the
// word "blocky" and writes a different neighbour each time (brookie, blokkie, rookie, abroukie),
// so the name is not a usable call yet. To take it up again: bias the recognizer toward the
// name, or call blocky with a word the model already knows.
//
// Start-up: the model is loaded as soon as the page opens, before the tap, and the microphone
// is opened at the tap without waiting for the model. Both used to wait for each other.
//
// URL switches:  ?wake=on    the name gate
//                ?model=big  the 190 MB model (not in git) instead of the 70 MB one
//                ?mic=off    do not open the microphone; audio comes from feed() (tests)
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as memory from './memory.js';

const VENDOR = './assets/sherpa/asr/';

const params = new URLSearchParams(window.location.search);

// Each model is one loader script plus the .data file it names
const BIG = params.get('model') === 'big';
const LOADER = BIG ? 'sherpa-onnx-wasm-main-asr.js' : 'sherpa-onnx-wasm-main-asr-en-kroko.js';
const MODEL_TYPE = BIG ? '' : 'zipformer2';   // known for the small model; the engine works it out for the other

const MIC = params.get('mic') !== 'off';

// ── Name gate ──
const GATE = params.get('wake') === 'on';
const ARM_MS = 6000;           // how long blocky waits for a sentence after hearing its name
// What the recognizer writes when it hears "blocky": never the same twice. Heard from Gab on
// 2026-10-07: brookie, blokkie, rookie, abroukie. A list could not keep up, so this is the
// skeleton they share: (a)(b) + l or r + o / oo / ou + k + an "ee" ending.
// It also takes rocky, rookie and looky, which are real words: the price of a name the model does not know.
const NAME_SHAPE = "a?b?[lr](?:o|oo|ou)c?k{1,2}(?:y|ie|ey|i|ee|\\s+e)";
let nameRe = null;             // built in init(), once the creature's own name is known
let armedUntil = 0;
let restTimer = null;
let aside = '';                // the last thing heard that was not for blocky (shown, not acted on)

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
    nameRe = buildNameRe();
    try {
      // The microphone needs the tap; the model does not, and is usually ready by now
      await Promise.all([loading, startActive()]);
      console.log(`[ears-onnx] Listening (creature: ${creatureName || 'none'}, name gate: ${GATE ? 'on' : 'off'})`);
      bus.emit('ear:ready');
    } catch (e) {
      console.warn('[ears-onnx] Init failed:', e);
      stopActive();            // no model: do not keep the microphone open for nothing
      stage = 'off';
      bus.emit('ear:unavailable', { reason: e?.message });
      throw e;
    }
  })();
  return initPromise;
}

export async function setName(name) {
  creatureName = name;
  nameRe = buildNameRe();
  await memory.setCreatureName(name);
  bus.emit('ami:named', { name });
}

export function getTranscript() { return getDisplayTranscript(); }

// For tests: 16 kHz mono samples, as if they came from the microphone
export function feed(samples) {
  if (worker && workerReady) worker.postMessage({ type: 'audio', samples }, [samples.buffer]);
}
export function getStage() { return stage; }
export function getCreatureName() { return creatureName; }

export function stop() {
  if (restTimer) { clearTimeout(restTimer); restTimer = null; }
  armedUntil = 0;
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
  const t0 = performance.now();
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
          console.log(`[ears-onnx] Model ready, ${((performance.now() - t0) / 1000).toFixed(1)} s after the page asked for it ` +
                      `(${(msg.fetchMs / 1000).toFixed(1)} s to fetch and start the engine, ${(msg.buildMs / 1000).toFixed(1)} s to build the recognizer)`);
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
          // Once running this is not fatal (the worker recreates its stream).
          // Before that, it means the engine or the model did not load.
          if (!workerReady) reject(new Error(msg.message));
          break;
      }
    };
    worker.onerror = (err) => {
      console.error('[ears-onnx] Worker fatal:', err.message || err);
      reject(new Error(err.message || 'worker error'));
    };

    worker.postMessage({ type: 'init', vendorUrl, loader: LOADER, modelType: MODEL_TYPE });
  });
}

// ── Active stage (capture + forward) ──

async function startActive() {
  if (stage === 'active') return;

  if (!MIC) {
    stage = 'active';
    bus.emit('ear:listening');
    console.log('[ears-onnx] Active, microphone off (?mic=off): waiting for feed()');
    return;
  }

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

// ── Name gate ──

function buildNameRe() {
  const names = [NAME_SHAPE];
  if (creatureName) names.push(creatureName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  // with the small word the recognizer likes to put in front ("a brookie", "hey blocky")
  return new RegExp(`\\b(?:(?:hey|hi|oh|ok|okay|a|the)\\s+)?(?:${names.join('|')})\\b`, 'g');
}

function named(text) { nameRe.lastIndex = 0; return nameRe.test(text); }
function armed() { return performance.now() < armedUntil; }

// Open (or keep open) the listening window. 'ami:wake' is sent once when it opens,
// 'ami:rest' once when it closes: the radio pauses on the first and resumes on the second.
function arm() {
  const wasArmed = armed();
  armedUntil = performance.now() + ARM_MS;
  if (restTimer) clearTimeout(restTimer);
  restTimer = setTimeout(rest, ARM_MS);
  if (!wasArmed) {
    console.log('[ears-onnx] → listening (name heard)');
    bus.emit('ami:wake', { name: creatureName });
  }
}

function rest() {
  if (restTimer) { clearTimeout(restTimer); restTimer = null; }
  if (!armedUntil) return;
  armedUntil = 0;
  console.log('[ears-onnx] ← resting (waiting for the name)');
  bus.emit('ami:rest');
}

// ── Result handlers ──

function handlePartial(text) {
  const norm = normalize(text);
  if (!norm || norm === lastInterim) return;

  if (GATE && !armed()) {
    // The name in a partial opens the window about a second before the sentence is
    // complete, so the radio is already quiet when the command itself is spoken.
    if (named(norm)) arm();
    else { aside = norm; return; }
  }

  aside = '';
  lastInterim = norm;
  bus.emit('ear:interim', norm);
  bus.emit('ear:transcript', getDisplayTranscript());
}

function handleSentence(text) {
  let sentence = normalize(text);
  if (!sentence) return;
  let closing = false;         // this sentence is the one blocky was called for

  if (GATE) {
    if (named(sentence)) {
      arm();
      // The name alone is passed on as it is (blocky looks up) and the window stays open
      // for the rest, which streaming recognition often delivers as a second sentence.
      // Otherwise the name is taken out, so it does not weigh on the intent.
      const rest = sentence.replace(nameRe, ' ').replace(/\s+/g, ' ').trim();
      if (rest) { sentence = rest; closing = true; }
    } else if (armed()) {
      closing = true;
    } else {
      aside = sentence;
      lastInterim = '';
      return;
    }
  }

  aside = '';
  history.push(sentence);
  while (history.length > MAX_HISTORY) history.shift();
  lastInterim = '';
  bus.emit('ear:sentence', sentence);
  bus.emit('ear:transcript', getDisplayTranscript());

  // One call, one sentence: the window closes once blocky has what it was called for.
  // Left open, it would let through whatever comes next (the radio it just started, for one).
  if (closing) rest();
}

function getDisplayTranscript() {
  if (aside) return `(not for me) ${aside}`;
  const past = history.join(' ');
  return past + (past && lastInterim ? ' ' : '') + lastInterim;
}

// ── Helpers ──

// Models write differently (capitals, punctuation). The intents expect plain lowercase words.
function normalize(text) {
  return (text || '').toLowerCase().replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

// ── Load the model now ──
// Importing this file means on-device speech was chosen, so there is nothing to wait for.
// A failure is kept for init() to report.
const loading = startWorker();
loading.catch(() => {});
