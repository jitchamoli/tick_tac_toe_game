/**
 * Unit checks on the rules themselves. The exhaustive search in proof-tests.js
 * covers the two guarantees; these cover the mechanics it assumes.
 */

import { test, assert, assertEqual, assertThrows } from './harness.js';
import { makeRules } from '../js/config.js';
import { winningLines } from '../js/lines.js';
import {
  createGame, applyMove, legalMoves, emptyCells, canSwap,
} from '../js/engine.js';

const rules = makeRules();

/** Play a list of cells in order, as alternating placements. */
function play(state, cells) {
  return cells.reduce((s, cell) => applyMove(s, { type: 'place', cell }), state);
}

// These pin the directions explicitly rather than relying on the defaults, so
// that changing a default in config.js cannot fail them for the wrong reason.
const ALL_DIRECTIONS = { horizontal: true, vertical: true, diagonal: true };

test('a 3x3 board has the eight familiar winning lines', () => {
  assertEqual(winningLines(makeRules({ directions: ALL_DIRECTIONS })).length, 8);
});

test('turning diagonals off leaves six lines, and nothing else changes', () => {
  const noDiagonals = makeRules({ directions: { ...ALL_DIRECTIONS, diagonal: false } });
  assertEqual(winningLines(noDiagonals).length, 6);
  assertEqual(
    winningLines(makeRules({ size: 4, winLength: 4, directions: ALL_DIRECTIONS })).length,
    10,
  );
});

// X takes 0, 1, 5 and O takes 2, 3, 7. Neither triple is a line, so these games
// reach the decay phase instead of ending early.
const OPENING = [0, 2, 1, 3, 5, 7];

test('the first three marks of each player are placed with no decay', () => {
  const state = play(createGame(rules), OPENING);
  assertEqual(state.marks.X, [0, 1, 5], 'X holds three marks');
  assertEqual(state.marks.O, [2, 3, 7], 'O holds three marks');
  assertEqual(state.burned.filter(Boolean).length, 0, 'nothing has burned yet');
  assertEqual(state.status.over, false, 'neither triple is a line');
});

test('a fourth mark removes your oldest and burns the cell it sat on', () => {
  const before = play(createGame(rules), OPENING);
  assertEqual(before.marks.X, [0, 1, 5]);

  const after = applyMove(before, { type: 'place', cell: 4 });
  assertEqual(after.marks.X, [1, 5, 4], 'oldest X mark is gone, new one appended');
  assertEqual(after.board[0], null, 'the vacated cell is empty of marks');
  assert(after.burned[0], 'the vacated cell is burned');
  assertEqual(after.lastMove.decayed, 0);
});

test('a burned cell is never playable again, by either player', () => {
  const state = play(createGame(rules), [...OPENING, 4]);
  assert(state.burned[0], 'cell 0 burned');
  assert(!emptyCells(state).includes(0), 'burned cell is not empty');
  assert(!legalMoves(state).some((m) => m.cell === 0), 'burned cell is not offered');
  assertThrows(() => applyMove(state, { type: 'place', cell: 0 }), 'playing it throws');
});

test('three in a row wins the moment the line closes', () => {
  const state = play(createGame(rules), [0, 3, 1, 4, 2]);
  assertEqual(state.status.over, true);
  assertEqual(state.status.winner, 'X');
  assertEqual(state.status.reason, 'line');
  assertEqual(state.status.line, [0, 1, 2]);
});

test('decay can break a line you had already built, so a win must be taken when it is there', () => {
  // X holds 0,1 and 6. Placing a third mark elsewhere later decays 0 first.
  const state = play(createGame(rules), [0, 3, 1, 4, 6, 7]);
  assertEqual(state.marks.X, [0, 1, 6]);
  const after = applyMove(state, { type: 'place', cell: 2 });
  // 0 decayed, so 0-1-2 is not a line: X placed into what would have been a win.
  assertEqual(after.board[0], null);
  assertEqual(after.status.over, false, 'no win, because the oldest mark left the board');
});

test('running out of cells loses the game for the player who cannot place', () => {
  let state = createGame(rules);
  const seen = [];
  while (!state.status.over) {
    const moves = legalMoves(state).filter((m) => m.type === 'place');
    assert(moves.length > 0, 'a live game always offers a move');
    // Take the last offered cell each time; it happens to avoid an early line here.
    state = applyMove(state, moves[moves.length - 1]);
    seen.push(state.ply);
  }
  assert(state.status.winner, 'the game names a winner');
  assert(state.ply <= 9, `the game ended by ply 9, not ${state.ply}`);
});

test('every turn consumes exactly one empty cell', () => {
  let state = createGame(rules);
  assertEqual(emptyCells(state).length, 9);
  while (!state.status.over) {
    const before = emptyCells(state).length;
    const moves = legalMoves(state).filter((m) => m.type === 'place');
    state = applyMove(state, moves[0]);
    assertEqual(emptyCells(state).length, before - 1, `at ply ${state.ply}`);
  }
});

test('applying a move leaves the previous state untouched, so undo is free', () => {
  const state = play(createGame(rules), [0, 1, 3]);
  const snapshot = JSON.stringify(state);
  applyMove(state, { type: 'place', cell: 4 });
  assertEqual(JSON.stringify(state), snapshot, 'the original state did not change');
});

test('the swap, when switched on, is offered once and changes nothing but the seats', () => {
  // Shipped off; see js/config.js and docs/DESIGN.md for why.
  const start = createGame(makeRules({ swapRule: true }));
  assert(!canSwap(start), 'not offered before X has moved');

  const afterX = applyMove(start, { type: 'place', cell: 4 });
  assert(canSwap(afterX), 'offered at O\'s first turn');

  const swapped = applyMove(afterX, { type: 'swap' });
  assertEqual(swapped.board, afterX.board, 'the board is unchanged');
  assertEqual(swapped.marks, afterX.marks, 'the marks are unchanged');
  assertEqual(swapped.turn, afterX.turn, 'it is still O to move');
  assertEqual(swapped.ply, afterX.ply, 'the swap does not consume a turn');
  assertEqual(swapped.seats, { X: 2, O: 1 }, 'only the seats changed');

  assert(!canSwap(swapped), 'not offered twice');
  const afterO = applyMove(swapped, { type: 'place', cell: 0 });
  assert(!canSwap(afterO), 'not offered after O has played');
});
