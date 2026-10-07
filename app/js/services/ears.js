// ══════════════════════════════════════════
// Ears facade — picks STT implementation at module load.
//
//   ?stt=onnx      → ears-onnx.js       (sherpa-onnx WASM, on the device)
//   ?stt=webspeech → ears-webspeech.js  (the browser's Web Speech API)
//   neither        → on-device where the browser has no speech service of its own
//                    (no API at all, or Brave, which has the API with nothing behind it);
//                    Web Speech elsewhere
//
// Both impls expose the same public API and emit the same ear:* bus events,
// so consumers (intent.js, app.js, magic8.js) don't care which is active.
//
// The on-device path has not been validated inside the Android kiosk WebView yet.
// ══════════════════════════════════════════

const params = new URLSearchParams(window.location.search);
const asked = params.get('stt');
const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !navigator.brave;
const useOnnx = asked === 'onnx' || (asked !== 'webspeech' && !hasSpeech);

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
