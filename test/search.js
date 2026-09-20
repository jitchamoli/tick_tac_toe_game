/**
 * Exhaustive search over the whole reachable game tree.
 *
 * This is the evidence for the two claims the brief demands: that no game can end
 * in a draw, and that no line of play continues indefinitely. It walks every legal
 * sequence of moves from the empty board and checks every position it reaches.
 */

import { createGame, applyMove, legalMoves, emptyCells, opponentOf } from '../js/engine.js';

/**
 * A canonical key for a position. Two positions with the same key are the same
 * game: same marks, same burned cells, same decay order, same player to move.
 *
 * `seats` is deliberately excluded — it records which human sits behind X, which
 * cannot affect play. See the swap-rule test.
 */
export function stateKey(state) {
  return [
    state.board.map((c) => c ?? '.').join(''),
    state.burned.map((b) => (b ? '#' : '.')).join(''),
    state.marks.X.join(','),
    state.marks.O.join(','),
    state.turn,
  ].join('|');
}

/**
 * Walk the full tree from the initial position.
 *
 * Returns statistics and, because no game can be drawn, a clean minimax value:
 * `valueToMove` is +1 if the player to move at the root wins under perfect play
 * and -1 if they lose.
 *
 * `depthCap` exists only for the deliberately broken configurations used as
 * negative controls; the shipped rules terminate on their own.
 *
 * Callers pass rules with `swapRule` off. The swap changes only which human sits
 * behind each mark — engine-tests.js proves the board, the marks and the player
 * to move are untouched — so it cannot affect either guarantee, and modelling it
 * here would only add a branch that looks like a repeated position.
 */
export function searchGameTree(rules, { depthCap = Infinity } = {}) {
  const cells = rules.size * rules.size;
  const memo = new Map();
  const onPath = new Set();

  const stats = {
    positions: 0,
    terminals: 0,
    terminalsWithoutWinner: 0,
    terminalsByReason: { line: 0, stuck: 0 },
    maxPly: 0,
    emptyCellInvariantHolds: true,
    cycleDetected: false,
    depthCapHit: false,
    longestGame: 0,
  };

  function visit(state) {
    // The invariant the whole termination argument rests on: every ply consumes
    // exactly one empty cell, so empties = cells - ply.
    if (emptyCells(state).length !== cells - state.ply) {
      stats.emptyCellInvariantHolds = false;
    }
    stats.maxPly = Math.max(stats.maxPly, state.ply);

    if (state.status.over) {
      stats.terminals += 1;
      stats.terminalsByReason[state.status.reason] += 1;
      if (!state.status.winner) stats.terminalsWithoutWinner += 1;
      stats.longestGame = Math.max(stats.longestGame, state.ply);
      // Value is reported for the player to move; at a terminal position nobody
      // moves, so score it for whoever would have.
      return state.status.winner === state.turn ? 1 : -1;
    }

    const key = stateKey(state);
    if (onPath.has(key)) {
      stats.cycleDetected = true;
      return 0;
    }
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    if (state.ply >= depthCap) {
      stats.depthCapHit = true;
      return 0;
    }

    onPath.add(key);
    let best = -Infinity;
    for (const move of legalMoves(state)) {
      // The child scores from the child's mover's perspective, so negate it.
      const value = -visit(applyMove(state, move));
      if (value > best) best = value;
      if (best === 1) break; // a win is the best available; no draws to distinguish
    }
    onPath.delete(key);

    memo.set(key, best);
    stats.positions = memo.size;
    return best;
  }

  const root = createGame(rules);
  const valueToMove = visit(root);
  return {
    ...stats,
    positions: memo.size,
    valueToMove,
    winnerUnderPerfectPlay: valueToMove === 1 ? root.turn : opponentOf(root.turn),
  };
}

/**
 * Walk the tree without pruning, so that every reachable terminal position is
 * actually inspected. The minimax search above cuts off a branch once it has
 * found a win, which is fine for the game value but would leave parts of the tree
 * unvisited — and "no draw anywhere" is a claim about the whole tree.
 */
export function walkEveryPosition(rules, { depthCap = Infinity } = {}) {
  const cells = rules.size * rules.size;
  const seen = new Set();
  const onPath = new Set();
  const stats = {
    positions: 0,
    terminals: 0,
    terminalsWithoutWinner: 0,
    terminalsByReason: { line: 0, stuck: 0 },
    maxPly: 0,
    emptyCellInvariantHolds: true,
    cycleDetected: false,
    depthCapHit: false,
    deadEnds: 0,
  };

  function visit(state) {
    if (emptyCells(state).length !== cells - state.ply) stats.emptyCellInvariantHolds = false;
    stats.maxPly = Math.max(stats.maxPly, state.ply);

    if (state.status.over) {
      stats.terminals += 1;
      stats.terminalsByReason[state.status.reason] += 1;
      if (!state.status.winner) stats.terminalsWithoutWinner += 1;
      return;
    }

    const key = stateKey(state);
    if (onPath.has(key)) {
      stats.cycleDetected = true;
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);

    if (state.ply >= depthCap) {
      stats.depthCapHit = true;
      return;
    }

    const moves = legalMoves(state);
    // A position that is not over but offers no move would be a draw by stalemate.
    if (moves.length === 0) stats.deadEnds += 1;

    onPath.add(key);
    for (const move of moves) visit(applyMove(state, move));
    onPath.delete(key);
  }

  visit(createGame(rules));
  stats.positions = seen.size;
  return stats;
}

/**
 * Random playouts, for rule sets whose tree is too large to walk exhaustively
 * (a 4×4 board runs to tens of millions of positions).
 *
 * Weaker evidence than the exhaustive search and labelled as such wherever it is
 * used: it can only fail to find a counterexample, never prove there is none.
 */
export function randomPlayouts(rules, games, random = Math.random) {
  const cells = rules.size * rules.size;
  const stats = {
    games,
    maxPly: 0,
    endedWithoutWinner: 0,
    invariantViolations: 0,
    endingsByReason: { line: 0, stuck: 0 },
  };

  for (let i = 0; i < games; i += 1) {
    let state = createGame(rules);
    while (!state.status.over) {
      if (emptyCells(state).length !== cells - state.ply) stats.invariantViolations += 1;
      const moves = legalMoves(state).filter((m) => m.type === 'place');
      if (moves.length === 0) break; // would be a stalemate: a draw by another name
      state = applyMove(state, moves[Math.floor(random() * moves.length)]);
    }
    stats.maxPly = Math.max(stats.maxPly, state.ply);
    if (state.status.over) stats.endingsByReason[state.status.reason] += 1;
    if (!state.status.over || !state.status.winner) stats.endedWithoutWinner += 1;
  }
  return stats;
}
