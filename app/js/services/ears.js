// ══════════════════════════════════════════
// Ears facade — picks STT implementation at module load.
//
//   default   → ears-webspeech.js  (Web Speech API)
//   ?stt=onnx → ears-onnx.js       (sherpa-onnx WASM)
//
// Both impls expose the same public API and emit the same ear:* bus events,
// so consumers (intent.js, app.js, magic8.js) don't care which is active.
//
// Web Speech remains the default until the on-device path is validated
// inside the Android kiosk WebView.
// ══════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const useOnnx = params.get('stt') === 'onnx';

const impl = useOnnx
  ? await import('./ears-onnx.js')
  : await import('./ears-webspeech.js');

console.log(`[ears] Using ${useOnnx ? 'ears-onnx (sherpa)' : 'ears-webspeech (Web Speech API)'}`);

export const init             = impl.init;
export const setName          = impl.setName;
export const getTranscript    = impl.getTranscript;
export const getStage         = impl.getStage;
export const getCreatureName  = impl.getCreatureName;
export const stop             = impl.stop;
export const forceActive      = impl.forceActive;
