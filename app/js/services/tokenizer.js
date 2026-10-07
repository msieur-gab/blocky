// ══════════════════════════════════════════
// WordPiece Tokenizer
// BERT-compatible tokenization for MiniLM
// Reads vocab.txt — no external dependencies
// ══════════════════════════════════════════

const VOCAB_PATH = 'assets/models/vocab.txt';

let vocab = null;       // Map<string, number> — token → id
let vocabList = null;   // Array<string> — id → token
let ready = false;

// Special token IDs (standard BERT)
const CLS_TOKEN = '[CLS]';
const SEP_TOKEN = '[SEP]';
const UNK_TOKEN = '[UNK]';
const PAD_TOKEN = '[PAD]';

let CLS_ID = 101;
let SEP_ID = 102;
let UNK_ID = 100;

const MAX_SEQ_LEN = 64; // kid sentences are short

// ── Load vocabulary ──

export async function init() {
  if (ready) return;

  const res = await fetch(VOCAB_PATH);
  const text = await res.text();
  vocabList = text.split('\n').filter(t => t.length > 0);

  vocab = new Map();
  vocabList.forEach((token, i) => vocab.set(token, i));

  CLS_ID = vocab.get(CLS_TOKEN) ?? 101;
  SEP_ID = vocab.get(SEP_TOKEN) ?? 102;
  UNK_ID = vocab.get(UNK_TOKEN) ?? 100;

  ready = true;
  console.log(`[tokenizer] Loaded ${vocab.size} tokens`);
}

// ── Tokenize text → model inputs ──

export function tokenize(text) {
  if (!ready) throw new Error('[tokenizer] Not initialized');

  // Lowercase + basic cleanup
  const clean = text.toLowerCase().trim();

  // Whitespace split → wordpiece each token
  // Contractions are split the way BERT does it: "let's" → let ' s
  const words = clean.replace(/[\u2018\u2019]/g, "'").split(/\s+/)
    .flatMap(w => w.split(/(')/)).filter(w => w.length > 0);
  const tokens = [CLS_ID];

  for (const word of words) {
    const subTokens = wordPiece(word);
    for (const t of subTokens) {
      if (tokens.length >= MAX_SEQ_LEN - 1) break;
      tokens.push(t);
    }
    if (tokens.length >= MAX_SEQ_LEN - 1) break;
  }

  tokens.push(SEP_ID);

  const seqLen = tokens.length;
  const inputIds = new BigInt64Array(seqLen);
  const attentionMask = new BigInt64Array(seqLen);
  const tokenTypeIds = new BigInt64Array(seqLen);

  for (let i = 0; i < seqLen; i++) {
    inputIds[i] = BigInt(tokens[i]);
    attentionMask[i] = 1n;
    tokenTypeIds[i] = 0n;
  }

  return { inputIds, attentionMask, tokenTypeIds, seqLen };
}

// ── WordPiece subword tokenization ──

function wordPiece(word) {
  if (word === "'") return [vocab.get("'") ?? UNK_ID];

  // Strip punctuation from word edges but keep for tokenization
  const cleaned = stripPunctuation(word);
  if (cleaned.length === 0) return [UNK_ID];

  // Try full word first
  if (vocab.has(cleaned)) return [vocab.get(cleaned)];

  // Subword split
  const tokens = [];
  let start = 0;

  while (start < cleaned.length) {
    let end = cleaned.length;
    let found = false;

    while (start < end) {
      const substr = start === 0
        ? cleaned.slice(start, end)
        : '##' + cleaned.slice(start, end);

      if (vocab.has(substr)) {
        tokens.push(vocab.get(substr));
        start = end;
        found = true;
        break;
      }
      end--;
    }

    if (!found) {
      // Character not in vocab — use [UNK]
      tokens.push(UNK_ID);
      start++;
    }
  }

  return tokens;
}

function stripPunctuation(word) {
  // Keep apostrophes inside words (I'm, don't) but strip edges
  return word.replace(/^[^\w']+|[^\w']+$/g, '').replace(/'+$/g, '');
}

export function isReady() { return ready; }
