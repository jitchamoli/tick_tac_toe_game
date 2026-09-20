/**
 * Every tunable rule of the variant lives here.
 *
 * This object is the single place to change the game. The engine, the UI and the
 * exhaustive proof all read from it, so changing a value here changes all three.
 *
 * See docs/DESIGN.md for which of these values the no-draw and termination
 * guarantees depend on. `burnOnDecay` is the load-bearing one.
 */
export const DEFAULT_RULES = {
  /** Board is size × size. */
  size: 3,

  /** Marks in a row needed to win. */
  winLength: 3,

  /** Which directions count as a winning line. */
  directions: {
    horizontal: true,
    vertical: true,
    diagonal: true,
  },

  /** How many marks a player may hold on the board at once. */
  maxMarks: 3,

  /**
   * When a mark decays, does the cell it vacated become permanently unplayable?
   *
   * true  — the empty-cell count falls by one every single turn, which is what
   *         guarantees the game ends. This is the shipped variant.
   * false — decay frees a cell again, the game can cycle forever, and the
   *         termination guarantee is LOST. Provided only so the proof page can
   *         demonstrate that it is lost.
   */
  burnOnDecay: true,

  /** Which of your marks decays. See DECAY_STRATEGIES in engine.js. */
  decaySelection: 'oldest',

  /**
   * After X's first mark, may O swap sides once (the "pie rule")?
   *
   * Off, and deliberately so. The pie rule balances a game by making the first
   * player pick an opening not worth stealing — but this variant has no draws,
   * so every position is a win for exactly one side and the player who chooses
   * sides last simply takes the winning one. The exhaustive search confirms all
   * nine openings are wins for X, so O would always swap. It transfers the
   * advantage rather than removing it. See docs/DESIGN.md.
   *
   * The rule is implemented and tested, so this can be switched back on.
   */
  swapRule: false,

  /** Who moves first. */
  firstPlayer: 'X',
};

/**
 * Interface options. These are not rules: the engine and the exhaustive proof
 * never read them, so changing one cannot affect the no-draw or termination
 * guarantees.
 */
export const UI_OPTIONS = {
  /**
   * Show the undo button?
   *
   * Off. Both players share one screen and one keyboard, so an undo button is
   * an undo of whoever moved last — including your opponent's move, against
   * their wishes. Useful when demonstrating the game to an audience, which is
   * why it is still here; not something to hand two competing players.
   */
  showUndo: false,
};

/** The two players, in turn order. */
export const PLAYERS = ['X', 'O'];

/** Build a rule set from the defaults with some values overridden. */
export function makeRules(overrides = {}) {
  return {
    ...DEFAULT_RULES,
    ...overrides,
    directions: { ...DEFAULT_RULES.directions, ...(overrides.directions ?? {}) },
  };
}
