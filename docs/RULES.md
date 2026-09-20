# Decay Tic-Tac-Toe — how to play

Ordinary tic-tac-toe has a problem: two careful players always draw. This version
fixes that. **Every game ends with a winner.** Nobody ever shakes hands on a tie.

You can play it on paper, on a whiteboard, or in the browser version that comes
with these rules. Everything you need to know is on this page.

---

## What you need

- Two players. One is **X**, the other is **O**.
- A 3×3 grid — nine squares, like normal tic-tac-toe.
- Something to mark squares with, and a way to cross a square out permanently.

On paper it helps to **number your marks as you write them** — your first X, your
second X, your third X. You will need to know which of your marks is the oldest.

Squares are numbered 1 to 9 like this, left to right, top to bottom:

```
 1 | 2 | 3
---+---+---
 4 | 5 | 6
---+---+---
 7 | 8 | 9
```

---

## The idea in two sentences

You can only ever have **three marks on the board at once**. Once you have three,
every new mark you place costs you your oldest one — and the square it was sitting
on is **burned out**, so nobody can ever use it again.

---

## Taking a turn

X goes first. Then players alternate, all the way to the end.

### Your first three turns

Write your mark in any empty square. That is the whole turn. It is exactly
ordinary tic-tac-toe.

After six turns — three each — the board holds three X's and three O's, and
three squares are still empty.

### Your fourth turn, and every turn after that

You already have three marks, and three is your limit. So your turn now has two
parts, in this order:

1. **Your oldest mark decays.** Rub out the mark you placed longest ago, and
   **burn that square** — cross it right out. It is dead ground from now on.
   Neither player may ever mark it again.
2. **Then place your new mark** in any square that is still empty.

You do not get to choose which of your marks decays. It is always the oldest one.
You do not get to skip the decay, or skip your turn.

> **Careful:** the decay happens *before* you place. If your oldest mark is part of
> a row you were hoping to complete, it disappears before your new mark lands —
> and the row does not count. Take a winning square when you see it, because your
> own marks will not wait for you.

---

## Burned squares

A burned square is permanently out of play. It is not empty, it is not owned by
anybody, and neither player can mark it for the rest of the game. Cross it out
clearly — a big X through the whole square, or shade it in — so it is never
mistaken for an empty one.

Burned squares are what make the board shrink, and a shrinking board is what
brings the game to an end.

---

## The two ways to win

**1. Three in a row.** The moment your three marks sit in a line — across, down,
or diagonally — you have won and the game stops immediately. This is the ordinary
tic-tac-toe win, and it is the same eight lines you already know.

**2. Your opponent has nowhere to go.** If it is someone's turn and there is no
empty square left to place in, **that player loses** and their opponent wins.
They cannot pass, so they are simply out of moves, and out of the game.

---

## Why there can never be a draw

Look at what happens to the empty squares. There are nine at the start, and
**every single turn uses one up**:

- On your first three turns you write in an empty square. One fewer empty square.
- On every turn after that, your oldest mark decays and that square burns — a
  burned square was never empty, so nothing is given back — and then you write in
  an empty square. Again, one fewer empty square.

So the count of empty squares only ever goes down, by exactly one a turn: nine,
eight, seven, and so on. After the ninth turn there are none left at all.

That means the game cannot run past the tenth turn, and it cannot stop anywhere
in between without a result. Either somebody has made three in a row, or somebody
has run out of squares and lost. There is no third outcome. **A draw is not a
possible ending.**

---

## A worked game

Here is a complete game. `#` marks a burned square.

**Turns 1 to 6 — everybody just places.** X takes 5, O takes 1, X takes 3,
O takes 7, X takes 8, O takes 2:

```
 O | O | X
---+---+---
 . | X | .
---+---+---
 O | X | .
```

**Turn 7 — X is at the limit.** X's oldest mark is the 5 from turn 1. It decays,
square 5 burns, and X places on 6:

```
 O | O | X
---+---+---
 . | # | X
---+---+---
 O | X | .
```

**Turn 8 — O is at the limit.** O's oldest mark is the 1 from turn 2. It decays,
square 1 burns, and O places on 4:

```
 # | O | X
---+---+---
 O | # | X
---+---+---
 O | X | .
```

**Turn 9 — X again.** X's oldest surviving mark is the 3 from turn 3. It decays,
square 3 burns, and X places on 9:

```
 # | O | #
---+---+---
 O | # | X
---+---+---
 O | X | X
```

**Turn 10 — O has nowhere to go.** Every square is either marked or burned. O
cannot place, so **O loses and X wins**.

---

## Quick reference

- 3×3 grid. X first, then alternate.
- Hold at most **three marks** each.
- **Turns 1–3 (each player):** just place a mark.
- **Turn 4 onward:** your **oldest mark decays** and its square **burns**, then you
  place your new mark.
- Burned squares are dead for both players, forever.
- **Win** by three in a row, or when your opponent has no empty square to place in.
- The game is over by the tenth turn. There are no draws.

---

## A note on fairness

If both players play perfectly, the player who goes first wins. That is not an
accident of these particular rules — in any game that cannot be drawn, one side
always has a winning strategy. So play a **match, not a single game**, and take
turns going first. The browser version alternates the starting player for you and
keeps the score.
