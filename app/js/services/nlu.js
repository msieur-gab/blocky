// ══════════════════════════════════════════
// NLU Engine
// MiniLM-L6-v2 semantic similarity
// Embeds text → cosine match against intents
// ══════════════════════════════════════════

import * as tokenizer from './tokenizer.js';
import { themes } from '../data/talk.js';

const MODEL_PATH = 'assets/models/minilm-quantized.onnx';
const EMBED_DIM = 384;
const MATCH_THRESHOLD = 0.45;

let session = null;
let loading = false;

// ── Intent exemplars ──
// Each intent has example phrases. Pre-embedded at init.

const INTENT_EXEMPLARS = {
  greet: [
    'hello blocky',
    'good morning buddy',
    'hey there',
    'hi how are you',
    'wake up blocky',
    'how did you sleep',
    'did you sleep well',
    'good to see you',
  ],
  sleep: [
    'good night blocky',
    'time to sleep',
    'go to bed',
    'nap time',
    'I am going to bed now',
    'I am sleepy',
    'I want to go to sleep',
  ],
  play: [
    'let us play a game',
    'I want to play',
    'can we play something',
    'rock paper scissors',
    'I am ready to play',
  ],
  introduction: [
    'my name is Sophie',
    'I am called Tom',
    'this is my friend Anna',
    'say hello to my mom',
    'meet my dad',
  ],
  bored: [
    'I am so bored',
    'there is nothing to do',
    'I do not know what to do',
    'this is boring',
    'entertain me',
  ],
  story: [
    'tell me a story',
    'story time',
    'read me something',
    'can you tell me a tale',
    'I want to hear a story',
  ],
  music: [
    'play some music',
    'I want to hear a song',
    'sing something',
    'put on some music',
    'can you play a tune',
  ],
  emotion_happy: [
    'I am so happy',
    'that was really funny',
    'this is awesome',
    'I love this so much',
    'yay that is great',
  ],
  emotion_sad: [
    'I feel sad',
    'I miss my mommy',
    'I want to cry',
    'I am not feeling good',
    'that makes me sad',
  ],
  emotion_scared: [
    'I am scared',
    'there is a monster',
    'I am afraid of the dark',
    'something is scary',
    'help I am frightened',
  ],
  emotion_angry: [
    'I am so angry',
    'that is not fair',
    'I am really mad',
    'I hate this',
    'stop it I am upset',
  ],
  agree: [
    'yes',
    'yeah sure',
    'okay let us do it',
    'sounds good',
    'yes please',
    'absolutely',
    'of course',
  ],
  agree_strong: [
    'yes yes yes',
    'oh yeah definitely',
    'that is so awesome yes',
    'I really want to',
    'a hundred percent',
  ],
  disagree: [
    'no thanks',
    'nah not really',
    'I do not want to',
    'no not now',
    'maybe later',
  ],
  disagree_strong: [
    'no way',
    'absolutely not',
    'I really do not want that',
    'never',
    'no no no',
  ],
  negation: [
    'I am not angry',
    'I am not sad',
    'I am not scared',
    'I am not bored',
    'no I am fine',
    'I am okay actually',
    'never mind',
  ],
  look: [
    'blocky look',
    'look at this',
    'look at my hand',
    'look at my finger',
    'look at my fingers',
    'look at me',
    'watch this',
    'check this out',
    'can you see this',
    'can you see my hand',
    'look what I can do',
    'see this',
  ],
  time: [
    'what time is it',
    'tell me the time',
    'what is the time',
    'do you know what time it is',
    'how late is it',
    'what hour is it',
    'blocky what time',
  ],
  stop: [
    'stop the music',
    'pause the music',
    'turn it off',
    'stop playing',
    'be quiet',
    'silence please',
    'that is enough',
    'stop it',
    'enough',
  ],
  question: [
    'what are you doing',
    'why is that happening',
    'how does this work',
    'what is this',
    'tell me why',
  ],
  love: [
    'I love you blocky',
    'you are my best friend',
    'give me a hug',
    'I really like you',
    'you are so sweet',
  ],
};

// Small-talk themes (data/talk.js) are intents like the others
for (const [theme, { phrases }] of Object.entries(themes)) {
  INTENT_EXEMPLARS[theme] = [...(INTENT_EXEMPLARS[theme] || []), ...phrases];
}

// Pre-computed embeddings: { intent: Float32Array[] }
let exemplarEmbeddings = {};

// ── Model loading ──

async function ensureModel() {
  if (session) return true;
  if (loading) return false;
  if (!window.ort) return false;

  loading = true;
  console.log('[nlu] Loading MiniLM model...');

  try {
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['wasm'],
    });
    loading = false;
    console.log('[nlu] Model loaded');
    return true;
  } catch (e) {
    loading = false;
    console.error('[nlu] Model load failed:', e);
    return false;
  }
}

// ── Embedding ──

export async function embed(text) {
  const ready = await ensureModel();
  if (!ready) return null;

  const { inputIds, attentionMask, tokenTypeIds, seqLen } = tokenizer.tokenize(text);

  const feeds = {
    input_ids: new ort.Tensor('int64', inputIds, [1, seqLen]),
    attention_mask: new ort.Tensor('int64', attentionMask, [1, seqLen]),
    token_type_ids: new ort.Tensor('int64', tokenTypeIds, [1, seqLen]),
  };

  const results = await session.run(feeds);

  // Output: last_hidden_state [1, seqLen, 384]
  const output = results.last_hidden_state ?? results.output_0 ?? Object.values(results)[0];
  const data = output.data; // Float32Array

  // Mean pooling over token positions (respecting attention mask)
  const embedding = new Float32Array(EMBED_DIM);
  let tokenCount = seqLen; // all tokens are real (no padding)

  for (let t = 0; t < seqLen; t++) {
    const offset = t * EMBED_DIM;
    for (let d = 0; d < EMBED_DIM; d++) {
      embedding[d] += data[offset + d];
    }
  }

  for (let d = 0; d < EMBED_DIM; d++) {
    embedding[d] /= tokenCount;
  }

  // L2 normalize
  return l2Normalize(embedding);
}

function l2Normalize(vec) {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

// ── Classification ──

// The closest intent, however far it is
export function nearest(embedding) {
  let bestIntent = null;
  let bestScore = -1;

  for (const [intent, embeddings] of Object.entries(exemplarEmbeddings)) {
    for (const exemplar of embeddings) {
      const score = cosine(embedding, exemplar);
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }
  }

  return { intent: bestIntent, confidence: bestScore };
}

// ── Is this word a first name? ──
// "this is eva" against "this is fun": the word is compared with a handful of names and a
// handful of ordinary words, and belongs with the closer group. Measured on words in neither
// list: names it has not seen are recognised about nine times in ten (workbench/nlu-eval).

const NAME_LIKE = ['emma', 'tom', 'sophie', 'anna', 'lucas', 'maria', 'david', 'mom', 'dad', 'grandma', 'john', 'sara', 'leo', 'mia'];
const WORD_LIKE = ['fun', 'good', 'bad', 'big', 'ready', 'angry', 'tired', 'done', 'nice', 'hard', 'right', 'here', 'broken', 'first', 'enough', 'mine', 'true', 'strange', 'lost', 'busy', 'old', 'dirty', 'time', 'raining', 'dark', 'cold'];
let nameRefs = null;

export async function looksLikeName(word) {
  if (!session) return false;
  if (!nameRefs) {
    nameRefs = { names: [], words: [] };
    for (const w of NAME_LIKE) nameRefs.names.push(await embed(w));
    for (const w of WORD_LIKE) nameRefs.words.push(await embed(w));
  }
  const e = await embed(word.toLowerCase());
  const closest = list => Math.max(...list.map(ref => cosine(e, ref)));
  return closest(nameRefs.names) > closest(nameRefs.words);
}

export function classify(embedding) {
  const best = nearest(embedding);
  return best.confidence >= MATCH_THRESHOLD ? best : null;
}

function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // both L2-normalized
}

// ── Init: pre-embed all exemplars ──

export async function init() {
  await tokenizer.init();

  const ready = await ensureModel();
  if (!ready) {
    console.warn('[nlu] Model not available, semantic tier disabled');
    return;
  }

  // The exemplars only change when the code does: what was computed last time is kept
  // and read back, instead of running the model 160 times at every start.
  const kept = readKept();
  if (kept) {
    exemplarEmbeddings = kept;
    const count = Object.values(kept).reduce((s, a) => s + a.length, 0);
    console.log(`[nlu] Ready — ${count} exemplars read back from last time`);
    return;
  }

  console.log('[nlu] Pre-embedding intent exemplars...');
  const t0 = performance.now();

  const fresh = {};
  for (const [intent, phrases] of Object.entries(INTENT_EXEMPLARS)) {
    fresh[intent] = [];
    for (const phrase of phrases) {
      const emb = await embed(phrase);
      if (emb) fresh[intent].push(emb);
    }
  }
  exemplarEmbeddings = fresh;
  keep(fresh);

  const dt = ((performance.now() - t0) / 1000).toFixed(1);
  const count = Object.values(exemplarEmbeddings).reduce((s, a) => s + a.length, 0);
  console.log(`[nlu] Ready — ${count} exemplars embedded in ${dt}s`);
}

// ── Kept embeddings ──
// One entry in localStorage, named after the model and the exact phrases. Change a phrase,
// add a skill or swap the model, and the name no longer matches: everything is computed again.

const KEPT = 'blocky-nlu-exemplars';

function keptName() {
  const text = MODEL_PATH + JSON.stringify(INTENT_EXEMPLARS);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `${text.length}:${h}`;
}

function keep(embeddings) {
  try {
    const intents = {};
    for (const [intent, list] of Object.entries(embeddings)) {
      intents[intent] = list.map(v => btoa(String.fromCharCode(...new Uint8Array(v.buffer))));
    }
    localStorage.setItem(KEPT, JSON.stringify({ name: keptName(), intents }));
  } catch (e) { /* no room, or no storage: it will be computed again next time */ }
}

function readKept() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEPT) || 'null');
    if (!saved || saved.name !== keptName()) return null;
    const out = {};
    for (const [intent, list] of Object.entries(saved.intents)) {
      out[intent] = list.map(b64 => new Float32Array(Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer));
      if (out[intent].some(v => v.length !== EMBED_DIM)) return null;
    }
    return out;
  } catch (e) { return null; }
}

// ── Add exemplars from skills (called by kernel on skill registration) ──

export async function addExemplars(intentExemplars) {
  if (!session) {
    // Model not loaded yet — queue for later
    for (const [intent, phrases] of Object.entries(intentExemplars)) {
      if (!INTENT_EXEMPLARS[intent]) INTENT_EXEMPLARS[intent] = [];
      INTENT_EXEMPLARS[intent].push(...phrases);
    }
    return;
  }

  // Model loaded — embed immediately
  let count = 0;
  for (const [intent, phrases] of Object.entries(intentExemplars)) {
    if (!exemplarEmbeddings[intent]) exemplarEmbeddings[intent] = [];
    for (const phrase of phrases) {
      const emb = await embed(phrase);
      if (emb) {
        exemplarEmbeddings[intent].push(emb);
        count++;
      }
    }
  }
  console.log(`[nlu] Added ${count} skill exemplars`);
}

export function isReady() {
  return session !== null && Object.keys(exemplarEmbeddings).length > 0;
}
