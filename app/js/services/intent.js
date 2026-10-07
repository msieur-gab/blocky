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
// A phrase matches whole words only ("mad" is not in "made").
const RULES = [
  // ── Specific multi-word phrases first ──

  // Music (before play — "play music" is music, not play)
  { intent: 'music', words: ['play music', 'play some music', 'play a song', 'play me a song',
    'put on music', 'put on some music', 'sing something', 'sing me', 'some music',
    'want music', 'want a song', 'hear a song', 'hear music'] },

  // Story (before generic words)
  { intent: 'story', words: ['tell me a story', 'tell a story', 'story time', 'read me a story',
    'read me something', 'read to me', 'bedtime story', 'a story'] },

  // Sleep
  { intent: 'sleep', words: ['good night', 'goodnight', 'night night', 'nap time',
    'go to sleep', 'bedtime', 'time to sleep', 'go to bed'] },

  // Play (after music) — only the unmistakable phrases. "want to play…" and
  // "let's play…" go to the NLU, which weighs the rest ("…in the rain")
  { intent: 'play', words: ['play a game', 'play with me', 'rock paper scissors', 'play game'] },

  // Greetings
  { intent: 'greet', words: ['good morning', 'hello', 'wake up', 'hey blocky', 'hi blocky'] },

  // Time (before questions — "what is the time" is not a "what is" question)
  { intent: 'time', words: ['what time', 'what\'s the time', 'what is the time', 'tell me the time'] },

  // ── Single-word / short phrases ──

  // Bored
  { intent: 'bored', words: ['bored', 'boring', 'nothing to do', 'don\'t know what to do'] },

  // Emotions
  { intent: 'emotion_sad', words: ['miss mommy', 'miss daddy', 'miss my', 'feel sad', 'i\'m sad', 'crying', 'cry'] },
  { intent: 'emotion_scared', words: ['scared', 'afraid', 'monster', 'scary', 'frightened'] },
  { intent: 'emotion_angry', words: ['angry', 'mad', 'hate', 'stupid', 'not fair'] },
  { intent: 'emotion_happy', words: ['happy', 'yay', 'awesome', 'great', 'funny', 'haha', 'hahaha', 'lol', 'cool', 'amazing', 'whoa'] },

  // Questions
  { intent: 'question', words: ['what is', 'what are', 'why is', 'why are', 'how does', 'how do'] },

  // Love
  { intent: 'love', words: ['love you', 'love blocky', 'kiss', 'hug me', 'like you'] },

  // Secret / fun
  { intent: 'secret', words: ['fart', 'burp', 'poop', 'butt'] },
];

for (const rule of RULES) {
  rule.patterns = rule.words.map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`));
}

// A feeling or a wish said with "not" in front is not that one ("i'm not scared"):
// the rule steps aside and the NLU decides (it has a `negation` intent)
const NEGATABLE = new Set(['play', 'bored', 'emotion_sad', 'emotion_scared', 'emotion_angry', 'emotion_happy', 'love']);
const NEGATION = /\bnot\b|n't\b|\bnever\b|\bnobody\b|\bno one\b/;

// The name and nothing else: blocky looks up. With more words around it, the
// sentence is judged on those words; the name alone decides only if nothing else does.
const NAME_ALONE = /^(?:hey |oh |ok |okay )?blocky[\s!?.,]*$/;
const NAME_SAID = /\bblocky\b/;

// ══════════════════════════════════════════
// Entity extraction (names)
// ══════════════════════════════════════════

// Said outright: the word that follows is a name.
const NAME_PATTERNS = [
  /\b(?:my name is|my name's)\s+([a-z]+)/i,
  /\b(?:i am|i'm) called\s+([a-z]+)/i,
  /\b(?:call me|they call me)\s+([a-z]+)/i,
  /\b(?:it's me)\s*,?\s*([a-z]+)/i,
  /\b(?:this is|that's|that is|here is|here's|meet|say hello to|say hi to) my (?:best )?(?:friend|brother|sister|mom|mommy|mum|mother|dad|daddy|father|grandma|grandpa|cousin|teacher)\s+([a-z]+)/i,
  /\b(?:please meet|meet)\s+([a-z]+)/i,
  /\b(?:say hello to|say hi to)\s+([a-z]+)/i,
  // "this is my mom": the person is called what the child calls them
  /\b(?:this is|that's|that is|here is|here's|it's|meet|say hello to|say hi to) my (mom|mommy|mum|mama|dad|daddy|papa|grandma|grandpa)[\s!.]*$/i,
];

// Could be a name, could be anything ("i'm mad", "that's enough", "this is fun").
// Counts only when it ends the sentence ("…eva", "…eva my sister"), after the rules, and
// when the word itself reads as a name to the NLU, or the whole sentence as an introduction.
const LOOSE_NAME_PATTERNS = [
  /\b(?:i'm|i am)\s+([a-z]+)[\s!.]*$/i,
  /\b(?:this is|that's|that is|it's|here is|here's)\s+([a-z]+)(?:,? my [a-z]+)?[\s!.]*$/i,
];

const STOP_WORDS = new Set([
  // Blocky
  'blocky',
  // People who are not names
  'you', 'me', 'him', 'them', 'us', 'someone', 'somebody', 'everyone', 'everybody',
  'mine', 'yours',
  // Numbers ("i'm five")
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
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

function extractName(text, patterns = NAME_PATTERNS) {
  for (const pattern of patterns) {
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

  // Init NLU engine in background (non-blocking), once the ears have finished starting:
  // on a phone the speech model and this one, loading together, each took about three
  // times as long. The rules above answer in the meantime.
  earsSettled().then(() => nlu.init()).catch(e => console.warn('[intent] NLU init failed:', e));

  console.log('[intent] Ready (rules + NLU)');
}

function earsSettled() {
  return new Promise((resolve) => {
    const offs = ['ear:ready', 'ear:unavailable', 'ear:denied'].map(ev => bus.on(ev, done));
    const timer = setTimeout(done, 30000);     // whatever happens to the ears, the NLU still starts
    function done() { clearTimeout(timer); offs.forEach(off => off()); resolve(); }
  });
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
  const text = sentence.toLowerCase().replace(/[\u2018\u2019]/g, "'").trim();
  if (!text) return;

  const now = Date.now();
  if (now - lastClassifiedTime < CLASSIFY_COOLDOWN) return;

  resolve(text)
    .then(r => { if (r) emitIntent(r.intent, r.entities, r.confidence, r.source); })
    .catch(e => console.error('[intent] NLU error:', e));
}

// What a sentence means: { intent, entities, confidence, source } or null.
// Nothing is emitted here, so it can be called from a test page.
export async function resolve(text) {
  // A name said outright (regex is the right tool for names)
  const name = extractName(text);
  if (name) return { intent: 'introduction', entities: { name }, confidence: 0.95, source: 'entity' };

  // ── Tier 1: Rules (fast keyword match) ──
  const ruleMatch = matchRules(text);
  if (ruleMatch) return { intent: ruleMatch, entities: {}, confidence: 1.0, source: 'rules' };
  if (NAME_ALONE.test(text)) return { intent: 'attention', entities: {}, confidence: 1.0, source: 'rules' };

  // ── Tier 2: NLU semantic classification ──
  let result = null, closest = null;
  if (nlu.isReady()) {
    const embedding = await nlu.embed(text);
    if (embedding) { closest = nlu.nearest(embedding); result = nlu.classify(embedding); }
    if (result) console.log(`[intent] NLU: "${text.slice(0, 40)}" → ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
  }

  // "i'm emma" / "look this is leo" / "this is mom"
  const looseName = extractName(text, LOOSE_NAME_PATTERNS);
  if (looseName && (closest?.intent === 'introduction' || await nlu.looksLikeName(looseName))) {
    return { intent: 'introduction', entities: { name: looseName }, confidence: 0.8, source: 'entity' };
  }

  if (result) return { intent: result.intent, entities: {}, confidence: result.confidence, source: 'nlu' };

  // Nothing understood, but blocky was called
  if (NAME_SAID.test(text)) return { intent: 'attention', entities: {}, confidence: 0.8, source: 'rules' };
  return null;
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
    for (const pattern of rule.patterns) {
      const match = pattern.exec(text);
      if (!match) continue;
      if (NEGATABLE.has(rule.intent) && NEGATION.test(text.slice(0, match.index))) continue;
      return rule.intent;
    }
  }
  return null;
}

function isIntroductionText(text) {
  return NAME_PATTERNS.some(p => p.test(text));
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
