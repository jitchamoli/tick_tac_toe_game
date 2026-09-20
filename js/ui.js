/**
 * Rendering and DOM events. No rule logic lives here — the view reads engine
 * state and reports clicks, so a change to the rules never means editing this
 * file.
 */

import { nextToDecay, canSwap, emptyCells } from './engine.js';

const MARK_NAMES = { X: 'X', O: 'O' };

export function renderBoard(state, boardEl, onCellClick) {
  const { size } = state.rules;
  boardEl.style.setProperty('--size', size);
  boardEl.textContent = '';

  const decaying = state.status.over ? null : nextToDecay(state);
  const winningLine = state.status.line ?? [];

  for (let cell = 0; cell < state.board.length; cell += 1) {
    const mark = state.board[cell];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.cell = String(cell);
    button.setAttribute('role', 'gridcell');

    if (state.burned[cell]) {
      button.classList.add('burned');
      button.disabled = true;
      button.setAttribute('aria-label', `cell ${cell + 1}, burned`);
    } else if (mark) {
      button.classList.add('mark', mark === 'X' ? 'mark-x' : 'mark-o');
      button.textContent = MARK_NAMES[mark];
      button.disabled = true;
      let label = `cell ${cell + 1}, ${mark}`;
      if (cell === decaying) {
        button.classList.add('decaying');
        label += `, decays on ${state.turn}'s next turn`;
      }
      button.setAttribute('aria-label', label);
    } else {
      button.disabled = state.status.over;
      button.setAttribute('aria-label', `cell ${cell + 1}, empty`);
      button.addEventListener('click', () => onCellClick(cell));
    }

    if (winningLine.includes(cell)) button.classList.add('winning');
    boardEl.append(button);
  }
}

export function renderStatus(state, statusEl) {
  if (state.status.over) {
    const { winner, loser, reason } = state.status;
    statusEl.className = 'status over';
    statusEl.textContent = reason === 'line'
      ? `${winner} wins with three in a row.`
      : `${winner} wins — ${loser} has nowhere left to place.`;
    return;
  }

  const decaying = nextToDecay(state);
  const left = emptyCells(state).length;
  const parts = [`${state.turn} to play.`];
  if (decaying !== null) {
    parts.push(`Placing will burn ${state.turn}'s mark on cell ${decaying + 1}.`);
  } else {
    const held = state.marks[state.turn].length;
    parts.push(`${state.rules.maxMarks - held} free placement${held === state.rules.maxMarks - 1 ? '' : 's'} left before marks start decaying.`);
  }
  parts.push(`${left} cell${left === 1 ? '' : 's'} still open.`);

  statusEl.className = 'status';
  statusEl.textContent = parts.join(' ');
}

export function renderLog(history, logEl) {
  logEl.textContent = '';
  for (const state of history) {
    const move = state.lastMove;
    if (!move) continue;

    const item = document.createElement('li');
    if (move.type === 'swap') {
      item.textContent = 'Sides swapped.';
    } else {
      const bits = [`${move.player} → cell ${move.cell + 1}`];
      if (move.decayed !== null && move.decayed !== undefined) {
        bits.push(move.burned !== null ? `cell ${move.decayed + 1} decayed and burned` : `cell ${move.decayed + 1} decayed`);
      }
      item.textContent = bits.join(', ');
    }
    if (state.status.over) {
      item.classList.add('decisive');
      item.textContent += state.status.reason === 'line' ? ' — three in a row' : ' — no cell left to play';
    }
    logEl.append(item);
  }
  logEl.scrollTop = logEl.scrollHeight;
}

export function renderScore(score, state, scoreEl) {
  const played = score.X + score.O;
  scoreEl.textContent =
    `X ${score.X} — ${score.O} O  ·  game ${played + (state.status.over ? 0 : 1)}, ` +
    `${state.rules.firstPlayer} started`;
}

export function renderSwap(state, swapEl) {
  swapEl.hidden = !canSwap(state);
}
