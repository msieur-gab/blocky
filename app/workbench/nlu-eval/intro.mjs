import { pipeline } from './boot.mjs';
const f = x => x.toFixed(2);
for (const t of ["look this is eva", "look, this is eva", "look this is gab", "look this is mom", "this is eva", "this is gab", "this is mom", "this is my mom", "this is dad", "look it's mom", "look it's eva", "it's eva", "here is eva", "here's mom", "that's eva", "blocky this is eva", "blocky look this is gab", "hey look this is my friend eva", "say hello to eva", "say hi to mom", "meet eva", "this is eva my sister", "this is ava", "this is gap", "look at this"]) {
  const r = await pipeline(t); console.log(`  ${r.intent === 'introduction' && r.name ? 'ok' : 'XX'} "${t}" → ${r.intent} ${r.name || ''} [${r.source}] (nearest ${r.raw} ${f(r.score)})`);
}
