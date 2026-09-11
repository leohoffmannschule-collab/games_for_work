/**
 * Wortjagd – fuenf Buchstaben, sechs Versuche.
 *
 * Gruen heisst richtiger Buchstabe an richtiger Stelle, Gelb richtiger
 * Buchstabe an falscher Stelle. Doppelte Buchstaben werden korrekt gezaehlt:
 * jede Kachel verbraucht genau ein Vorkommen im Loesungswort.
 */

import { WOERTER, WORT_SET } from './woerter.js';

const ROWS = 6;
const LEN = 5;
const FLIP_STEP = 220;
const FLIP_DELAY = 260;

const KEYBOARD = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK'],
];

const RANK = { miss: 0, near: 1, hit: 2 };

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" data-act="new">Neues Wort</button>
      <button class="btn" data-act="give-up">Aufgeben</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Gelöst</div><div class="v" data-out="wins">0</div></div>
      <div class="stat"><div class="k">Partien</div><div class="v" data-out="plays">0</div></div>
      <div class="stat"><div class="k">Serie</div><div class="v" data-out="streak">0</div></div>
    </div>
    <div class="panel wort-panel">
      <div class="wort-board" id="board"></div>
      <div class="msg" id="msg"></div>
      <div class="wort-keys" id="keys">
        ${KEYBOARD.map(
          (row) =>
            `<div class="kr">${row
              .map((k) => {
                const wide = k === 'ENTER' || k === 'BACK';
                const label = k === 'ENTER' ? 'Raten' : k === 'BACK' ? '⌫' : k;
                return `<button type="button" data-key="${k}"${wide ? ' class="wide"' : ''}>${label}</button>`;
              })
              .join('')}</div>`,
        ).join('')}
      </div>
    </div>
    <div class="keyhint">
      Tippen oder die Tastatur benutzen · <kbd>Enter</kbd> rät das Wort · <kbd>Rücktaste</kbd> löscht.
      Es zählen nur Wörter aus der eingebauten Liste (${WOERTER.length} Stück).
    </div>`;

  const boardEl = ctx.root.querySelector('#board');
  const keysEl = ctx.root.querySelector('#keys');
  const msgEl = ctx.root.querySelector('#msg');
  const out = {
    wins: ctx.root.querySelector('[data-out="wins"]'),
    plays: ctx.root.querySelector('[data-out="plays"]'),
    streak: ctx.root.querySelector('[data-out="streak"]'),
  };

  // Feste Gitterstruktur – die Zellen werden nur noch beschriftet.
  const rowEls = [];
  const cellEls = [];
  for (let r = 0; r < ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'wort-row';
    const cells = [];
    for (let c = 0; c < LEN; c++) {
      const cell = document.createElement('div');
      cell.className = 'wort-cell';
      row.appendChild(cell);
      cells.push(cell);
    }
    boardEl.appendChild(row);
    rowEls.push(row);
    cellEls.push(cells);
  }

  let target = '';
  let guesses = [];
  let current = '';
  let locked = false;
  let finished = false;

  /* ----------------------------------------------------------- Bewerten -- */

  function score(guess, word) {
    const result = Array(LEN).fill('miss');
    const left = new Map();
    for (let i = 0; i < LEN; i++) {
      if (guess[i] === word[i]) result[i] = 'hit';
      else left.set(word[i], (left.get(word[i]) || 0) + 1);
    }
    for (let i = 0; i < LEN; i++) {
      if (result[i] === 'hit') continue;
      const n = left.get(guess[i]) || 0;
      if (n > 0) {
        result[i] = 'near';
        left.set(guess[i], n - 1);
      }
    }
    return result;
  }

  /* ----------------------------------------------------------- Zeichnen -- */

  function paintCurrent() {
    const row = cellEls[guesses.length];
    if (!row) return;
    for (let c = 0; c < LEN; c++) {
      const ch = current[c] || '';
      if (row[c].textContent !== ch) {
        row[c].textContent = ch;
        row[c].classList.toggle('filled', !!ch);
      }
    }
  }

  function paintKey(letter, state) {
    const btn = keysEl.querySelector(`[data-key="${letter}"]`);
    if (!btn) return;
    const now = ['miss', 'near', 'hit'].find((s) => btn.classList.contains(s));
    if (now && RANK[now] >= RANK[state]) return;
    btn.classList.remove('miss', 'near', 'hit');
    btn.classList.add(state);
  }

  function paintStats() {
    const s = ctx.store.stats('wortjagd');
    out.wins.textContent = s.wins;
    out.plays.textContent = s.plays;
    out.streak.textContent = ctx.store.get('wortjagd:streak', 0);
  }

  function say(text, kind = '') {
    msgEl.textContent = text;
    msgEl.className = 'msg ' + kind;
  }

  /* -------------------------------------------------------------- Zuege -- */

  function submit() {
    if (locked || finished) return;
    if (current.length < LEN) return shake('Noch nicht genug Buchstaben.');
    if (!WORT_SET.has(current)) return shake('Dieses Wort kenne ich nicht.');

    const guess = current;
    const result = score(guess, target);
    const rowIndex = guesses.length;
    guesses.push(guess);
    current = '';
    locked = true;

    const cells = cellEls[rowIndex];
    for (let c = 0; c < LEN; c++) {
      const cell = cells[c];
      cell.style.animationDelay = c * FLIP_STEP + 'ms';
      cell.classList.add('flip');
      setTimeout(
        () => {
          cell.classList.remove('filled');
          cell.classList.add(result[c]);
          paintKey(guess[c], result[c]);
        },
        c * FLIP_STEP + FLIP_DELAY,
      );
    }

    setTimeout(
      () => {
        locked = false;
        if (guess === target) win();
        else if (guesses.length >= ROWS) lose();
      },
      (LEN - 1) * FLIP_STEP + FLIP_DELAY + 240,
    );
  }

  function shake(text) {
    const row = rowEls[guesses.length];
    if (row) {
      row.classList.remove('shake');
      void row.offsetWidth;
      row.classList.add('shake');
    }
    say(text, 'bad');
  }

  function win() {
    finished = true;
    ctx.store.score('wortjagd', 'versuche', guesses.length, { lowerIsBetter: true, won: true });
    const streak = ctx.store.get('wortjagd:streak', 0) + 1;
    ctx.store.set('wortjagd:streak', streak);
    const praise = [
      'Wahnsinn!',
      'Stark.',
      'Sauber.',
      'Gut gemacht.',
      'Knapp, aber gut.',
      'Gerade noch!',
    ];
    say(
      `${praise[guesses.length - 1]} ${guesses.length} ${guesses.length === 1 ? 'Versuch' : 'Versuche'}.`,
      'good',
    );
    paintStats();
  }

  function lose() {
    finished = true;
    ctx.store.set('wortjagd:streak', 0);
    say(`Das Wort war „${target}“.`, 'bad');
    paintStats();
  }

  function giveUp() {
    if (finished) return;
    finished = true;
    locked = false;
    ctx.store.set('wortjagd:streak', 0);
    say(`Das Wort war „${target}“.`, 'bad');
    paintStats();
  }

  /* ---------------------------------------------------------- Neues Wort -- */

  function reset() {
    // Die zuletzt gespielten Woerter kurz meiden, damit sich nichts wiederholt.
    const recent = ctx.store.get('wortjagd:recent', []);
    const pool = WOERTER.filter((w) => !recent.includes(w));
    target = (pool.length ? pool : WOERTER)[
      Math.floor(Math.random() * (pool.length || WOERTER.length))
    ];
    ctx.store.set('wortjagd:recent', [target, ...recent].slice(0, 40));

    guesses = [];
    current = '';
    locked = false;
    finished = false;

    for (const row of rowEls) row.classList.remove('shake');
    for (const cells of cellEls) {
      for (const cell of cells) {
        cell.className = 'wort-cell';
        cell.textContent = '';
        cell.style.animationDelay = '';
      }
    }
    for (const btn of keysEl.querySelectorAll('button'))
      btn.classList.remove('hit', 'near', 'miss');

    say('');
    ctx.store.play('wortjagd');
    paintStats();
  }

  /* ----------------------------------------------------------- Steuerung -- */

  function type(letter) {
    if (locked || finished || current.length >= LEN) return;
    current += letter;
    say('');
    paintCurrent();
  }

  function backspace() {
    if (locked || finished || !current.length) return;
    current = current.slice(0, -1);
    say('');
    paintCurrent();
  }

  ctx.on(keysEl, 'click', (e) => {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    const key = btn.dataset.key;
    if (key === 'ENTER') submit();
    else if (key === 'BACK') backspace();
    else type(key);
  });

  ctx.on(window, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      return submit();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      return backspace();
    }
    const ch = e.key.toUpperCase();
    if (ch.length === 1 && /[A-ZÄÖÜ]/.test(ch)) {
      e.preventDefault();
      type(ch);
    }
  });

  ctx.on(ctx.root.querySelector('[data-act="new"]'), 'click', reset);
  ctx.on(ctx.root.querySelector('[data-act="give-up"]'), 'click', giveUp);

  reset();
}
