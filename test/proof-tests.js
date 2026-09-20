/**
 * The no-draw and termination proof, by exhaustive search.
 *
 * Every claim below is checked over the entire reachable game tree, not sampled.
 */

import { test, assert, assertEqual, note } from './harness.js';
import { makeRules } from '../js/config.js';
import {
  searchGameTree, walkEveryPosition, randomPlayouts, findRepeatingLine,
} from './search.js';

/** Check the two guarantees over the whole tree for one rule set. */
function proveNoDrawAndTermination(label, overrides = {}) {
  // The swap is a relabelling of which human plays which mark, proven separately
  // in engine-tests.js, so the search walks the underlying game without it.
  const rules = makeRules({ ...overrides, swapRule: false });
  const cells = rules.size * rules.size;
  const walk = walkEveryPosition(rules);
  const game = searchGameTree(rules);

  note(`${label}: ${walk.positions.toLocaleString()} distinct positions, ` +
       `${walk.terminals.toLocaleString()} terminal positions reached`);
  note(`  endings: ${walk.terminalsByReason.line.toLocaleString()} by three-in-a-row, ` +
       `${walk.terminalsByReason.stuck.toLocaleString()} by nowhere to place`);
  note(`  terminal positions with no winner: ${walk.terminalsWithoutWinner}`);
  note(`  longest game: ${walk.maxPly} plies (upper bound ${cells})`);
  note(`  perfect play: ${game.winnerUnderPerfectPlay} wins`);

  assertEqual(walk.terminalsWithoutWinner, 0, `${label}: a game ended with no winner`);
  assertEqual(walk.deadEnds, 0, `${label}: a live position offered no legal move`);
  assert(!walk.cycleDetected, `${label}: a line of play repeated a position`);
  assert(!walk.depthCapHit, `${label}: the search hit a depth cap`);
  assert(walk.maxPly <= cells, `${label}: a game ran to ${walk.maxPly} plies`);
  assert(walk.emptyCellInvariantHolds, `${label}: a turn did not consume exactly one empty cell`);
}

test('shipped rules: no game can end in a draw, and every game ends by ply 9', () => {
  proveNoDrawAndTermination('3x3, 3 marks each');
});

test('the guarantees survive turning diagonals off', () => {
  proveNoDrawAndTermination('3x3, no diagonals', { directions: { diagonal: false } });
});

test('the guarantees survive four marks each', () => {
  proveNoDrawAndTermination('3x3, 4 marks each', { maxMarks: 4 });
});

test('the guarantees survive decaying your newest mark instead of your oldest', () => {
  proveNoDrawAndTermination('3x3, newest decays', { decaySelection: 'newest' });
});

test('a 4x4 board holds up too, though only across sampled games', () => {
  // A 4x4 tree runs to tens of millions of positions, past what a browser tab
  // should chew through, so this is 20,000 random games rather than a proof.
  // It can only fail to find a counterexample; it cannot rule one out.
  //
  // winLength stays at 3: with only three marks each, a four-in-a-row is
  // unreachable, and every game would end by the nowhere-to-place rule.
  const rules = makeRules({ size: 4, winLength: 3, swapRule: false });
  const playouts = randomPlayouts(rules, 20000);

  note(`4x4, win 3: ${playouts.games.toLocaleString()} random games, ` +
       `longest ${playouts.maxPly} plies (upper bound 16)`);
  note(`  endings: ${playouts.endingsByReason.line.toLocaleString()} by three-in-a-row, ` +
       `${playouts.endingsByReason.stuck.toLocaleString()} by nowhere to place`);

  assertEqual(playouts.endedWithoutWinner, 0, 'a sampled game ended with no winner');
  assertEqual(playouts.invariantViolations, 0, 'a turn did not consume exactly one empty cell');
  assert(playouts.maxPly <= 16, 'a sampled game ran past the cell count');
});

test('negative control: without burning, the game can run forever', () => {
  // This is the rule the whole termination argument rests on. With burnOnDecay
  // off, a decayed cell becomes empty again, the empty-cell count stops falling,
  // and play can cycle. The depth cap is what stops this search, not the rules.
  const broken = makeRules({ burnOnDecay: false, swapRule: false });
  const walk = walkEveryPosition(broken, { depthCap: 14 });

  note(`without burning: ${walk.positions.toLocaleString()} positions seen before the depth cap`);
  note(`  a position repeated inside a single line of play: ${walk.cycleDetected}`);
  note(`  empty-cell invariant holds: ${walk.emptyCellInvariantHolds}`);

  // Show the failure in the flesh rather than as a statistic.
  const loop = findRepeatingLine(broken);
  assert(loop, 'expected to find a concrete repeating line of play');
  const cycleLength = loop.moves.length - loop.repeatsFrom;
  note(`  a concrete loop: ${loop.moves.map((c) => c + 1).join(' → ')}`);
  note(`    the position after move ${loop.repeatsFrom} returns after move ${loop.moves.length}; ` +
       `those ${cycleLength} moves repeat forever`);

  assert(walk.cycleDetected, 'expected play to be able to cycle without burning');
  assert(!walk.emptyCellInvariantHolds, 'expected the empty-cell invariant to fail');
});
