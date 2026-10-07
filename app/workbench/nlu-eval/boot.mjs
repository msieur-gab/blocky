// Loads the app's NLU in node: the real nlu.js / tokenizer.js / intent.js (copied by run.sh),
// the app's own model and ONNX runtime, and the skills' exemplars as the kernel adds them.
// The runtime is the browser build, so node is dressed up as a page for it.
import fs from 'fs'; import vm from 'vm';

const APP = new URL('../../', import.meta.url).pathname;
const ORT = APP + 'assets/vendor/ort/';

const ort = vm.runInThisContext(fs.readFileSync(ORT + 'ort.min.js', 'utf8') + ';ort');
ort.env.wasm.numThreads = 1;
ort.env.wasm.wasmPaths = 'http://local.ort/';
globalThis.fetch = async (u) => {
  const s = String(u);
  if (s.startsWith('http://local.ort/')) return new Response(fs.readFileSync(ORT + s.split('/').pop()), { headers: { 'content-type': 'application/wasm' } });
  return new Response(fs.readFileSync(s.startsWith('/') ? s : APP + s));
};
globalThis.ort = ort; globalThis.window = { ort }; globalThis.self = globalThis;
const realProcess = globalThis.process; globalThis.process = undefined;   // or the runtime takes its node path, which this build lacks
const log = console.log; console.log = () => {};

export const nlu = await import('./.build/services/nlu.js');
export const intent = await import('./.build/services/intent.js');

// Skill exemplars, read from the skill files (importing a skill would pull in the whole app)
for (const file of fs.readdirSync(APP + 'js/skills')) {
  const block = fs.readFileSync(APP + 'js/skills/' + file, 'utf8').match(/\n  exemplars: (\{[\s\S]*?\n  \})/);
  if (block) await nlu.addExemplars(new Function('return ' + block[1])());
}
await nlu.init();
globalThis.process = realProcess;
console.log = (...x) => { if (!/^\[(intent|nlu)\]/.test(String(x[0]))) log(...x); };

// Every intent's best score for a sentence, best first (the NLU tier alone, no threshold)
export async function scores(text) {
  const e = await nlu.embed(text);
  const out = [];
  for (const [name, embs] of Object.entries(nlu.exemplarEmbeddings)) {
    let b = -1, bi = -1;
    embs.forEach((x, i) => { let d = 0; for (let k = 0; k < x.length; k++) d += x[k] * e[k]; if (d > b) { b = d; bi = i; } });
    out.push({ intent: name, score: b, ex: nlu.INTENT_EXEMPLARS[name][bi] });
  }
  return out.sort((a, b) => b.score - a.score);
}

// The whole pipeline (intent.resolve: names, rules, NLU), plus score details for the report
export async function pipeline(sentence) {
  const text = sentence.toLowerCase().trim();
  const r = await intent.resolve(text);
  const s = await scores(text);
  const top = s[0], second = s[1];
  return { intent: r ? r.intent : null, source: r ? r.source : 'nlu', name: r?.entities?.name, score: top.score, ex: top.ex, second: second.intent, margin: top.score - second.score, raw: top.intent };
}
