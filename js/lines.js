/**
 * Winning lines, generated from the rules rather than hardcoded.
 *
 * Hardcoding the eight lines of a 3×3 board would make "diagonals no longer
 * count" or "make it 4×4" a rewrite. Generating them makes both a config change.
 */

/** Step vectors as [rowStep, colStep], keyed by the direction they belong to. */
const DIRECTION_STEPS = {
  horizontal: [[0, 1]],
  vertical: [[1, 0]],
  diagonal: [[1, 1], [1, -1]],
};

/**
 * Every winning line for these rules, as arrays of cell indices.
 *
 * A line is `winLength` cells walked from some start cell along an enabled
 * direction, kept only if every cell stays on the board.
 */
export function winningLines(rules) {
  const { size, winLength, directions } = rules;
  const steps = Object.entries(directions)
    .filter(([, enabled]) => enabled)
    .flatMap(([name]) => DIRECTION_STEPS[name] ?? []);

  const lines = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      for (const [rowStep, colStep] of steps) {
        const endRow = row + rowStep * (winLength - 1);
        const endCol = col + colStep * (winLength - 1);
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;

        const line = [];
        for (let i = 0; i < winLength; i += 1) {
          line.push((row + rowStep * i) * size + (col + colStep * i));
        }
        lines.push(line);
      }
    }
  }
  return lines;
}

/**
 * The winning lines that pass through each cell, indexed by cell.
 *
 * Only the player who just placed can have made a line, so a win check only
 * needs the lines through the cell they placed on.
 */
export function linesByCell(rules) {
  const byCell = Array.from({ length: rules.size * rules.size }, () => []);
  for (const line of winningLines(rules)) {
    for (const cell of line) byCell[cell].push(line);
  }
  return byCell;
}
