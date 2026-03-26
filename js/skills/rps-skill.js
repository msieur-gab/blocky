// ══════════════════════════════════════════
// RPS Skill — Rock Paper Scissors game
// Wraps the game state machine as a skill
// ══════════════════════════════════════════

import * as game from '../games/rps.js';

let ctx = null;

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

    // Wire game events to face
    ctx.bus.onGlobal('game:countdown', ({ number }) => {
      ctx.face.override(`countdown_${number}`);
    });
    ctx.bus.onGlobal('game:reveal', ({ move }) => {
      ctx.face.override(`rps_${move}`);
    });
    ctx.bus.onGlobal('game:result', ({ winner }) => {
      ctx.face.release();
      if (winner === 'blocky') ctx.face.react('game_win');
      else if (winner === 'player') ctx.face.react('game_lose');
      else ctx.face.react('game_tie');
    });
    ctx.bus.onGlobal('game:over', ({ winner, score }) => {
      ctx.face.release();
      ctx.face.react(winner === 'player' ? 'game_over_player' : 'game_over_blocky');
      ctx.memory.log({ data: { winner, score, rounds: game.state.round } });
    });
    ctx.bus.onGlobal('game:no_hand', () => {
      ctx.face.override('curious');
    });
    ctx.bus.onGlobal('game:end', () => {
      ctx.face.release();
    });

    game.start();
  },

  deactivate() {
    game.stop();
    if (ctx) ctx.face.release();
    ctx = null;
  },

  handleIntent(intent, entities) {
    if (intent === 'stop') {
      this.deactivate();
      return true;
    }
    return false;
  },
};
