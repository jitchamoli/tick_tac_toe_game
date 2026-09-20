/**
 * Wiring: holds the history of states, hands them to the view, and turns clicks
 * into engine moves.
 *
 * Because engine states are immutable, the history array is both the move log
 * and the undo stack.
 */

import { DEFAULT_RULES, UI_OPTIONS, makeRules } from './config.js';
import { createGame, applyMove, opponentOf } from './engine.js';
import { renderBoard, renderStatus, renderLog, renderScore, renderSwap } from './ui.js';

const elements = {
  board: document.querySelector('#board'),
  status: document.querySelector('#status'),
  log: document.querySelector('#log'),
  score: document.querySelector('#score'),
  swap: document.querySelector('#swap'),
  undo: document.querySelector('#undo'),
  newGame: document.querySelector('#new-game'),
};

const score = { X: 0, O: 0 };
let history = [];

const current = () => history[history.length - 1];

/**
 * Who starts the next game. A single game is asymmetric — X wins with perfect
 * play, see docs/DESIGN.md — so the start alternates across the match instead.
 */
function nextStarter() {
  const played = score.X + score.O;
  return played % 2 === 0 ? DEFAULT_RULES.firstPlayer : opponentOf(DEFAULT_RULES.firstPlayer);
}

function startGame() {
  history = [createGame(makeRules({ firstPlayer: nextStarter() }))];
  render();
}

function play(move) {
  const state = current();
  if (state.status.over) return;

  const next = applyMove(state, move);
  history.push(next);
  if (next.status.over) score[next.status.winner] += 1;
  render();
}

function undo() {
  if (history.length < 2) return;
  const undone = history.pop();
  if (undone.status.over) score[undone.status.winner] -= 1;
  render();
}

function render() {
  const state = current();
  renderBoard(state, elements.board, (cell) => play({ type: 'place', cell }));
  renderStatus(state, elements.status);
  renderLog(history, elements.log);
  renderScore(score, state, elements.score);
  renderSwap(state, elements.swap);
  elements.undo.hidden = !UI_OPTIONS.showUndo;
  elements.undo.disabled = history.length < 2;
}

elements.newGame.addEventListener('click', startGame);
elements.undo.addEventListener('click', undo);
elements.swap.addEventListener('click', () => play({ type: 'swap' }));

startGame();
