# Design notes

## 1. How I read the brief

The requirement is two properties, not a rule set:

> **No draw.** There is no terminal state in which neither player has won.
> **Always terminates.** There is no line of play that continues indefinitely.

Everything else — 3×3, X and O, alternating turns — is a constraint on the shape
of the answer, not the answer itself.

### The ambiguity that mattered

**Does a win have to be three in a row?**

The brief never says so. It says every terminal state must have a winner. Those
are different requirements, and the difference decides the whole design, because
on a 3×3 board **you cannot force a line to appear**.

That is a fact about the geometry, not about any particular rules. A full 3×3
board with five of one mark and four of the other can contain no line at all —
that arrangement is the ordinary drawn game everybody has seen. Restricting how
many marks are on the board does not help: three X's and three O's in six squares
need not contain a line either. There is no placement discipline that makes a line
inevitable.

So any drawless variant on this board needs **at least one way to lose that is not
a line**. Given that, I took the brief at its word — every ending must name a
winner — and designed a second losing condition that is a real part of the game
rather than a coin-toss bolted onto the end:

> If it is your turn and there is no empty square to place in, you lose.

That is an ordinary loss-by-immobility condition, the same shape as stalemate
losses in other abstract games. It is not a tiebreak: it is reached through play,
players can steer towards it, and roughly two thirds of all terminal positions in
this variant end that way.

### Smaller gaps, and how I closed them

| Gap | Decision |
|---|---|
| Is "cannot move" a loss or a win (misère)? | A loss. It is the intuitive reading and it keeps the game's goal singular: make a line, or strand your opponent. |
| Must the no-draw property hold for every configuration the code allows, or for the shipped rules? | The shipped rules. `js/config.js` documents exactly which switches preserve the guarantees, and the proof re-runs against each of them. One switch, `burnOnDecay: false`, deliberately breaks termination and exists only as the negative control. |
| "Recognisably tic-tac-toe" — how far can the rules travel? | Kept: 3×3, two players, X and O, strict alternation, three in a row wins, first three turns are ordinary placements. Added: one mechanic (decay and burn) and one extra losing condition. |
| Human vs human, or an opponent? | Human vs human. The brief says a computer opponent is not scored, and it would have cost time I would rather spend on the proof. |
| Does the variant have to be fair? | No — the brief does not ask for it, and Section 5 shows that in a drawless game it is not achievable in a single game. Fairness is handled across a match instead. |

---

## 2. The variant: Decay Tic-Tac-Toe

Full rules for players are in [RULES.md](RULES.md). In short:

1. 3×3, X and O, alternating, X first.
2. A player may hold at most **three marks**.
3. At the mark limit, a turn is: **your oldest mark is removed and its square is
   burned** — permanently unplayable by either player — **then you place**.
4. Three in a row wins, the moment it appears.
5. No empty square to place in on your turn: you lose.

The design is a single idea: give the board a **monotonically shrinking resource**.
Burning is what makes the resource shrink, and everything else follows from it.

---

## 3. Rule sets I considered and rejected

**The ninth move must win.** Standard tic-tac-toe, plus: a move that fills the
board without making a line is illegal, and a player with no legal move loses.
Correct, and trivially provable. Rejected because it is a tiebreak wearing a
costume — the first eight moves are ordinary tic-tac-toe, and the entire variant
is one sentence that fires once, at the end, in the games that would have been
drawn.

**Fading marks ("infinite tic-tac-toe").** Three marks each; placing a fourth makes
your oldest vanish and its square becomes *empty again*. No draws, because the
board never fills. Rejected on termination: play can cycle forever. The usual
patch — losing if you repeat a position — makes the legality of a move depend on
the entire history, which means the state space is not just large but
history-indexed, and cannot be searched exhaustively. I would have been left with
a hand-waved argument, which is the weakest thing the brief accepts.

Decay Tic-Tac-Toe is this variant with one word changed: the vacated square
**burns** instead of reopening. That one word converts a game that can loop into
one with a strictly decreasing measure.

**Wild tic-tac-toe.** Either player may place either symbol; any line of three
matching symbols wins. Rejected: the classic drawn arrangement is still reachable,
so it does not deliver the property at all.

**Notakto.** Both players place X's; completing a line loses. Genuinely drawless
and genuinely terminating — the full board is all X's and certainly contains a
line. Rejected because it abandons "two players, X and O", which the brief names
explicitly.

**Misère by decree.** Declare that whoever makes the last move of a drawn board
loses. Rejected: it is a coin toss, not a rule.

---

## 4. The argument, and the search that checks it

### The invariant

Let **E** be the number of empty, unburned squares. E starts at 9.

- **Free-placement turn** (mover holds fewer than three marks): an empty square
  becomes occupied. **E decreases by exactly 1.**
- **Decay turn** (mover holds three marks): an *occupied* square becomes burned —
  which cannot change E, because a burned square was never empty — and then an
  empty square becomes occupied. **E decreases by exactly 1.**

There is no third kind of turn. Therefore, after *k* turns, **E = 9 − k**.

**Termination.** E is a non-negative integer that strictly decreases every turn,
so no more than nine marks are ever placed and no game reaches an eleventh turn.
No line of play continues indefinitely. ∎

**No draw.** A game stops in exactly one of two situations. Either a placement
completed a line, and the player who placed it has won; or the player to move has
E = 0, cannot place, and has lost — so their opponent has won. Both name a winner,
so there is no terminal state in which neither player has won. ∎

The second half needs one more step to be airtight: a live position must always
offer a legal move, or a game could stall somewhere that is neither a line nor a
declared loss. It does — with E > 0 every empty unburned square is a legal
placement, and decay is automatic rather than a move that can be blocked. The
search checks this directly and counts zero such positions.

### The exhaustive search

`test/search.js` walks **every reachable position** from the empty board and
checks every one. Not sampled. Open `tests.html` under the local server to re-run
it; the figures below are what it prints.

Shipped rules, 3×3, three marks each:

| | |
|---|---|
| distinct positions reached | **342,826** |
| terminal positions | **196,080** |
| **terminal positions with no winner** | **0** |
| live positions offering no legal move | 0 |
| longest game | **9 plies** (upper bound: 9, the cell count) |
| endings by three in a row | 67,632 |
| endings by nowhere to place | 128,448 |
| positions where E ≠ 9 − ply | 0 |

The same search passes against every alternate configuration: diagonals off
(370,162 positions), four marks each (294,778), and decaying your newest mark
instead of your oldest (342,826). The guarantees are structural, not an artefact
of the default numbers.

A 4×4 board is checked by **20,000 random games rather than exhaustively** — its
tree runs to tens of millions of positions, past what a browser tab should be
asked to chew through. That test is labelled as sampling in the output, and it is
weaker evidence: it can fail to find a counterexample but cannot rule one out.

### The negative control

Burning is the load-bearing rule, so the suite also runs a configuration with it
switched off (`burnOnDecay: false`). With a decayed square reopening, the search
finds a position repeating inside a single line of play and reports the E
invariant broken — exactly the failure the burn rule prevents. The claim is not
just "our rules work" but "here is the specific thing that makes them work, and
here is what happens without it".

---

## 5. What the search found about fairness — and a rule I removed because of it

**X wins with perfect play. From all nine opening moves, without exception.**
I valued each opening separately to be sure it was not a quirk of one of them.

X's edge is structural. E = 9 − k means the empty squares run out immediately
after the ninth turn, which is always X's, so the player left with nowhere to
place is always O. O must make a line; X can also just survive.

I had originally planned to fix this with the **swap (pie) rule**: after X's first
mark, O may take over the X side instead of replying. I built it, and then the
search showed it makes things worse. The pie rule works by making the first player
choose an opening that is not worth stealing — which requires that a balanced
position exists. **In a game that cannot be drawn, every position is a win for
exactly one side.** So the player who chooses sides last simply takes the winning
one. Since every opening here is an X win, O would always swap, and the advantage
would move from seat one to seat two rather than disappearing.

That is not a flaw in these rules; it follows from drawlessness itself. Any
drawless game has a player with a winning strategy, and no side-choosing device
changes that — it only decides who gets it.

So the swap ships **off** (`swapRule: false`). The implementation and its tests
remain, because the reasoning is worth showing and the rule is one config flag
away. Fairness is handled where it can be: the game alternates who starts and
keeps a running score, so a **match** is even even though a single game is not.

---

## 6. Designing for change

The interview includes an unannounced modification, so the code is arranged so
that rule changes land in one place.

- **`js/config.js`** holds every tunable rule. Board size, win length, which
  directions count, marks per player, whether decay burns, which mark decays, the
  swap rule, who starts.
- **`js/lines.js`** generates the winning lines from those values instead of
  hardcoding the eight lines of a 3×3 board.
- **`js/engine.js`** is pure and immutable: `applyMove` returns a new state. That
  is what gives the UI undo for nothing and lets the proof walk the tree.
- **`js/ui.js`** contains no rule logic. It renders engine state and reports
  clicks. The grid takes its column count from `rules.size`, so a bigger board
  needs no CSS change either.

Worked examples of changes and where they land:

| Change | Edit |
|---|---|
| Diagonals no longer count | `directions.diagonal: false` |
| 4×4 board | `size: 4` (and `winLength` to taste) |
| Four marks each | `maxMarks: 4` |
| Newest mark decays instead of oldest | `decaySelection: 'newest'` |
| Player chooses which mark decays | one entry in `DECAY_STRATEGIES`, plus a UI affordance |
| Turn the swap rule back on | `swapRule: true` (the button is already wired) |

In each case the proof page re-runs against the changed rules, so a live edit
comes with its own evidence.

---

## 7. What is broken, weak, or unfinished

Honestly, and in order of how much it matters:

1. **The 4×4 configuration is sampled, not proved.** 20,000 random games found no
   draw and no overlong game, which is evidence, not a proof. Exhausting that tree
   would need symmetry reduction and probably a worker.
2. **A single game is not fair.** X wins with perfect play. Documented above,
   mitigated across a match, not solved — and not solvable, per Section 5.
3. **The search does no symmetry reduction.** The 3×3 board has eight symmetries,
   so roughly eight times more positions are visited than strictly necessary. It
   runs in about 300ms, so this was not worth fixing, but the position counts
   above are of raw reachable states, not equivalence classes.
4. **`decaySelection: 'newest'` and `swapRule: true` are reachable only by editing
   the config.** Both are implemented and tested; neither has a UI control.
5. **`burnOnDecay: false` produces a game that never ends.** That is deliberate —
   it is the negative control — but it does mean the config object contains a
   setting that breaks the headline guarantee. It is commented as such in
   `js/config.js`.
6. **Undo does not cross a game boundary.** Starting a new game clears the
   history. Within a game it rolls back the score correctly.
7. **No keyboard navigation of the grid, and no AI opponent.** Both are explicitly
   unscored by the brief, so neither was built.
8. **The 3×3 proof runs on the main thread** and takes roughly a second and a half
   in total across all configurations. Long enough to notice, short enough not to
   warrant a worker.

## 8. Time

Roughly 35 minutes of active work to this point, well inside the three-hour box.
The commit timestamps in `git log` and the session file in `transcript/` show the
real shape of it: about twenty minutes reading the brief and settling the rules
before any code, then implementation. No overrun to report.

The one genuine wrong turn is in the record rather than hidden: the swap rule was
designed in, implemented, tested, and then removed once the exhaustive search
showed it counterproductive. An earlier run of the search also reported the wrong
perfect-play winner, because the swap move looked to the search like a position
repeating; that bug and its fix are both in the history.
