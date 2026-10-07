import { pipeline } from './boot.mjs';
import { CORPUS, OOS } from './corpus.mjs';
const f = x => x.toFixed(2);
// None of these is in talk.js
const WATER = ["want a bath", "do you need a bath", "time for your bath", "let's take a bath", "i'm going to give you a bath", "shall we have a bath", "how about a shower", "do you want a shower", "you need to take a shower", "shower time", "would you like some water", "do you want a drink", "want a glass of water", "have some water", "are you thirsty blocky", "do you want to go out in the rain", "let's walk under the rain", "want to play in the rain", "shall we go swimming", "do you like swimming", "do you want to jump in the puddles", "i'm going to splash you", "let's wash your face", "do you want to play in the water", "do you like water"];
// The child talking about themselves or the weather: is a NO acceptable here?
const NEAR = ["can i have some water", "i'm thirsty", "it is raining today", "is it going to rain", "i took a bath", "i need to pee", "i'm going to take a shower", "what time is it", "time to sleep", "do you want to play", "do you want a cookie", "do you want to hear a story", "are you hungry", "are you sleepy"];
const FOOD = ["want a cookie", "would you like a cookie", "do you want a biscuit", "are you hungry now", "want something to eat", "shall we eat", "it's time for lunch", "do you want an apple", "i have a treat for you", "do you want some of my sandwich", "would you like some ice cream", "do you want dessert", "let's have a snack", "do you want my candy", "here is some cake for you", "do you like pizza", "want some chocolate", "snack time"];
NEAR.push("i'm hungry", "i had pasta for lunch", "i like pizza", "mom is cooking dinner", "dinner is ready", "do you want to play in the rain", "nobody wants to play with me", "i want to play", "let's play", "wanna play", "play with me", "do you want to drink some juice", "do you want some milk");
for (const [name, list] of [['water', WATER], ['food', FOOD]]) { let ok = 0; console.log(`=== ${name}, unseen phrasings ===`);
for (const t of list) { const r = await pipeline(t); if (r.intent === name) { ok++; if (r.margin < 0.08) console.log(`  ~ "${t}" ${f(r.score)} (${r.second} ${f(r.margin)} behind)`); } else console.log(`  x "${t}" → ${r.intent} [${r.source} ${f(r.score)} best=${r.raw} via "${r.ex}"]`); }
console.log(`  ${ok}/${list.length}`); }
console.log('=== neighbours ===');
for (const t of NEAR) { const r = await pipeline(t); console.log(`  "${t}" → ${r.intent}${r.source === 'nlu' ? ' ' + f(r.score) : ' [' + r.source + ']'}`); }
let right = 0, tot = 0; const stolen = [];
for (const [want, l] of Object.entries(CORPUS)) for (const t of l) { tot++; const r = await pipeline(t); if (r.intent === want) right++; if (r.intent === 'water' || r.intent === 'food') stolen.push(`${want}:"${t}"→${r.intent}`); }
let fired = 0; const oosT = []; for (const t of OOS) { const r = await pipeline(t); if (r.intent) fired++; if (r.intent === 'water' || r.intent === 'food') oosT.push(t + '→' + r.intent); }
console.log(`=== regression: in-scope ${right}/${tot}, out-of-scope fired ${fired}/${OOS.length}`);
console.log('  taken by themes from other intents:', stolen.join(', ') || 'none'); console.log('  out-of-scope now a theme:', oosT.join(' | ') || 'none');
