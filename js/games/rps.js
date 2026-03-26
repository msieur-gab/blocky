// ══════════════════════════════════════════
// Rock Paper Scissors
// Game state machine — drives Blocky's face
// Eyes become countdown → reveal → result
// ══════════════════════════════════════════

import { bus } from '../utils/events.js';
import { play as playSound } from '../services/voice.js';
import * as gestures from '../services/gestures.js';

// ── Game state ──

export const state = {
  phase: 'idle',  // idle | starting | countdown | detect | reveal | result
  round: 0,
  score: { player: 0, blocky: 0 },
  blockyMove: null,
  playerMove: null,
  winner: null,   // 'player' | 'blocky' | 'tie' | null
};

const MOVES = ['rock', 'paper', 'scissors'];
const WIN_SCORE = 3; // first to 3 wins the game

const MOVE_EXPRESSIONS = {
  rock:     'rps_rock',
  paper:    'rps_paper',
  scissors: 'rps_scissors',
};

// Timing
const COUNTDOWN_BEAT = 800;   // ms per number
const DETECT_WINDOW  = 2500;  // ms to read player's hand
const REVEAL_HOLD    = 1200;  // ms to show both moves
const RESULT_HOLD    = 2000;  // ms for win/lose/tie reaction
const NEXT_ROUND_DELAY = 1500;

let countdownTimer = null;
let detectTimer = null;
let phaseTimer = null;
let gestureHandler = null;

// ── Start / Stop ──

export async function start() {
  if (state.phase !== 'idle') return;

  state.round = 0;
  state.score.player = 0;
  state.score.blocky = 0;

  console.log('[rps] Game starting');
  bus.emit('game:start');

  // Start gesture detection (loads MediaPipe + opens camera)
  state.phase = 'starting';
  await gestures.start();

  // Begin first round
  nextRound();
}

export function stop() {
  clearAllTimers();
  gestures.stop();
  state.phase = 'idle';
  state.round = 0;
  bus.emit('game:end');
  console.log('[rps] Game ended. Score:', state.score.player, '-', state.score.blocky);
}

// ── Round flow ──

function nextRound() {
  state.round++;
  state.blockyMove = null;
  state.playerMove = null;
  state.winner = null;

  console.log(`[rps] Round ${state.round}`);
  bus.emit('game:round', { round: state.round });

  // Countdown: 3... 2... 1...
  startCountdown();
}

function startCountdown() {
  state.phase = 'countdown';
  let count = 3;

  const tick = () => {
    bus.emit('game:countdown', { number: count });
    playSound('countdown_beep');
    count--;

    if (count > 0) {
      countdownTimer = setTimeout(tick, COUNTDOWN_BEAT);
    } else {
      // After "1", short pause then reveal
      countdownTimer = setTimeout(() => {
        // Blocky picks its move
        state.blockyMove = MOVES[Math.floor(Math.random() * 3)];
        startDetection();
      }, COUNTDOWN_BEAT);
    }
  };

  tick();
}

function startDetection() {
  state.phase = 'detect';
  gestures.clearGesture();

  // Show Blocky's move immediately (reveal)
  bus.emit('game:reveal', { move: state.blockyMove });
  playSound('boing');

  console.log(`[rps] Blocky chose: ${state.blockyMove} — detecting player...`);

  // Listen for gesture
  gestureHandler = bus.on('gesture:detected', onGestureDetected);

  // Timeout if no gesture detected
  detectTimer = setTimeout(() => {
    if (state.phase === 'detect') {
      console.log('[rps] No hand detected — try again');
      bus.emit('game:no_hand');
      playSound('babble_question');
      // Give another chance
      detectTimer = setTimeout(() => {
        if (state.phase === 'detect') {
          // Still nothing — skip round
          state.playerMove = null;
          resolveRound();
        }
      }, DETECT_WINDOW);
    }
  }, DETECT_WINDOW);
}

function onGestureDetected({ gesture }) {
  if (state.phase !== 'detect') return;

  state.playerMove = gesture;
  console.log(`[rps] Player: ${gesture}`);

  // Remove listener
  if (gestureHandler) gestureHandler();
  gestureHandler = null;

  clearTimeout(detectTimer);
  resolveRound();
}

function resolveRound() {
  state.phase = 'result';

  if (!state.playerMove) {
    state.winner = null;
    bus.emit('game:result', { winner: null, blocky: state.blockyMove, player: null });
    phaseTimer = setTimeout(() => nextRound(), NEXT_ROUND_DELAY);
    return;
  }

  // Determine winner
  state.winner = getWinner(state.playerMove, state.blockyMove);

  if (state.winner === 'player') {
    state.score.player++;
    bus.emit('reaction:trigger', 'game_lose'); // Blocky lost
  } else if (state.winner === 'blocky') {
    state.score.blocky++;
    bus.emit('reaction:trigger', 'game_win');  // Blocky won (kid's perspective: they lost... but Blocky celebrates)
  } else {
    bus.emit('reaction:trigger', 'game_tie');
  }

  bus.emit('game:result', {
    winner: state.winner,
    blocky: state.blockyMove,
    player: state.playerMove,
    score: { ...state.score },
  });

  console.log(`[rps] ${state.winner || 'tie'} — Score: player ${state.score.player} / blocky ${state.score.blocky}`);

  // Check for game over (first to WIN_SCORE)
  if (state.score.player >= WIN_SCORE || state.score.blocky >= WIN_SCORE) {
    const gameWinner = state.score.player >= WIN_SCORE ? 'player' : 'blocky';
    console.log(`[rps] Game over! ${gameWinner} wins ${state.score.player}-${state.score.blocky}`);
    bus.emit('game:over', { winner: gameWinner, score: { ...state.score } });

    phaseTimer = setTimeout(() => stop(), RESULT_HOLD + 1000);
    return;
  }

  // Next round after result hold
  phaseTimer = setTimeout(() => {
    if (state.phase === 'result') nextRound();
  }, RESULT_HOLD + NEXT_ROUND_DELAY);
}

// ── Game logic ──

function getWinner(player, blocky) {
  if (player === blocky) return 'tie';
  if (
    (player === 'rock' && blocky === 'scissors') ||
    (player === 'paper' && blocky === 'rock') ||
    (player === 'scissors' && blocky === 'paper')
  ) return 'player';
  return 'blocky';
}

// ── Cleanup ──

function clearAllTimers() {
  if (countdownTimer) clearTimeout(countdownTimer);
  if (detectTimer) clearTimeout(detectTimer);
  if (phaseTimer) clearTimeout(phaseTimer);
  if (gestureHandler) gestureHandler();
  countdownTimer = null;
  detectTimer = null;
  phaseTimer = null;
  gestureHandler = null;
}

// ── Exports ──

export function isActive() { return state.phase !== 'idle'; }
export function getPhase() { return state.phase; }
