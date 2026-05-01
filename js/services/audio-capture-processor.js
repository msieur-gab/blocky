// AudioWorkletProcessor — captures mono mic audio at 16kHz and posts
// each render quantum (128 samples) to the main thread. Runs on the
// audio thread, isolated from main-thread contention (MediaPipe,
// rendering, etc.) — capture never gets starved.
//
// The samples are transferred (not copied) for zero-copy throughput.
// Each postMessage carries 128 floats = 512 bytes, ~125 msgs/sec.

class CaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      const samples = new Float32Array(input[0]);
      this.port.postMessage(samples, [samples.buffer]);
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
