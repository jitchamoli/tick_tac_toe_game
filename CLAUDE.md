# Decay Tic-Tac-Toe

A tic-tac-toe variant that can never end in a draw. Static files, no build step,
no backend, no network. Serve with `python -m http.server` and open the page.

## The two properties that must never break

1. **No draw.** No terminal state where neither player has won.
2. **Always terminates.** No line of play continues indefinitely.

Both rest on a single invariant: **every turn consumes exactly one empty cell.**
Early turns place on one; later turns burn the vacated cell (which was never
empty) and place on one. So `empty = cells - ply`, the game ends by ply 9 on a
3×3, and the only two endings are a completed line or a player with nowhere to
place. Full argument in `docs/DESIGN.md` §4.

**If a change breaks that invariant, it breaks the whole submission.** The suite
checks it on every position it visits.

## Layout

| File | Role |
|---|---|
| `js/config.js` | `DEFAULT_RULES` — every tunable rule. `UI_OPTIONS` — interface switches, which the engine and proof never read. |
| `js/lines.js` | Winning lines *generated* from size/winLength/directions. Never hardcode lines. |
| `js/engine.js` | Pure, immutable game logic. `applyMove` returns a new state. No DOM. |
| `js/ui.js` | Rendering only. **No rule logic belongs here.** |
| `js/main.js` | Wiring; `history` is both the move log and the undo stack. |
| `test/search.js` | Exhaustive game-tree walk — the proof. |
| `tests.html` | Open in Chrome to run everything. |

## Making a change

Most rule changes are one value in `js/config.js`:

| Ask | Change |
|---|---|
| Diagonals don't count | `directions.diagonal: false` |
| Bigger board | `size: 4` (set `winLength` to suit; CSS follows automatically) |
| More marks each | `maxMarks: 4` |
| Newest mark decays | `decaySelection: 'newest'` |
| Player picks which mark decays | add an entry to `DECAY_STRATEGIES` in `engine.js` |
| Turn the swap rule on | `swapRule: true` (button already wired) |
| Show undo | `UI_OPTIONS.showUndo: true` |

For anything larger, keep the seams: rules in `config.js`, derived geometry in
`lines.js`, logic in `engine.js`, rendering in `ui.js`.

## Verifying

Open `http://localhost:8000/tests.html`. **All checks must pass** — currently 18,
including the exhaustive proof over 342,826 positions reporting **0** terminal
positions with no winner.

Then play a real game at `/` and push past move 6, where decay and burning start.

## Traps

- **Chrome caches ES modules hard.** After editing anything in `js/`, hard reload
  (Cmd/Ctrl+Shift+R). A plain reload can run the previous version — this already
  caused a suite to pass against code that was not on disk. The first check in
  the suite catches it and names the fix.
- **`burnOnDecay: false` deliberately breaks termination.** It exists only as the
  negative control that proves burning is load-bearing. Never ship it on.
- **Tests that assert line counts pin their own `directions`**, so changing a
  default cannot fail them for the wrong reason. Keep that when adding tests.
- **A player's marks are ordered oldest-first**; decay reads from that queue. Test
  fixtures must avoid triples that form a line, or the game ends before the decay
  phase is reached.

## Conventions

- No framework, no bundler, no dependencies. Everything must serve as static files.
- Comments explain *why*, not what. Match the surrounding density.
- Commit at real boundaries with a message explaining the reasoning, not just the
  diff. The commit history is part of what is being assessed.

## Not scored — don't spend time here

Visual design, animation, sound, responsive layout, accessibility polish, a
computer opponent, and test coverage beyond what supports the no-draw and
termination argument.
