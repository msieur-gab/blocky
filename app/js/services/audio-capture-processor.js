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

    // Anti-alias low-pass before dropping samples. Without it, sound above 8 kHz (the hiss of
    // s, sh, f, th) folds back into the band the recognizer hears: "bath" came out as "bass".
    // Windowed sinc, cut at 7.2 kHz (0.9 × the target's Nyquist), only when downsampling.
    this.taps = null;
    if (this.ratio > 1.0001) {
      const N = 63, fc = 0.45 / this.ratio, mid = (N - 1) / 2, h = new Float32Array(N);
      let sum = 0;
      for (let k = 0; k < N; k++) {
        const x = k - mid;
        const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
        const w = 0.42 - 0.5 * Math.cos(2 * Math.PI * k / (N - 1)) + 0.08 * Math.cos(4 * Math.PI * k / (N - 1)); // Blackman
        h[k] = sinc * w; sum += h[k];
      }
      for (let k = 0; k < N; k++) h[k] /= sum;
      this.taps = h;
      this.hist = new Float32Array(N * 2);   // the last N input samples, twice, so a window is contiguous
      this.histPos = 0;
      this.filtered = new Float32Array(128);
    }
  }

  lowpass(block) {
    const h = this.taps, N = h.length, hist = this.hist;
    if (this.filtered.length < block.length) this.filtered = new Float32Array(block.length);
    const out = this.filtered;
    for (let n = 0; n < block.length; n++) {
      hist[this.histPos] = hist[this.histPos + N] = block[n];
      this.histPos = (this.histPos + 1) % N;
      // hist[histPos .. histPos+N-1] is now oldest → newest
      let acc = 0;
      for (let k = 0, j = this.histPos; k < N; k++, j++) acc += h[k] * hist[j];
      out[n] = acc;
    }
    return out.subarray(0, block.length);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) return true;
    const ch0 = this.taps ? this.lowpass(input[0]) : input[0];

    // Compact the buffer if the new chunk wouldn't fit.
    if (this.bufLen + ch0.length > this.buf.length) {
      // The read pointer can step past the end (ratio 3 at 48 kHz): never drop more than is
      // there, or bufLen goes negative and set() throws, which kills the worklet for good.
      const start = Math.min(Math.floor(this.outIdx), this.bufLen);
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
