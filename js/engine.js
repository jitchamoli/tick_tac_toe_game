/**
 * Decay Tic-Tac-Toe, as pure logic. No DOM, no globals, no mutation.
 *
 * Every function here takes a state and returns a new one, which is what lets the
 * UI implement undo for free and lets test/proof.js walk the entire game tree.
 */

import { DEFAULT_RULES, PLAYERS } from './config.js';
import { linesByCell } from './lines.js';

/**
 * Which of a player's marks decays, as an index into their queue of marks
 * (which is ordered oldest-first).
 *
 * To offer "the player chooses", add an entry here that reads the choice off the
 * move and have the UI supply it; nothing else in the engine needs to change.
 */
export const DECAY_STRATEGIES = {
  oldest: () => 0,
  newest: (marks) => marks.length - 1,
};

/** linesByCell is pure and only depends on the rules, so compute it once per rule set. */
const lineCache = new WeakMap();
function cellLines(rules) {
  let lines = lineCache.get(rules);
  if (!lines) {
    lines = linesByCell(rules);
    lineCache.set(rules, lines);
  }
  return lines;
}

/** The player whose turn it is after `player`. */
export function opponentOf(player) {
  return player === PLAYERS[0] ? PLAYERS[1] : PLAYERS[0];
}

export function createGame(rules = DEFAULT_RULES) {
  const cells = rules.size * rules.size;
  return {
    rules,
    board: Array(cells).fill(null),
    burned: Array(cells).fill(false),
    marks: { X: [], O: [] },
    turn: rules.firstPlayer,
    ply: 0,
    /** Which human (1 or 2) sits behind each mark. Only the swap rule changes this. */
    seats: { X: 1, O: 2 },
    swapAvailable: rules.swapRule,
    lastMove: null,
    status: { over: false },
  };
}

/** Cells that are empty and not burned. */
export function emptyCells(state) {
  const cells = [];
  for (let i = 0; i < state.board.length; i += 1) {
    if (state.board[i] === null && !state.burned[i]) cells.push(i);
  }
  return cells;
}

/**
 * Can `player` place at all on their turn?
 *
 * With burnOnDecay on — the shipped variant — decay burns the vacated cell, so it
 * never opens a cell up and this is simply "is any cell empty". With it off, a
 * player at their mark limit frees a cell by decaying, so they can always move.
 */
export function canPlace(state, player) {
  if (emptyCells(state).length > 0) return true;
  return !state.rules.burnOnDecay && state.marks[player].length >= state.rules.maxMarks;
}

/** May O swap sides right now? Offered once, at O's first turn only. */
export function canSwap(state) {
  return (
    state.rules.swapRule &&
    state.swapAvailable &&
    !state.status.over &&
    state.ply === 1 &&
    state.turn !== state.rules.firstPlayer
  );
}

export function legalMoves(state) {
  if (state.status.over) return [];
  const moves = emptyCells(state).map((cell) => ({ type: 'place', cell }));
  if (canSwap(state)) moves.push({ type: 'swap' });
  return moves;
}

/** The winning line through `cell` for `player`, or null. */
export function findLine(state, cell, player) {
  for (const line of cellLines(state.rules)[cell]) {
    if (line.every((i) => state.board[i] === player)) return line;
  }
  return null;
}

/**
 * Apply a move and return the new state. Throws on an illegal move — the UI is
 * expected not to offer one, and the proof only ever walks legalMoves().
 */
export function applyMove(state, move) {
  if (state.status.over) throw new Error('the game is over');
  if (move.type === 'swap') return applySwap(state);
  if (move.type !== 'place') throw new Error(`unknown move type: ${move.type}`);
  return applyPlacement(state, move.cell);
}

function applySwap(state) {
  if (!canSwap(state)) throw new Error('swap is not available');
  // Purely a relabelling: the board, the marks and whose turn it is are untouched,
  // only which human sits behind each mark changes.
  return {
    ...state,
    seats: { X: state.seats.O, O: state.seats.X },
    swapAvailable: false,
    lastMove: { type: 'swap' },
  };
}

function applyPlacement(state, cell) {
  const { rules } = state;
  if (!Number.isInteger(cell) || cell < 0 || cell >= state.board.length) {
    throw new Error(`no such cell: ${cell}`);
  }
  if (state.burned[cell]) throw new Error(`cell ${cell} is burned`);
  if (state.board[cell] !== null) throw new Error(`cell ${cell} is taken`);

  const player = state.turn;
  const board = state.board.slice();
  const burned = state.burned.slice();
  const marks = player === 'X'
    ? { X: state.marks.X.slice(), O: state.marks.O }
    : { X: state.marks.X, O: state.marks.O.slice() };

  // 1. Decay: at the mark limit, one of your marks is removed and its cell burns.
  let decayed = null;
  if (marks[player].length >= rules.maxMarks) {
    const index = DECAY_STRATEGIES[rules.decaySelection](marks[player]);
    decayed = marks[player].splice(index, 1)[0];
    board[decayed] = null;
    if (rules.burnOnDecay) burned[decayed] = true;
  }

  // 2. Place.
  board[cell] = player;
  marks[player].push(cell);

  const next = {
    ...state,
    board,
    burned,
    marks,
    ply: state.ply + 1,
    turn: opponentOf(player),
    swapAvailable: state.swapAvailable && state.ply === 0,
    lastMove: { type: 'place', player, cell, decayed, burned: rules.burnOnDecay ? decayed : null },
    status: { over: false },
  };

  // 3. Only the player who just placed can have completed a line.
  const line = findLine(next, cell, player);
  if (line) {
    next.status = { over: true, winner: player, loser: opponentOf(player), reason: 'line', line };
    return next;
  }

  // 4. If the player to move cannot place, they lose.
  if (!canPlace(next, next.turn)) {
    next.status = { over: true, winner: player, loser: next.turn, reason: 'stuck', line: null };
  }
  return next;
}
