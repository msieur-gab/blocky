// ══════════════════════════════════════════
// Intent Service — Blocky's Brain
// Two-tier NLU: rules (fast) → MiniLM (semantic)
// + entity extraction for names
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import * as nlu from './nlu.js';

// ══════════════════════════════════════════
// Tier 1: Rule-based keyword matching
// Handles ~75% of kid utterances instantly
// ══════════════════════════════════════════

// Rules are checked in order — MOST SPECIFIC FIRST.
// Multi-word phrases before single words to prevent "play music" matching "play".
const RULES = [
  // ── Specific multi-word phrases first ──

  // Music (before play — "play music" is music, not play)
  { intent: 'music', words: ['play music', 'play some music', 'play a song', 'play me a song',
    'put on music', 'put on some music', 'sing something', 'sing me', 'some music',
    'want music', 'want a song', 'hear a song', 'hear music'] },

  // Story (before generic words)
  { intent: 'story', words: ['tell me a story', 'tell a story', 'story time', 'read me a story',
    'read me something', 'read to me'] },

  // Sleep
  { intent: 'sleep', words: ['good night', 'goodnight', 'night night', 'nap time',
    'go to sleep', 'bedtime', 'time to sleep', 'go to bed'] },

  // Play (after music — only matches play without music context)
  { intent: 'play', words: ['let\'s play', 'play a game', 'wanna play', 'want to play',
    'play with me', 'rock paper scissors', 'play game'] },

  // Greetings
  { intent: 'greet', words: ['good morning', 'hello', 'wake up', 'hey blocky', 'hi blocky'] },

  // ── Single-word / short phrases ──

  // Bored
  { intent: 'bored', words: ['bored', 'boring', 'nothing to do', 'don\'t know what to do'] },

  // Emotions
  { intent: 'emotion_sad', words: ['miss mommy', 'miss daddy', 'miss my', 'feel sad', 'i\'m sad', 'crying', 'cry'] },
  { intent: 'emotion_scared', words: ['scared', 'afraid', 'monster', 'scary', 'frightened'] },
  { intent: 'emotion_angry', words: ['angry', 'mad', 'hate', 'stupid', 'not fair'] },
  { intent: 'emotion_happy', words: ['happy', 'yay', 'awesome', 'great', 'funny', 'haha', 'lol', 'cool', 'amazing', 'whoa'] },

  // Questions
  { intent: 'question', words: ['what is', 'what are', 'why is', 'why are', 'how does', 'how do'] },

  // Love
  { intent: 'love', words: ['love you', 'love blocky', 'kiss', 'hug me', 'like you'] },

  // Secret / fun
  { intent: 'secret', words: ['fart', 'burp', 'poop', 'butt'] },

  // Attention (last — "blocky" appears in many phrases)
  { intent: 'attention', words: ['blocky'] },
];

// ══════════════════════════════════════════
// Entity extraction (names)
// ══════════════════════════════════════════

const NAME_PATTERNS = [
  /(?:i'm|i am|my name is|my name's)\s+([a-z]+)/i,
  /(?:call me|they call me)\s+([a-z]+)/i,
  /(?:this is|that's|that is)\s+([a-z]+)/i,
  /(?:it's me)\s*,?\s*([a-z]+)/i,
  /(?:please meet|meet)\s+([a-z]+)/i,
  /(?:say hello to|say hi to)\s+([a-z]+)/i,
];

const STOP_WORDS = new Set([
  // Blocky
  'blocky',
  // Emotions / states
  'happy', 'sad', 'scared', 'angry', 'bored', 'hungry', 'tired',
  'sleepy', 'excited', 'lonely', 'sick', 'cold', 'hot', 'thirsty',
  'fine', 'good', 'great', 'okay', 'alright', 'better', 'worse',
  // Actions (I am + verb/gerund)
  'joking', 'kidding', 'playing', 'sleeping', 'eating', 'running',
  'going', 'coming', 'leaving', 'waiting', 'watching', 'listening',
  'thinking', 'trying', 'looking', 'talking', 'singing', 'dancing',
  'reading', 'drawing', 'winning', 'losing', 'lying', 'sitting',
  'standing', 'walking', 'crying', 'laughing', 'dreaming',
  // Common words
  'here', 'there', 'sorry', 'ready', 'done', 'back', 'home',
  'not', 'very', 'really', 'so', 'just', 'also', 'still', 'only',
  'a', 'the', 'your', 'his', 'her', 'my', 'our', 'their',
  'something', 'nothing', 'anything', 'everything', 'please',
  'sure', 'right', 'wrong', 'lost', 'late', 'early',
  // Body parts
  'finger', 'fingers', 'hand', 'hands', 'face', 'eyes', 'nose',
  'mouth', 'head', 'arm', 'arms', 'leg', 'legs', 'foot', 'feet',
  'ear', 'ears', 'hair', 'belly', 'tummy',
  // Common mis-enrollments
  'doing', 'nice', 'like', 'looking', 'funny', 'laugh', 'lucky',
  'game', 'broken', 'working', 'what', 'stop', 'this', 'that',
  'it', 'up', 'down', 'out', 'off', 'on', 'over', 'about',
]);

function extractName(text) {
  for (const pattern of NAME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (name.length < 2) continue;
      if (STOP_WORDS.has(name.toLowerCase())) continue;
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }
  return null;
}

// ══════════════════════════════════════════
// Intent → Reaction + Mood mapping
// ══════════════════════════════════════════

export const INTENT_MAP = {
  attention:     { reaction: 'attention',     mood: 'curious' },
  greet:         { reaction: 'greet',         mood: 'happy' },
  sleep:         { reaction: 'sleep',         mood: 'sleepy' },
  play:          { reaction: 'game_start',    mood: 'excited' },
  bored:         { reaction: 'long_silence',  mood: 'bored' },
  story:         { reaction: 'thinking',      mood: 'curious' },
  music:         { reaction: 'music',          mood: 'happy' },
  emotion_happy: { reaction: 'child_laughed', mood: 'happy' },
  emotion_sad:   { reaction: 'child_sad',     mood: 'sad' },
  emotion_scared:{ reaction: 'child_scared',  mood: 'scared' },
  emotion_angry: { reaction: 'child_angry',   mood: 'angry' },
  question:      { reaction: 'curious_loop',  mood: 'curious' },
  love:          { reaction: 'love',          mood: 'happy' },
  secret:        { reaction: 'embarrassed',   mood: 'silly' },
  agree:         { reaction: 'agree',          mood: 'calm' },
  agree_strong:  { reaction: 'agree_strong',   mood: 'happy' },
  disagree:      { reaction: 'disagree',       mood: 'calm' },
  disagree_strong: { reaction: 'disagree_strong', mood: 'angry' },
  negation:      { reaction: null,            mood: 'calm' },
  look:          { reaction: 'attention',     mood: 'curious' },
  time:          { reaction: null,            mood: 'calm' },
  stop:          { reaction: null,            mood: 'calm' },
  // introduction has no fixed reaction — triggers camera via faces.js
};

// ══════════════════════════════════════════
// Speech processing state
// ══════════════════════════════════════════

let lastClassifiedTime = 0;
const CLASSIFY_COOLDOWN = 1500;

let lastEmittedIntent = null;
let lastEmittedTime = 0;
const DEDUP_WINDOW = 3000;

// ══════════════════════════════════════════
// Public API
// ══════════════════════════════════════════

export async function init() {
  // Listen to ears service (two-stage) or legacy speech service
  bus.on('ear:sentence', onSentence);
  bus.on('speech:sentence', onSentence); // fallback compatibility

  // Init NLU engine in background (non-blocking)
  nlu.init().catch(e => console.warn('[intent] NLU init failed:', e));

  console.log('[intent] Ready (NLU-only mode — rules commented out)');
}

export function stop() {
  bus.off('speech:sentence', onSentence);
  // bus.off('speech:interim', onInterim);
}

// ══════════════════════════════════════════
// Sentence handler (finalized speech)
// Runs both tiers: rules then NLU
// ══════════════════════════════════════════

function onSentence(sentence) {
  if (!sentence) return;
  const text = sentence.toLowerCase().trim();
  if (!text) return;

  const now = Date.now();
  if (now - lastClassifiedTime < CLASSIFY_COOLDOWN) return;

  // Entity extraction (always runs — regex is the right tool for names)
  const name = extractName(text);
  if (name) {
    emitIntent('introduction', { name }, 0.95, 'entity');
    return;
  }

  // // ── Tier 1: Rules (commented out — testing NLU-only) ──
  // const ruleMatch = matchRules(text);
  // if (ruleMatch) {
  //   emitIntent(ruleMatch, {}, 1.0, 'rules');
  //   return;
  // }

  // ── NLU semantic classification ──
  if (nlu.isReady()) {
    runNLU(text);
  }
}

// ══════════════════════════════════════════
// Interim handler (still speaking)
// Only runs rules for instant response
// ══════════════════════════════════════════

function onInterim(text) {
  if (!text) return;
  const lower = text.toLowerCase().trim();
  if (!lower) return;

  const now = Date.now();
  if (now - lastClassifiedTime < CLASSIFY_COOLDOWN) return;

  // Only run rules on interim — NLU waits for final sentence
  // Skip introductions on interim — names need the full sentence to be reliable
  const ruleMatch = matchRules(lower);

  if (ruleMatch && ruleMatch !== 'introduction') {
    emitIntent(ruleMatch, {}, 0.8, 'rules');
  }
}

// ══════════════════════════════════════════
// Tier 1: Rule matching
// ══════════════════════════════════════════

function matchRules(text) {
  for (const rule of RULES) {
    for (const word of rule.words) {
      if (text.includes(word)) {
        return rule.intent;
      }
    }
  }
  return null;
}

function isIntroductionText(text) {
  return NAME_PATTERNS.some(p => p.test(text));
}

// ══════════════════════════════════════════
// Tier 2: NLU semantic matching
// ══════════════════════════════════════════

async function runNLU(text) {
  try {
    const embedding = await nlu.embed(text);
    if (!embedding) return;

    const result = nlu.classify(embedding);
    if (!result) return;

    console.log(`[intent] NLU: "${text.slice(0, 40)}" → ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
    emitIntent(result.intent, {}, result.confidence, 'nlu');
  } catch (e) {
    console.error('[intent] NLU error:', e);
  }
}

// ══════════════════════════════════════════
// Emit intent (with deduplication)
// ══════════════════════════════════════════

function emitIntent(intent, entities, confidence, source) {
  const now = Date.now();

  // Dedup key includes entity values (so "introduction [Gab]" != "introduction [Tom]")
  const dedupKey = intent + (entities?.name ? ':' + entities.name.toLowerCase() : '');
  const dedupMs = intent === 'introduction' ? 15000 : DEDUP_WINDOW;

  if (dedupKey === lastEmittedIntent && now - lastEmittedTime < dedupMs) {
    return;
  }

  lastEmittedIntent = dedupKey;
  lastEmittedTime = now;
  lastClassifiedTime = now;

  const payload = { intent, entities, confidence, source };
  console.log(`[intent] ${source}: ${intent}`, entities);
  bus.emit('intent:classified', payload);

  // Also emit specific intent events for services that need them
  if (intent === 'introduction' && entities.name) {
    bus.emit('intent:introduction', { name: entities.name });
  }
}
