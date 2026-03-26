// ══════════════════════════════════════════
// Blocky — App Orchestrator
// NLU + face recognition + sensors → reactions → face
// ══════════════════════════════════════════

import { bus } from './utils/events.js';
import * as speech from './services/speech.js';  // legacy
import * as ears from './services/ears.js';
import * as sensors from './services/sensors.js';
import * as camera from './services/camera.js';
import * as faces from './services/faces.js';
import * as intent from './services/intent.js';
import * as nlu from './services/nlu.js';
import * as memory from './services/memory.js';
import * as voice from './services/voice.js';
import * as kernel from './kernel.js';
import * as faceApi from './face-api.js';
import * as reactions from './reactions.js'; // legacy reaction library — registers into face-api

// ── Skills ──
import presenceSkill from './skills/presence.js';
import radioSkill from './skills/radio.js';
import rpsSkill from './skills/rps-skill.js';
import timeSkill from './skills/time.js';
import lookSkill from './skills/look.js';
import faceIntroSkill from './skills/face-intro.js';
import * as rps from './games/rps.js'; // for dev panel status only

// ── DOM ──

const $ = (id) => document.getElementById(id);

const dom = {
  canvas:      $('face'),
  themeToggle: $('theme-toggle'),
  devFab:      $('dev-fab'),
  sheet:       $('sheet'),
  sheetHandle: $('sheet-handle'),
  outMood:     $('out-mood'),
  outMode:     $('out-mode'),
  transcript:  $('transcript-box'),
  reactionLog: $('reaction-log'),
  stateOutput: $('state-output'),
  sensorOutput:$('sensor-output'),
  faceOutput:  $('face-output'),
};

// ── Theme ──

let darkTheme = true;

// Theme toggle is inline in the event listener below

// ── Dev panel ──

function initSheet() {
  let expanded = false;
  function toggle() {
    expanded = !expanded;
    dom.sheet.classList.toggle('expanded', expanded);
    dom.devFab.classList.toggle('active', expanded);
  }
  dom.devFab.addEventListener('click', toggle);
  dom.sheetHandle.addEventListener('click', toggle);
}

// ── Reaction log ──

function initReactionLog() {
  bus.on('reaction:trigger', (name) => {
    logEntry(`→ ${name}`);
    broadcastLog(`→ ${name}`, 'reaction');
  });
  bus.on('intent:classified', ({ intent, entities, confidence, source }) => {
    const nameStr = entities?.name ? ` [${entities.name}]` : '';
    const msg = `${source}: ${intent}${nameStr} (${(confidence * 100).toFixed(0)}%)`;
    logEntry(msg);
    broadcastLog(msg, 'intent');
  });
  bus.on('face:recognized', ({ name, confidence }) => {
    const msg = `recognized: ${name} (${(confidence * 100).toFixed(0)}%)`;
    logEntry(msg);
    broadcastLog(msg, 'face');
  });
  bus.on('face:enrolled', ({ name }) => {
    const msg = `enrolled: ${name}`;
    logEntry(msg);
    broadcastLog(msg, 'face');
  });
  bus.on('face:unknown', () => {
    logEntry('unknown face');
    broadcastLog('unknown face', 'face');
  });
  bus.on('intent:introduction', ({ name }) => {
    const msg = `introduction: ${name}`;
    logEntry(msg);
    broadcastLog(msg, 'intent');
  });
  bus.on('game:countdown', ({ number }) => {
    broadcastLog(`countdown: ${number}`, 'reaction');
  });
  bus.on('game:reveal', ({ move }) => {
    const msg = `blocky plays: ${move}`;
    logEntry(msg);
    broadcastLog(msg, 'reaction');
  });
  bus.on('game:result', ({ winner, blocky, player, score }) => {
    const msg = winner
      ? `${winner} wins! (${player} vs ${blocky}) — ${score?.player || 0}:${score?.blocky || 0}`
      : 'no hand detected';
    logEntry(msg);
    broadcastLog(msg, 'reaction');
  });
  bus.on('gesture:detected', ({ gesture, confidence, raw }) => {
    const msg = `hand: ${gesture} (${(confidence * 100).toFixed(0)}%) [${raw}]`;
    logEntry(msg);
    broadcastLog(msg, 'face');
  });
  bus.on('gesture:raw', ({ raw, confidence }) => {
    broadcastLog(`raw gesture: ${raw} (${(confidence * 100).toFixed(0)}%)`, '');
  });
}

function logEntry(msg) {
  const el = document.createElement('div');
  el.className = 'reaction-entry fresh';
  el.textContent = `${new Date().toLocaleTimeString()} ${msg}`;
  dom.reactionLog.prepend(el);
  setTimeout(() => el.classList.remove('fresh'), 800);
  while (dom.reactionLog.children.length > 20) {
    dom.reactionLog.lastChild.remove();
  }
}

// ── Camera triggers ──
// Camera ONLY activates from intent:introduction (handled inside faces.js).
// No periodic scanning, no shake triggers, no wake scan.
// The NLU/intent system is the gatekeeper.

// ── Dev broadcast (separate tab) ──

const devChannel = new BroadcastChannel('blocky-dev');

function broadcastState() {
  const cs = kernel.state;
  const ss = sensors.state;

  devChannel.postMessage({ type: 'state', data: {
    mood: cs.mood,
    mode: cs.mode,
    energy: cs.energy.toFixed(2),
    attention: cs.attention.toFixed(2),
    silence: cs.silenceDuration.toFixed(1) + 's',
    lastIntent: cs.lastIntent,
    currentFace: cs.currentFace ? cs.currentFace.name : null,
    nluReady: nlu.isReady(),
    faceModelsReady: faces.isModelReady(),
    scanning: faces.isScanning(),
    cameraActive: camera.isActive(),
    tiltX: ss.tiltX.toFixed(2),
    tiltY: ss.tiltY.toFixed(2),
    shake: ss.shake.toFixed(2),
    rotating: ss.rotating ? 'yes' : 'no',
    faceDown: ss.faceDown ? 'yes' : 'no',
    earsStage: ears.getStage(),
    creatureName: ears.getCreatureName() || 'unnamed',
    knownFaces: faces.getKnownFaces(),
    gamePhase: rps.getPhase(),
    gameRound: rps.state.round,
    gameScore: rps.state.score,
  }});

  const t = speech.getTranscript();
  if (t) devChannel.postMessage({ type: 'transcript', data: t });
}

function broadcastLog(msg, type = '') {
  devChannel.postMessage({ type: 'log', data: {
    time: new Date().toLocaleTimeString(),
    msg,
    type,
  }});
}

// ── Dev UI update ──

function updateDevUI() {
  const cs = kernel.state;
  const ss = sensors.state;

  dom.outMood.textContent = cs.mood;
  dom.outMode.textContent = cs.mode;

  // Transcript
  const t = ears.getTranscript() || speech.getTranscript();
  if (t) dom.transcript.textContent = t;

  // Companion state
  dom.stateOutput.innerHTML = [
    ['mood', cs.mood],
    ['mode', cs.mode],
    ['energy', cs.energy.toFixed(2)],
    ['attention', cs.attention.toFixed(2)],
    ['silence', cs.silenceDuration.toFixed(1) + 's'],
    ['intent', cs.lastIntent || '—'],
    ['game', cs.mode === 'game' ? `${rps.getPhase()} R${rps.state.round} (${rps.state.score.player}:${rps.state.score.blocky})` : '—'],
    ['face', cs.currentFace ? cs.currentFace.name : '—'],
  ].map(([k, v]) =>
    `<div class="dev-row"><span class="dev-label">${k}</span><span class="dev-value">${v}</span></div>`
  ).join('');

  // Sensor state
  if (dom.sensorOutput) {
    dom.sensorOutput.innerHTML = [
      ['tilt X', ss.tiltX.toFixed(2)],
      ['tilt Y', ss.tiltY.toFixed(2)],
      ['shake', ss.shake.toFixed(2)],
      ['rotating', ss.rotating ? 'yes' : 'no'],
      ['face down', ss.faceDown ? 'yes' : 'no'],
    ].map(([k, v]) =>
      `<div class="dev-row"><span class="dev-label">${k}</span><span class="dev-value">${v}</span></div>`
    ).join('');
  }

  // Face status
  if (dom.faceOutput) {
    const known = faces.getKnownFaces();
    dom.faceOutput.innerHTML = [
      ['nlu', nlu.isReady() ? 'ready' : 'loading...'],
      ['face models', faces.isModelReady() ? 'ready' : 'not loaded'],
      ['scanning', faces.isScanning() ? 'active' : 'idle'],
      ['camera', camera.isActive() ? 'active' : 'off'],
      ['known', known.length + ' face' + (known.length !== 1 ? 's' : '')],
      ...known.map(f => ['  ' + f.name, f.role + ' (' + f.seeCount + '×)']),
    ].map(([k, v]) =>
      `<div class="dev-row"><span class="dev-label">${k}</span><span class="dev-value">${v}</span></div>`
    ).join('');
  }
}

// ── Main loop ──

let lastT = 0;
let frameCount = 0;

function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;

  // Update sensors
  sensors.update(dt);

  // Update kernel
  kernel.update(dt, sensors.state);

  // Face API: mood → reaction → override → render
  faceApi.update(dt);
  faceApi.render(dt);

  // Dev UI at lower rate
  frameCount++;
  if (frameCount % 6 === 0) {
    updateDevUI();
    broadcastState();
  }

  requestAnimationFrame(loop);
}

// ── Init ──

const startGate = $('start-gate');

startGate.addEventListener('click', async () => {
  startGate.classList.add('hidden');

  // These need user gesture
  ears.init();   // two-stage listening (replaces speech.init)
  sensors.init();
  voice.init();

  // Init perception + memory
  await memory.init();
  await faces.init();
  intent.init();

  // Register skills
  kernel.register(presenceSkill);
  kernel.register(radioSkill);
  kernel.register(rpsSkill);
  kernel.register(timeSkill);
  kernel.register(lookSkill);
  kernel.register(faceIntroSkill);

  // Activate presence as default (starts personality idle)
  presenceSkill.activate({
    face: faceApi, voice, memory,
    bus: { emit: bus.emit.bind(bus), on: bus.on.bind(bus), onGlobal: bus.on.bind(bus) },
    state: kernel.state,
  });
});

// UI + face render immediately
initSheet();
initReactionLog();
kernel.init();

dom.themeToggle.addEventListener('click', () => {
  darkTheme = !darkTheme;
  document.body.classList.toggle('theme-light', !darkTheme);
  faceApi.setTheme(darkTheme);
});
window.addEventListener('resize', () => faceApi.resize());

faceApi.init(dom.canvas);
reactions.init(); // registers reaction library into face-api via bus
lastT = performance.now();
requestAnimationFrame(loop);
