import { nlu, scores } from './boot.mjs';
import { CORPUS, OOS } from './corpus.mjs';
const f = x => x.toFixed(2);
console.log('=== contractions vs spelled out (top intent, score) ===');
for (const [a, b] of [["i'm sad", "i am sad"], ["i don't want to", "i do not want to"], ["let's play", "let us play"], ["what's the time", "what is the time"], ["that's not fair", "that is not fair"], ["i'm not scared", "i am not scared"]]) {
  const x = (await scores(a))[0], y = (await scores(b))[0];
  console.log(`  "${a}" → ${x.intent} ${f(x.score)}   |   "${b}" → ${y.intent} ${f(y.score)}`);
}
// Split: even-indexed held-out sentences become extra exemplars, odd-indexed ones are the test.
const train = {}, test = [];
for (const [k, l] of Object.entries(CORPUS)) l.forEach((t, i) => i % 2 === 0 ? (train[k] ??= []).push(t) : test.push([k, t]));
async function measure(label) {
  let right = 0, wrong = 0, drop = 0;
  for (const [want, t] of test) { const s = (await scores(t))[0]; if (s.score < 0.45) drop++; else if (s.intent === want) right++; else wrong++; }
  let acc = 0; for (const t of OOS) if ((await scores(t))[0].score >= 0.45) acc++;
  console.log(`  ${label}: unseen in-scope right ${right} wrong ${wrong} dropped ${drop} (of ${test.length}) | out-of-scope accepted ${acc}/${OOS.length}`);
}
console.log('\n=== does adding phrasings help sentences it has not seen? (NLU tier alone, th 0.45) ===');
await measure('today          ');
const n = Object.values(train).reduce((a, b) => a + b.length, 0);
const log = console.log; console.log = () => {}; await nlu.addExemplars(train); console.log = log;
await measure(`+${n} phrasings  `);
