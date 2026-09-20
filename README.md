# Decay Tic-Tac-Toe

A two-player tic-tac-toe variant in which **a game can never end in a draw** and
**play always terminates**. Still 3×3, still X and O, still alternating turns.

## Run it

```sh
python -m http.server 8000
```

Then open:

- <http://localhost:8000/> — the game
- <http://localhost:8000/tests.html> — the unit tests and the exhaustive no-draw /
  termination proof

No build step, no backend, no network calls. Plain HTML, CSS and ES modules.
Tested in current Chrome.

> After editing a file under `js/`, reload with **Cmd/Ctrl + Shift + R**. Chrome
> caches ES modules aggressively, and a normal reload can quietly serve you the
> previous version.

## The rules in one paragraph

You may hold at most three marks. From your fourth turn onward your oldest mark is
removed and the cell it sat on is **burned** — permanently unplayable — before you
place your new mark. Three in a row wins at any moment. If it is your turn and there
is nowhere left to place, you lose. After X's first mark, O may **swap** sides once.

Full rules: [docs/RULES.md](docs/RULES.md). Design and the no-draw argument:
[docs/DESIGN.md](docs/DESIGN.md).
