// ══════════════════════════════════════════
// Commands
// Hot word matching → reactions + mood
// Replaced by ONNX intent model later
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';

const HOTWORDS = [
  // Name → attention
  { words: ['blocky'],
    reaction: 'attention',  mood: 'curious' },

  // Greetings
  { words: ['good morning', 'hello', 'wake up'],
    reaction: 'greet',      mood: 'happy' },

  // Sleep
  { words: ['good night', 'goodnight', 'night night'],
    reaction: 'goodnight',  mood: 'sleepy' },
  { words: ['sleep', 'nap time', 'go to sleep'],
    reaction: 'sleep',      mood: 'sleepy' },

  // Play
  { words: ['play', 'game', 'let\'s play', 'let\'s go'],
    reaction: 'game_start', mood: 'excited' },

  // Emotions
  { words: ['happy', 'yay', 'awesome', 'great'],
    reaction: 'child_laughed', mood: 'happy' },
  { words: ['sad', 'miss', 'cry'],
    reaction: 'child_sad',  mood: 'sad' },
  { words: ['scared', 'afraid', 'help', 'monster'],
    reaction: 'child_scared', mood: 'scared' },
  { words: ['angry', 'mad', 'hate', 'stupid'],
    reaction: 'child_angry', mood: 'angry' },
  { words: ['funny', 'haha', 'lol', 'silly'],
    reaction: 'child_laughed', mood: 'silly' },
  { words: ['bored', 'boring'],
    reaction: 'long_silence', mood: 'bored' },
  { words: ['wow', 'cool', 'amazing', 'whoa'],
    reaction: 'surprised',  mood: 'excited' },
  { words: ['what', 'why', 'how'],
    reaction: 'curious_loop', mood: 'curious' },

  // Secret / fun
  { words: ['fart', 'burp', 'poop', 'butt'],
    reaction: 'embarrassed', mood: 'silly' },
  { words: ['love', 'love you', 'kiss'],
    reaction: 'love',       mood: 'happy' },
];

let lastLength = 0;
let lastMatchTime = 0;
const COOLDOWN = 1500;

export function check(transcript) {
  if (!transcript) return null;

  // Only process when transcript grows
  if (transcript.length <= lastLength) return null;

  const now = Date.now();
  if (now - lastMatchTime < COOLDOWN) {
    lastLength = transcript.length;
    return null;
  }

  // Scan the new portion
  const newText = transcript.slice(lastLength).toLowerCase();
  lastLength = transcript.length;

  if (!newText.trim()) return null;

  for (const cmd of HOTWORDS) {
    for (const word of cmd.words) {
      if (newText.includes(word)) {
        lastMatchTime = now;
        bus.emit('reaction:trigger', cmd.reaction);
        bus.emit('command:matched', { phrase: word, reaction: cmd.reaction, mood: cmd.mood });
        return cmd;
      }
    }
  }

  return null;
}
