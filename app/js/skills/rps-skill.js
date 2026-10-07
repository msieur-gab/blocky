// ══════════════════════════════════════════
// RPS Skill — Rock Paper Scissors
// Self-contained game using skill context APIs
// No direct bus access — everything through ctx
// ══════════════════════════════════════════

import * as gestures from '../services/gestures.js';

// ── Game state ──

export const state = {
  phase: 'idle',
  round: 0,
  score: { player: 0, blocky: 0 },
  blockyMove: null,
  playerMove: null,
  winner: null,
};

const MOVES = ['rock', 'paper', 'scissors'];
const WIN_SCORE = 3;

const COUNTDOWN_BEAT = 800;
const DETECT_WINDOW  = 2500;
const RESULT_HOLD    = 2000;
const NEXT_ROUND_DELAY = 1500;

let ctx = null;
let countdownTimer = null;
let detectTimer = null;
let phaseTimer = null;
let gestureUnsub = null;

// ══════════════════════════════════════════
// Skill manifest
// ══════════════════════════════════════════

export default {
  id: 'rps',
  name: 'Rock Paper Scissors',

  intents: ['play'],

  exemplars: {
    play: [
      'let us play a game', 'rock paper scissors',
      'I want to play', 'can we play', 'wanna play',
    ],
  },

  journal: { category: 'game', description: 'Rock Paper Scissors sessions' },

  reactions: {
    game_start: [
      { expr: 'surprise',  duration: 200, sound: 'powerup' },
      { expr: 'starry',    duration: 600, sound: 'fanfare' },
      { expr: 'excited',   duration: 500, sound: 'babble_excited' },
    ],
    game_win: [
      { expr: 'surprise',  duration: 200, sound: 'fanfare' },
      { expr: 'starry',    duration: 400, sound: 'win' },
      { expr: 'starry',    duration: 300, tilt: 15 },
      { expr: 'starry',    duration: 300, tilt: -15 },
      { expr: 'starry',    duration: 300, tilt: 12, sound: 'laugh_big' },
      { expr: 'happy',     duration: 500, sound: 'babble_excited' },
    ],
    game_lose: [
      { expr: 'shocked',    duration: 300, sound: 'squeak' },
      { expr: 'dizzy',      duration: 400, tilt: 8, sound: 'warble' },
      { expr: 'sad',        duration: 500, sound: 'whimper' },
      { expr: 'determined', duration: 600, sound: 'grumble' },
      { expr: 'excited',    duration: 400, sound: 'babble_fast' },
    ],
    game_tie: [
      { expr: 'thinking',   duration: 400, sound: 'hum' },
      { expr: 'determined', duration: 500, sound: 'babble_fast' },
    ],
    game_over_player: [
      { expr: 'shocked',    duration: 400, sound: 'squeak' },
      { expr: 'angry',      duration: 600, sound: 'grumble' },
      { expr: 'annoyed',    duration: 500, tilt: -5 },
      { expr: 'sad',        duration: 600, sound: 'whimper' },
      { expr: 'surprise',   duration: 300, sound: 'powerup' },
      { expr: 'starry',     duration: 400, sound: 'fanfare', tilt: 12 },
      { expr: 'starry',     duration: 300, tilt: -12 },
      { expr: 'starry',     duration: 300, tilt: 15, sound: 'win' },
      { expr: 'starry',     duration: 300, tilt: -15 },
      { expr: 'happy',      duration: 600, sound: 'laugh_big' },
    ],
    game_over_blocky: [
      { expr: 'surprise',   duration: 200, sound: 'powerup' },
      { expr: 'starry',     duration: 500, sound: 'fanfare' },
      { expr: 'starry',     duration: 300, tilt: 20, sound: 'win' },
      { expr: 'starry',     duration: 300, tilt: -20 },
      { expr: 'starry',     duration: 300, tilt: 15, sound: 'laugh_big' },
      { expr: 'starry',     duration: 300, tilt: -15 },
      { expr: 'excited',    duration: 500, sound: 'babble_excited' },
      { expr: 'happy',      duration: 600 },
    ],
  },

  activate(context) {
    ctx = context;
    state.round = 0;
    state.score.player = 0;
    state.score.blocky = 0;
    state.phase = 'starting';

    ctx.face.react('game_start');
    console.log('[rps] Game starting');

    // Start gesture detection then begin
    gestures.start().then(() => nextRound());
  },

  deactivate() {
    clearAllTimers();
    gestures.stop();
    state.phase = 'idle';
    ctx?.face.release();
    console.log('[rps] Game ended. Score:', state.score.player, '-', state.score.blocky);
    ctx = null;
  },

  handleIntent(intent) {
    if (intent === 'stop') {
      this.deactivate();
      return true;
    }
    return false;
  },
};

// ══════════════════════════════════════════
// Game flow — uses ctx.face and ctx.voice
// ══════════════════════════════════════════

function nextRound() {
  if (!ctx) return;

  state.round++;
  state.blockyMove = null;
  state.playerMove = null;
  state.winner = null;
  state.phase = 'countdown';

  console.log(`[rps] Round ${state.round}`);
  startCountdown();
}

function startCountdown() {
  let count = 3;

  const tick = () => {
    if (!ctx) return;
    ctx.face.override(`countdown_${count}`);
    ctx.voice.play('countdown_beep');
    count--;

    if (count > 0) {
      countdownTimer = setTimeout(tick, COUNTDOWN_BEAT);
    } else {
      countdownTimer = setTimeout(() => {
        state.blockyMove = MOVES[Math.floor(Math.random() * 3)];
        startDetection();
      }, COUNTDOWN_BEAT);
    }
  };

  tick();
}

function startDetection() {
  if (!ctx) return;
  state.phase = 'detect';
  gestures.clearGesture();

  // Show Blocky's move
  ctx.face.override(`rps_${state.blockyMove}`);
  ctx.voice.play('boing');
  console.log(`[rps] Blocky chose: ${state.blockyMove} — detecting player...`);

  // Listen for gesture
  gestureUnsub = ctx.bus.onGlobal('gesture:detected', onGesture);

  // Timeout
  detectTimer = setTimeout(() => {
    if (state.phase === 'detect') {
      console.log('[rps] No hand detected — try again');
      ctx.face.override('curious');
      ctx.voice.play('babble_question');
      detectTimer = setTimeout(() => {
        if (state.phase === 'detect') {
          state.playerMove = null;
          resolveRound();
        }
      }, DETECT_WINDOW);
    }
  }, DETECT_WINDOW);
}

function onGesture({ gesture }) {
  if (state.phase !== 'detect' || !ctx) return;

  state.playerMove = gesture;
  console.log(`[rps] Player: ${gesture}`);

  if (gestureUnsub) { gestureUnsub(); gestureUnsub = null; }
  clearTimeout(detectTimer);
  resolveRound();
}

function resolveRound() {
  if (!ctx) return;
  state.phase = 'result';
  ctx.face.release();

  if (!state.playerMove) {
    phaseTimer = setTimeout(() => nextRound(), NEXT_ROUND_DELAY);
    return;
  }

  state.winner = getWinner(state.playerMove, state.blockyMove);

  // Play reaction through face-api
  if (state.winner === 'player') {
    state.score.player++;
    ctx.face.react('game_lose');
  } else if (state.winner === 'blocky') {
    state.score.blocky++;
    ctx.face.react('game_win');
  } else {
    ctx.face.react('game_tie');
  }

  console.log(`[rps] ${state.winner || 'tie'} — Score: player ${state.score.player} / blocky ${state.score.blocky}`);

  // Log to journal
  ctx.memory.log({
    data: { round: state.round, winner: state.winner, player: state.playerMove, blocky: state.blockyMove },
  });

  // Game over?
  if (state.score.player >= WIN_SCORE || state.score.blocky >= WIN_SCORE) {
    const gameWinner = state.score.player >= WIN_SCORE ? 'player' : 'blocky';
    console.log(`[rps] Game over! ${gameWinner} wins ${state.score.player}-${state.score.blocky}`);
    ctx.face.react(gameWinner === 'player' ? 'game_over_player' : 'game_over_blocky');
    ctx.memory.log({ data: { event: 'game_over', winner: gameWinner, score: { ...state.score } } });

    phaseTimer = setTimeout(() => {
      // Deactivate returns to presence via kernel
      if (ctx) {
        const kernel = ctx.state; // kernel state reference
        ctx = null;
        clearAllTimers();
        gestures.stop();
        state.phase = 'idle';
      }
    }, RESULT_HOLD + 2000);
    return;
  }

  // Next round
  phaseTimer = setTimeout(() => {
    if (state.phase === 'result') nextRound();
  }, RESULT_HOLD + NEXT_ROUND_DELAY);
}

function getWinner(player, blocky) {
  if (player === blocky) return 'tie';
  if (
    (player === 'rock' && blocky === 'scissors') ||
    (player === 'paper' && blocky === 'rock') ||
    (player === 'scissors' && blocky === 'paper')
  ) return 'player';
  return 'blocky';
}

function clearAllTimers() {
  if (countdownTimer) clearTimeout(countdownTimer);
  if (detectTimer) clearTimeout(detectTimer);
  if (phaseTimer) clearTimeout(phaseTimer);
  if (gestureUnsub) gestureUnsub();
  countdownTimer = null;
  detectTimer = null;
  phaseTimer = null;
  gestureUnsub = null;
}

// ── Accessors (for dev panel) ──

export function isActive() { return state.phase !== 'idle'; }
export function getPhase() { return state.phase; }
