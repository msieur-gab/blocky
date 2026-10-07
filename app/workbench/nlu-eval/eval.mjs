import { nlu, pipeline, scores } from './boot.mjs';
import { CORPUS, OOS } from './corpus.mjs';
const f = x => x.toFixed(2);
const fam = i => i && i.replace(/_strong$/, '');
console.log('=== A. exemplars through the full pipeline (does the tier above steal them?) ===');
for (const [name, list] of Object.entries(nlu.INTENT_EXEMPLARS)) for (const ex of [...new Set(list)]) {
  const r = await pipeline(ex);
  if (r.source !== 'nlu') console.log(`  ${name.padEnd(16)} "${ex}" → ${r.source}:${r.intent}${r.name ? ' name=' + r.name : ''}${r.intent === name ? '  (same intent, fine)' : '  <<< WRONG'}`);
}
console.log('\n=== B. exemplar collisions: nearest exemplar of ANOTHER intent, cosine >= 0.60 ===');
const flat = [];
for (const [name, list] of Object.entries(nlu.INTENT_EXEMPLARS)) list.forEach((t, i) => flat.push({ name, t, e: nlu.exemplarEmbeddings[name][i] }));
const dot = (a, b) => { let d = 0; for (let k = 0; k < a.length; k++) d += a[k] * b[k]; return d; };
const col = [];
for (let i = 0; i < flat.length; i++) for (let j = i + 1; j < flat.length; j++) if (flat[i].name !== flat[j].name) { const d = dot(flat[i].e, flat[j].e); if (d >= 0.6) col.push([d, flat[i], flat[j]]); }
col.sort((a, b) => b[0] - a[0]).forEach(([d, a, b]) => console.log(`  ${f(d)}  ${a.name}:"${a.t}"  ~  ${b.name}:"${b.t}"`));
console.log('\n=== C. held-out sentences, full pipeline ===');
const conf = {}; let tot = 0, ok = 0, okFam = 0; const per = {};
for (const [want, list] of Object.entries(CORPUS)) {
  per[want] = { n: 0, ok: 0, miss: [] };
  for (const t of list) {
    const r = await pipeline(t); tot++; per[want].n++;
    if (r.intent === want) { ok++; okFam++; per[want].ok++; if (r.source === 'nlu' && r.margin < 0.05 && fam(r.second) !== fam(want)) per[want].miss.push(`  ~ "${t}" right but fragile: ${f(r.score)}, ${r.second} only ${f(r.margin)} behind`); continue; }
    if (fam(r.intent) === fam(want)) okFam++;
    const k = `${want} → ${r.intent}`; conf[k] = (conf[k] || 0) + 1;
    per[want].miss.push(`  x "${t}" → ${r.intent} [${r.source}${r.name ? ' name=' + r.name : ''}${r.source === 'nlu' ? ' ' + f(r.score) + ' via "' + r.ex + '"' + (r.intent === null ? ' best=' + r.raw : '') : ''}]`);
  }
}
for (const [k, v] of Object.entries(per)) { console.log(`${k.padEnd(16)} ${v.ok}/${v.n}`); v.miss.forEach(m => console.log(m)); }
console.log(`\nTOTAL strict ${ok}/${tot} = ${(100 * ok / tot).toFixed(0)}%   (strong/normal merged: ${okFam}/${tot} = ${(100 * okFam / tot).toFixed(0)}%)`);
console.log('confusions:', Object.entries(conf).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(' | '));
console.log('\n=== D. out-of-scope sentences (wanted: nothing) ===');
let fired = 0; const bySrc = {};
for (const t of OOS) { const r = await pipeline(t); if (r.intent) { fired++; bySrc[r.source] = (bySrc[r.source] || 0) + 1; console.log(`  "${t}" → ${r.intent} [${r.source}${r.name ? ' name=' + r.name : ''}${r.source === 'nlu' ? ' ' + f(r.score) + ' via "' + r.ex + '"' : ''}]`); } }
console.log(`fired on ${fired}/${OOS.length}`, bySrc);
console.log('\n=== E. threshold sweep, NLU tier alone (rules and name regex bypassed) ===');
const rows = [];
for (const [want, list] of Object.entries(CORPUS)) for (const t of list) { const s = await scores(t); rows.push({ want, top: s[0].intent, sc: s[0].score }); }
const oos = []; for (const t of OOS) { const s = await scores(t); oos.push(s[0].score); }
for (const th of [0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]) {
  const right = rows.filter(r => r.sc >= th && r.top === r.want).length, wrong = rows.filter(r => r.sc >= th && r.top !== r.want).length, drop = rows.filter(r => r.sc < th).length;
  console.log(`  th ${f(th)}: in-scope right ${right} wrong ${wrong} dropped ${drop} (of ${rows.length}) | out-of-scope accepted ${oos.filter(x => x >= th).length}/${oos.length}`);
}
