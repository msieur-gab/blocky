// AudioWorkletProcessor — captures mono mic audio and downsamples to the
// target rate (16kHz for sherpa-onnx) before posting to the main thread.
//
// Why resample here:
// Android WebView frequently ignores `new AudioContext({sampleRate: 16000})`
// and returns the hardware native rate (often 48000 Hz). The browser does
// NOT auto-resample MediaStreamSource output to match the AudioContext, so
// without this stage sherpa would receive 3x-fast garbage and emit nothing.
//
// Linear interpolation is sufficient for ASR — zipformer doesn't care about
// the small aliasing introduced and the latency is negligible.

const TARGET_RATE_DEFAULT = 16000;
const OUTPUT_BATCH = 512; // 32 ms at 16 kHz, ~31 messages/sec

class CaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetRate || TARGET_RATE_DEFAULT;
    this.ratio = sampleRate / this.targetRate; // worklet global `sampleRate`
    this.buf = new Float32Array(8192);
    this.bufLen = 0;
    this.outIdx = 0; // fractional read pointer into buf
    this.outBatch = new Float32Array(OUTPUT_BATCH);
    this.outFill = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;
    const ch0 = input[0];

    // Compact the buffer if the new chunk wouldn't fit.
    if (this.bufLen + ch0.length > this.buf.length) {
      const start = Math.floor(this.outIdx);
      const remaining = this.bufLen - start;
      this.buf.copyWithin(0, start, this.bufLen);
      this.bufLen = remaining;
      this.outIdx -= start;
    }
    this.buf.set(ch0, this.bufLen);
    this.bufLen += ch0.length;

    // Pull resampled output samples until we'd run off the end.
    while (this.outIdx + 1 < this.bufLen) {
      const i = Math.floor(this.outIdx);
      const f = this.outIdx - i;
      this.outBatch[this.outFill++] = this.buf[i] * (1 - f) + this.buf[i + 1] * f;

      if (this.outFill >= this.outBatch.length) {
        const out = new Float32Array(this.outBatch);
        this.port.postMessage(out, [out.buffer]);
        this.outFill = 0;
      }
      this.outIdx += this.ratio;
    }

    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
