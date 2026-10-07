// ══════════════════════════════════════════
// Ears Worker — sherpa-onnx streaming ASR in a Web Worker.
//
// Why a worker:
// 1. Sherpa-onnx's WASM loader uses the global Module pattern. So does
//    MediaPipe's tasks-vision. On the main thread they collide: whichever
//    loads second clobbers Module.HEAPF32, and the first one's pointers
//    index into the wrong heap → "offset is out of bounds".
//    A Worker has its own self/global, so sherpa's Module lives there
//    untouched by anything on the main thread.
// 2. Decode runs on a dedicated thread; main-thread rendering and
//    MediaPipe inference can't starve it.
//
// Protocol (postMessage):
//   main → worker:
//     { type: 'init', vendorUrl }
//     { type: 'audio', samples (Float32Array, 16kHz mono) }
//     { type: 'reset' }
//     { type: 'stop' }
//   worker → main:
//     { type: 'progress', pct }
//     { type: 'ready' }
//     { type: 'partial', text }
//     { type: 'sentence', text }
//     { type: 'error', message }
// ══════════════════════════════════════════

let recognizer = null;
let stream = null;
let lastPartial = '';

self.onmessage = (e) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':   return init(msg.vendorUrl);
    case 'audio':  return onAudio(msg.samples);
    case 'reset':  return resetStream();
    case 'stop':   return self.close();
  }
};

function init(vendorUrl) {
  // Configure the global Module BEFORE importing the wasm loader.
  self.Module = {};
  self.Module.locateFile = (path) => vendorUrl + path;
  self.Module.setStatus = (s) => {
    const m = s && s.match(/Downloading data\.\.\. \((\d+)\/(\d+)\)/);
    if (m) {
      const pct = m[2] === '0' ? 0 : Math.round((Number(m[1]) / Number(m[2])) * 100);
      postMessage({ type: 'progress', pct });
    }
  };
  self.Module.onRuntimeInitialized = () => {
    try {
      recognizer = self.createOnlineRecognizer(self.Module);
      stream = recognizer.createStream();
      postMessage({ type: 'ready' });
    } catch (err) {
      postMessage({ type: 'error', message: 'recognizer creation: ' + err.message });
    }
  };

  try {
    // Both are classic scripts. importScripts is sync.
    self.importScripts(
      vendorUrl + 'sherpa-onnx-asr.js',
      vendorUrl + 'sherpa-onnx-wasm-main-asr.js'
    );
  } catch (err) {
    postMessage({ type: 'error', message: 'importScripts: ' + err.message });
  }
}

function onAudio(samples) {
  if (!recognizer || !stream || !samples) return;
  try {
    stream.acceptWaveform(16000, samples);
    while (recognizer.isReady(stream)) recognizer.decode(stream);

    const result = recognizer.getResult(stream).text || '';
    const isEndpoint = recognizer.isEndpoint(stream);

    if (result !== lastPartial) {
      lastPartial = result;
      if (result) postMessage({ type: 'partial', text: result });
    }

    if (isEndpoint) {
      if (lastPartial) postMessage({ type: 'sentence', text: lastPartial });
      try { recognizer.reset(stream); } catch (e) {}
      lastPartial = '';
    }
  } catch (err) {
    // No main-thread Module collision possible here, so this should be rare.
    // Recreate the stream on any failure to keep the pump alive.
    postMessage({ type: 'error', message: 'decode: ' + err.message });
    try { stream && stream.free && stream.free(); } catch (e) {}
    try { stream = recognizer.createStream(); lastPartial = ''; } catch (e) {}
  }
}

function resetStream() {
  if (recognizer && stream) {
    try { recognizer.reset(stream); } catch (e) {}
  }
  lastPartial = '';
}
