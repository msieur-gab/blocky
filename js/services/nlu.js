// ══════════════════════════════════════════
// NLU Engine
// MiniLM-L6-v2 semantic similarity
// Embeds text → cosine match against intents
// ══════════════════════════════════════════

import * as tokenizer from './tokenizer.js';

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

export function classify(embedding) {
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

  if (bestScore >= MATCH_THRESHOLD) {
    return { intent: bestIntent, confidence: bestScore };
  }

  return null;
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

  console.log('[nlu] Pre-embedding intent exemplars...');
  const t0 = performance.now();

  for (const [intent, phrases] of Object.entries(INTENT_EXEMPLARS)) {
    exemplarEmbeddings[intent] = [];
    for (const phrase of phrases) {
      const emb = await embed(phrase);
      if (emb) exemplarEmbeddings[intent].push(emb);
    }
  }

  const dt = ((performance.now() - t0) / 1000).toFixed(1);
  const count = Object.values(exemplarEmbeddings).reduce((s, a) => s + a.length, 0);
  console.log(`[nlu] Ready — ${count} exemplars embedded in ${dt}s`);
}

export function isReady() {
  return session !== null && Object.keys(exemplarEmbeddings).length > 0;
}
