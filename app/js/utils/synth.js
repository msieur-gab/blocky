// ══════════════════════════════════════════
// Synth Helpers
// Thin abstraction over Web Audio
// All gain is relative — master volume handles levels
// ══════════════════════════════════════════

let ctx = null;
let master = null;

export function init(audioCtx, masterGain) {
  ctx = audioCtx;
  master = masterGain;
}

export function getCtx() { return ctx; }
export function getOut() { return master; }

// ── Tone: single oscillator with freq + gain envelopes ──
// freq: number | [start, end] | [start, mid, end]
// env: { attack, hold, release } in seconds (relative to duration)
// Returns nothing — fire and forget

export function tone(opts = {}) {
  const c = ctx;
  const t = c.currentTime + (opts.delay || 0);
  const dur = opts.duration || 0.3;
  const type = opts.type || 'sine';
  const vol = opts.volume || 1;

  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;

  // Frequency envelope
  const freq = opts.freq || 440;
  if (Array.isArray(freq)) {
    osc.frequency.setValueAtTime(freq[0], t);
    if (freq.length === 2) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq[1]), t + dur * 0.8);
    } else if (freq.length >= 3) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq[1]), t + dur * 0.4);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, freq[2]), t + dur * 0.9);
    }
  } else {
    osc.frequency.setValueAtTime(freq, t);
  }

  // Gain envelope
  const atk = opts.attack ?? 0.01;
  const rel = opts.release ?? 0.3;
  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(vol, t + atk);
  gain.gain.setValueAtTime(vol, t + dur - dur * rel);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

  // Optional vibrato
  if (opts.vibrato) {
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = opts.vibrato.rate || 6;
    lfoGain.gain.value = opts.vibrato.depth || 10;
    lfo.connect(lfoGain).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
  }

  // Optional filter
  let node = osc;
  if (opts.filter) {
    const filt = c.createBiquadFilter();
    filt.type = opts.filter.type || 'lowpass';
    filt.frequency.value = opts.filter.freq || 1000;
    filt.Q.value = opts.filter.Q || 1;
    if (opts.filter.freqEnd) {
      filt.frequency.setValueAtTime(opts.filter.freq || 1000, t);
      filt.frequency.exponentialRampToValueAtTime(opts.filter.freqEnd, t + dur);
    }
    node = node;
    osc.connect(filt);
    filt.connect(gain);
  } else {
    osc.connect(gain);
  }

  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur);
}

// ── Noise: filtered noise burst ──

export function noise(opts = {}) {
  const c = ctx;
  const t = c.currentTime + (opts.delay || 0);
  const dur = opts.duration || 0.2;
  const vol = opts.volume || 1;

  const bufSize = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, bufSize, c.sampleRate);
  const data = buf.getChannelData(0);

  // Shape the noise
  for (let i = 0; i < bufSize; i++) {
    let env = 1;
    if (opts.shape === 'decay') {
      env = Math.exp(-i / (bufSize * (opts.decayRate || 0.2)));
    } else if (opts.shape === 'sine') {
      env = Math.sin((i / bufSize) * Math.PI);
    } else if (opts.shape === 'attack') {
      env = Math.min(1, (i / bufSize) * 4) * Math.exp(-(i - bufSize * 0.25) / (bufSize * 0.5));
    }
    // Optional modulation (flutter/bubble)
    let mod = 1;
    if (opts.modFreq) {
      mod = Math.sin((i / c.sampleRate) * opts.modFreq * Math.PI * 2) * 0.5 + 0.5;
    }
    data[i] = (Math.random() * 2 - 1) * env * mod;
  }

  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t);

  let node = src;
  if (opts.filter) {
    const filt = c.createBiquadFilter();
    filt.type = opts.filter.type || 'lowpass';
    filt.frequency.value = opts.filter.freq || 1000;
    if (opts.filter.freqEnd) {
      filt.frequency.setValueAtTime(opts.filter.freq, t);
      filt.frequency.linearRampToValueAtTime(opts.filter.freqEnd, t + dur);
    }
    filt.Q.value = opts.filter.Q || 1;
    src.connect(filt);
    filt.connect(gain);
  } else {
    src.connect(gain);
  }

  gain.connect(master);
  src.start(t);
}

// ── Sequence: play multiple tones in order ──
// notes: [{ freq, duration, type?, volume?, ... }, ...]

export function seq(notes, opts = {}) {
  let offset = opts.delay || 0;
  const gap = opts.gap ?? 0.02;
  const type = opts.type || 'sine';
  const vol = opts.volume || 1;

  notes.forEach(note => {
    const dur = note.duration || note.dur || 0.1;
    tone({
      type: note.type || type,
      freq: note.freq,
      duration: dur,
      delay: offset,
      volume: note.volume || vol,
      attack: note.attack ?? 0.005,
      release: note.release ?? 0.3,
      filter: note.filter || opts.filter,
      vibrato: note.vibrato || opts.vibrato,
    });
    offset += dur + (note.gap ?? gap);
  });

  return offset; // total duration
}

// ── Repeat: same tone N times with variation ──

export function repeat(count, opts = {}) {
  let offset = opts.delay || 0;
  const gap = opts.gap ?? 0.02;

  for (let i = 0; i < count; i++) {
    const freqBase = opts.freq || 400;
    const variation = opts.variation || 0;
    const freq = freqBase + (Math.random() * 2 - 1) * freqBase * variation;
    const dur = opts.duration || 0.1;

    tone({
      ...opts,
      freq: opts.freqFn ? opts.freqFn(i, count, freqBase) : freq,
      duration: dur,
      delay: offset,
    });

    offset += dur + gap;
  }

  return offset;
}
