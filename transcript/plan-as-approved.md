# Decay Tic-Tac-Toe — implementation plan

## Context

The brief (`~/Downloads/AI Dev Test - Candidate brief.pdf`) is an AI-assisted development
exercise: design and build a two-player tic-tac-toe variant in which **a game can never end
in a draw** and **play always terminates**. It must stay recognisably tic-tac-toe — 3×3, two
players, X and O, alternating turns. The rules themselves are ours to invent; the exercise is
assessed on how an underspecified requirement is turned into something defensible, on the
written argument, and on the raw transcript of the work.

The project directory `/Users/jitendrachamoli/Documents/Project_Hub/tick_tac_toe_game` is
currently empty. Everything below is new work.

What the brief explicitly does **not** score: visual design, animation, sound, responsive
layout, accessibility polish, a computer opponent, test coverage beyond what supports the
no-draw and termination argument, and whether the variant is original.

**Hard constraints:** HTML, CSS and JavaScript only. No build step — `python -m http.server`
in the repo root, open the page, play. No backend, no database, no network calls. Human vs
human is sufficient. Current Chrome only.

**Additional driver from the user:** at the interview they will be asked for one unannounced
change, live. The code must be shaped so that likely changes ("diagonals no longer count",
"4×4 board", "4 marks each", "misère") are single-value or single-function edits, not
refactors.

---

## The variant: Decay Tic-Tac-Toe

Decided with the user after considering two alternatives (a minimal "the ninth move must win
or you lose" rule, rejected as a thinly disguised tiebreak; and classic fading-marks
"infinite tic-tac-toe", rejected because its termination argument leans on a repetition ban
and its state space is not exhaustively searchable).

1. 3×3 grid. X and O alternate. X goes first.
2. A player may hold at most **3 marks** on the board.
3. **Turn:** if you already hold 3 marks, your **oldest** mark is removed first and the cell
   it vacated is **burned** — permanently unplayable by either player. Then you place your
   mark on any empty, unburned cell.
4. **Win:** three in a row (row, column or diagonal) at any moment. Only the player who just
   placed can have created one.
5. **Loss:** if it is your turn and there is no empty unburned cell to place on, you lose.
6. **Swap rule:** after X's first mark, O may either reply normally or **swap** — take over
   the X side, with the opponent continuing as O. Offered once, at O's first turn only.

### Why there is never a draw, and why play always ends

Let `E` be the number of empty, unburned cells. `E` starts at 9.

- **Free-placement turn** (mover holds fewer than 3 marks): one empty cell becomes occupied.
  `E` decreases by exactly 1.
- **Decay turn** (mover holds 3 marks): one *occupied* cell becomes burned — this does not
  change `E`, since a burned cell was never empty — and then one empty cell becomes occupied.
  `E` decreases by exactly 1.

So **every turn reduces `E` by exactly one, with no exceptions**: `E = 9 − (turns taken)`.

- **Termination:** `E` is a non-negative integer that strictly decreases every turn, so at
  most 9 marks are ever placed and the game is decided by turn 10. No line of play continues
  indefinitely.
- **No draw:** a game ends in exactly one of two ways. Either a placement completes a line
  (that player wins), or the player to move has `E = 0` and cannot place (that player loses,
  so their opponent wins). Both name a winner. There is no terminal state in which neither
  player has won.

A consequence worth stating plainly, and the reason the swap rule exists: turn 10 is always
O's, so absent a line it is always O who is caught with nowhere to place. This holds for any
marks-per-player setting — the arithmetic always lands the squeeze on O. The swap rule
neutralises it by letting O take X's side after seeing the opening move, so neither seat owns
the default win in advance.

The exhaustive search (below) is the real evidence; this argument is what it confirms.

---

## Architecture

Native ES modules, served as static files, no framework, no bundler. A **pure engine** that
never touches the DOM is what makes the exhaustive proof possible — the test page imports the
exact same module the game runs on.

```
index.html              the game
tests.html              the proof + unit tests, opened in Chrome
README.md               how to run it
.gitignore
css/style.css
js/config.js            DEFAULT_RULES — every tunable rule in one object
js/lines.js             winning lines generated from the config
js/engine.js            pure game logic; no DOM, immutable states
js/ui.js                render + event handling
js/main.js              wiring
test/harness.js         tiny assert/report helper
test/engine-tests.js    unit assertions on the rules
test/proof.js           exhaustive search over the whole game tree
docs/RULES.md
docs/DESIGN.md
transcript/             raw session files, config files, README.md
```

### `js/config.js` — the flex point

Every likely interview change is a value here:

```js
export const DEFAULT_RULES = {
  size: 3,
  winLength: 3,
  directions: { horizontal: true, vertical: true, diagonal: true },
  maxMarks: 3,
  burnOnDecay: true,
  decaySelection: 'oldest',
  swapRule: true,
  firstPlayer: 'X',
};
```

- *"Diagonals don't count"* → `directions.diagonal = false`.
- *"Make it 4×4"* → `size: 4` (with `winLength` to taste).
- *"Four marks each"* → `maxMarks: 4`.
- *"Player picks which mark decays"* → add an entry to the strategy map in `engine.js`;
  only `'oldest'` ships, but the seam is a function lookup, not an `if`.
- `burnOnDecay: false` is deliberately available and deliberately documented as **breaking
  the termination guarantee** — decay would then free a cell, `E` would stop decreasing, and
  play could cycle. DESIGN.md records this as the load-bearing rule.

### `js/lines.js`

`winningLines(rules)` generates every winning line from `size`, `winLength` and the enabled
`directions`, rather than hardcoding the eight lines. This is what makes the diagonals change
and the board-size change one-liners, and it means the proof re-runs against whatever the
rules say.

### `js/engine.js` — pure, immutable

State: `{ rules, board, burned, marks: {X: [...], O: [...]}, turn, ply, seats, swapAvailable,
status }`, where `marks.X` is cell indices oldest-first (the decay queue) and `status` is
either in-play or `{ over: true, winner, reason: 'line' | 'stuck', line }`.

- `createGame(rules)`
- `legalMoves(state)` → placements, plus the swap option at O's first turn
- `applyMove(state, move)` → **a new state**; immutability gives undo, the move log and the
  exhaustive search for free
- `findLine(state, cell)` → the winning line through the placed cell, or null

Move resolution order, stated explicitly because it is the part that must not drift:
decay-and-burn → place → check line for the mover → pass turn → if the next player has no
empty unburned cell, they lose with reason `'stuck'`.

Swap is a **relabelling of seats only** — the board, the marks and whose turn it is are
untouched, only which human sits behind X changes. That is why it cannot affect the no-draw
or termination properties, and DESIGN.md will say so.

### `tests.html` + `test/proof.js`

Opened in Chrome under the same `http.server`. Depth-first walk of every reachable position
from the initial state, with memoisation on a canonical state key, asserting:

1. every terminal state has a winner — **no draws anywhere in the tree**;
2. no game exceeds 10 plies — **termination**;
3. `E` decreases by exactly 1 per ply — the invariant the argument rests on;
4. minimax value of the game under perfect play, reported as a finding for DESIGN.md.

Then re-runs the whole search against alternate configs (`maxMarks: 4`, diagonals off) to
show the properties are structural rather than a 3×3 accident. The tree is small — at most 9
plies with branching ≤ 9 — so this runs in milliseconds.

`test/engine-tests.js` covers the rules the search cannot express as cleanly: decay removes
the oldest mark, the vacated cell burns, burned cells are never playable, a win is detected
the moment the line closes, swap is offered exactly once.

### UI

`index.html` + `js/ui.js`: the grid, a status line (whose turn, marks placed, cells left, and
the game-over reason in words), burned cells rendered clearly dead and unclickable, the mark
that will decay next shown faded so players can plan, a move log listing placements, removals
and burns, the winning line highlighted, plus New game and Undo. The swap button appears only
at O's first turn. The view renders engine state and dispatches moves — no rule logic in the
UI, so a rules change never means editing `ui.js`.

---

## Build order — one commit per step

1. **Scaffold** — repo init, `README.md`, `.gitignore`, empty structure.
2. **Rules + lines** — `config.js`, `lines.js`, unit tests for generated lines.
3. **Engine** — `engine.js` with decay, burn, win and stuck detection + unit tests.
4. **Proof** — `test/proof.js`, `tests.html`; record the actual numbers.
5. **UI** — playable game in Chrome.
6. **Swap rule** — engine option + button, proof re-run.
7. **`docs/RULES.md`** — the variant plainly enough to play from a printed copy, no code.
8. **`docs/DESIGN.md`** — reading of the brief and the ambiguity found; rule sets considered
   and rejected and why; the no-draw and termination argument plus the search results;
   the X-advantage finding and the swap rule as the response; what is unfinished.
9. **`transcript/`** — raw session `.jsonl` from
   `~/.claude/projects/-Users-jitendrachamoli-Documents-Project-Hub-tick-tac-toe-game/`,
   a copy of `~/.claude/CLAUDE.md`, any settings/skill config that shaped behaviour, and a
   `README.md` mapping session files to phases. **Anything credential-shaped gets flagged to
   the user before it is committed, not committed and redacted after.**

---

## Verification

1. `cd` to the repo root, `python3 -m http.server 8000`.
2. Open `http://localhost:8000/tests.html` in Chrome — every assertion passes, and the page
   prints the number of positions searched, the maximum depth reached, the count of terminal
   states with no winner (must be **0**), and the perfect-play result.
3. Open `http://localhost:8000/index.html` and play a full game by hand, driving it past
   move 6 so the decay and burn behaviour is visible, and once to the stuck ending so the
   no-legal-move loss is seen on screen.
4. Drive the same flow through the Playwright MCP tools to confirm it end-to-end without
   hand-testing, and check the Chrome console is clean and no network requests are made.
5. Confirm the live-change story: set `directions.diagonal = false` in `config.js`, reload
   both pages, and check the game rejects diagonal wins and the proof still passes with the
   new line set. Revert.
6. `git log` shows commits at genuine boundaries with timestamps that match the transcript.

## Honesty notes to carry into DESIGN.md

- Whatever the exhaustive search says about perfect play gets reported as found, including if
  it is a forced win for one side.
- The 3-hour time box: if it overruns, DESIGN.md records the overrun and the cause.
- On a 3×3 board no rule can force a three-in-a-row to appear, so every no-draw variant needs
  one ending that is not a line. Ours is the no-legal-placement loss. This reasoning belongs
  in DESIGN.md as the central resolution of the brief's ambiguity.
