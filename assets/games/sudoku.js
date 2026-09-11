/**
 * Sudoku mit eigenem Generator.
 *
 * Erzeugt wird zuerst ein vollstaendig geloestes Gitter, danach werden
 * symmetrische Paare entfernt, solange die Loesung eindeutig bleibt. Dadurch
 * ist jedes Raetsel logisch loesbar – Raten ist nie noetig.
 */

const LEVELS = {
  leicht: { label: 'Leicht', givens: 46 },
  mittel: { label: 'Mittel', givens: 34 },
  schwer: { label: 'Schwer', givens: 27 },
};

/* ------------------------------------------------------------- Solver -- */

const ROW = (i) => (i / 9) | 0;
const COL = (i) => i % 9;
const BOX = (i) => ((i / 27) | 0) * 3 + (((i % 9) / 3) | 0);

const PEERS = (() => {
  const list = [];
  for (let i = 0; i < 81; i++) {
    const set = [];
    for (let j = 0; j < 81; j++) {
      if (j !== i && (ROW(j) === ROW(i) || COL(j) === COL(i) || BOX(j) === BOX(i))) set.push(j);
    }
    list.push(set);
  }
  return list;
})();

function candidateMask(board, i) {
  let used = 0;
  for (const p of PEERS[i]) used |= 1 << board[p];
  return ~used & 0b1111111110;
}

function popcount(n) {
  let c = 0;
  while (n) {
    n &= n - 1;
    c++;
  }
  return c;
}

/** Zaehlt Loesungen, bricht bei `limit` ab (2 reicht fuer "eindeutig?"). */
function countSolutions(board, limit) {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (board[i]) continue;
    const mask = candidateMask(board, i);
    const n = popcount(mask);
    if (n === 0) return 0;
    if (n < bestCount) {
      bestCount = n;
      best = i;
      bestMask = mask;
      if (n === 1) break;
    }
  }
  if (best === -1) return 1;

  let total = 0;
  for (let d = 1; d <= 9; d++) {
    if (!(bestMask & (1 << d))) continue;
    board[best] = d;
    total += countSolutions(board, limit - total);
    board[best] = 0;
    if (total >= limit) break;
  }
  return total;
}

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillBoard(board) {
  let best = -1;
  let bestMask = 0;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (board[i]) continue;
    const mask = candidateMask(board, i);
    const n = popcount(mask);
    if (n === 0) return false;
    if (n < bestCount) {
      bestCount = n;
      best = i;
      bestMask = mask;
    }
  }
  if (best === -1) return true;

  const digits = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
  for (const d of shuffled(digits)) {
    board[best] = d;
    if (fillBoard(board)) return true;
    board[best] = 0;
  }
  board[best] = 0;
  return false;
}

function generate(level) {
  const solution = new Uint8Array(81);
  fillBoard(solution);

  const puzzle = Uint8Array.from(solution);
  const target = LEVELS[level].givens;
  let givens = 81;

  // Mehrere Durchlaeufe, weil eine Stelle spaeter entfernbar sein kann.
  for (let pass = 0; pass < 3 && givens > target; pass++) {
    for (const i of shuffled([...Array(81).keys()])) {
      if (givens <= target) break;
      const mirror = 80 - i;
      if (!puzzle[i]) continue;
      const a = puzzle[i];
      const b = puzzle[mirror];
      puzzle[i] = 0;
      puzzle[mirror] = 0;
      const removed = mirror === i ? 1 : 2;
      if (countSolutions(Uint8Array.from(puzzle), 2) === 1) {
        givens -= removed;
      } else {
        puzzle[i] = a;
        puzzle[mirror] = b;
      }
    }
  }
  return { puzzle, solution };
}

/* ---------------------------------------------------------------- Spiel -- */

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <div class="seg" id="levels">
        ${Object.entries(LEVELS)
          .map(([key, l]) => `<button type="button" data-level="${key}">${l.label}</button>`)
          .join('')}
      </div>
      <button class="btn primary" data-act="new">Neues Rätsel</button>
      <button class="btn" data-act="undo" disabled>Rückgängig</button>
      <button class="btn" data-act="check">Prüfen</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Zeit</div><div class="v" data-out="time">0:00</div></div>
      <div class="stat"><div class="k">Bestzeit</div><div class="v" data-out="best">–</div></div>
      <div class="stat"><div class="k">Offen</div><div class="v" data-out="left">0</div></div>
    </div>
    <div class="sudoku-area">
      <div class="sudoku" id="grid"></div>
      <div style="display:grid;gap:10px;width:min(408px,100%)">
        <div class="sud-pad" id="pad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button type="button" data-digit="${d}">${d}</button>`).join('')}
          <button type="button" data-digit="0" title="Feld leeren">⌫</button>
          <button type="button" class="wide3" data-act="notes" aria-pressed="false">Notizen aus</button>
          <button type="button" class="wide" data-act="hint">Tipp</button>
        </div>
      </div>
    </div>
    <div class="msg" id="msg"></div>
    <div class="keyhint">
      Zahl über die Tastatur oder das Feld rechts eingeben · <kbd>N</kbd> schaltet Notizen um ·
      Pfeiltasten bewegen die Auswahl · <kbd>Rücktaste</kbd> löscht.
    </div>`;

  const gridEl = ctx.root.querySelector('#grid');
  const padEl = ctx.root.querySelector('#pad');
  const msgEl = ctx.root.querySelector('#msg');
  const notesBtn = ctx.root.querySelector('[data-act="notes"]');
  const undoBtn = ctx.root.querySelector('[data-act="undo"]');
  const out = {
    time: ctx.root.querySelector('[data-out="time"]'),
    best: ctx.root.querySelector('[data-out="best"]'),
    left: ctx.root.querySelector('[data-out="left"]'),
  };

  let level = ctx.store.get('sudoku:level', 'leicht');
  if (!LEVELS[level]) level = 'leicht';

  let puzzle,
    solution,
    values,
    notes,
    selected = 40;
  let notesMode = false,
    seconds = 0,
    timer = null,
    done = false,
    history = [];

  const cells = [];
  for (let i = 0; i < 81; i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sud-cell';
    if (COL(i) % 3 === 2 && COL(i) !== 8) btn.classList.add('br');
    if (ROW(i) % 3 === 2 && ROW(i) !== 8) btn.classList.add('bb');
    btn.dataset.i = i;
    cells.push(btn);
    gridEl.appendChild(btn);
  }

  /* ----------------------------------------------------------- Zeichnen -- */

  function paint() {
    const selValue = values[selected];
    let left = 0;

    for (let i = 0; i < 81; i++) {
      const el = cells[i];
      const value = values[i];
      const fixed = puzzle[i] !== 0;
      if (!value) left++;

      el.classList.toggle('fixed', fixed);
      el.classList.toggle('sel', i === selected);
      el.classList.toggle('peer', i !== selected && PEERS[selected].includes(i));
      el.classList.toggle('same', !!value && value === selValue && i !== selected);

      let bad = false;
      if (value && !fixed) {
        for (const p of PEERS[i]) {
          if (values[p] === value) {
            bad = true;
            break;
          }
        }
      }
      el.classList.toggle('err', bad);

      if (value) {
        el.textContent = value;
      } else if (notes[i]) {
        const marks = [];
        for (let d = 1; d <= 9; d++) marks.push(`<span>${notes[i] & (1 << d) ? d : ''}</span>`);
        el.innerHTML = `<div class="sud-notes">${marks.join('')}</div>`;
      } else {
        el.textContent = '';
      }
    }

    out.left.textContent = left;

    // Ziffern ausgrauen, die schon neunmal im Gitter stehen.
    for (const btn of padEl.querySelectorAll('[data-digit]')) {
      const d = Number(btn.dataset.digit);
      if (!d) continue;
      let n = 0;
      for (let i = 0; i < 81; i++) if (values[i] === d) n++;
      btn.classList.toggle('done', n >= 9);
    }
  }

  /* ------------------------------------------------------------- Eingabe -- */

  function pushHistory() {
    history.push({
      values: Uint8Array.from(values),
      notes: Uint16Array.from(notes),
    });
    if (history.length > 120) history.shift();
    undoBtn.disabled = false;
  }

  function undo() {
    if (!history.length) return;
    const prev = history.pop();
    values = prev.values;
    notes = prev.notes;
    undoBtn.disabled = history.length === 0;
    done = false;
    msgEl.textContent = '';
    msgEl.className = 'msg';
    paint();
  }

  function input(digit) {
    if (done || puzzle[selected]) return;
    pushHistory();

    if (digit === 0) {
      values[selected] = 0;
      notes[selected] = 0;
    } else if (notesMode) {
      if (values[selected]) values[selected] = 0;
      notes[selected] ^= 1 << digit;
    } else if (values[selected] === digit) {
      values[selected] = 0;
    } else {
      values[selected] = digit;
      notes[selected] = 0;
      // Die gesetzte Ziffer aus den Notizen der Nachbarfelder streichen.
      for (const p of PEERS[selected]) notes[p] &= ~(1 << digit);
    }

    paint();
    checkDone();
  }

  function hint() {
    if (done) return;
    const open = [];
    for (let i = 0; i < 81; i++) if (values[i] !== solution[i]) open.push(i);
    if (!open.length) return;
    pushHistory();
    const i = open[Math.floor(Math.random() * open.length)];
    values[i] = solution[i];
    notes[i] = 0;
    for (const p of PEERS[i]) notes[p] &= ~(1 << solution[i]);
    selected = i;
    msgEl.textContent = 'Ein Feld wurde aufgelöst.';
    msgEl.className = 'msg';
    paint();
    checkDone();
  }

  function check() {
    let wrong = 0;
    for (let i = 0; i < 81; i++) if (values[i] && values[i] !== solution[i]) wrong++;
    msgEl.textContent = wrong
      ? `${wrong} ${wrong === 1 ? 'Zahl passt' : 'Zahlen passen'} nicht zur Lösung.`
      : 'Bis hierhin stimmt alles.';
    msgEl.className = 'msg ' + (wrong ? 'bad' : 'good');
  }

  function checkDone() {
    for (let i = 0; i < 81; i++) if (values[i] !== solution[i]) return;
    done = true;
    stopTimer();
    const record = ctx.store.score('sudoku', level, seconds, {
      lowerIsBetter: true,
      won: true,
    });
    msgEl.textContent = record
      ? `Gelöst in ${ctx.formatTime(seconds)} – neue Bestzeit!`
      : `Gelöst in ${ctx.formatTime(seconds)}.`;
    msgEl.className = 'msg good';
    paintBest();
  }

  /* --------------------------------------------------------------- Zeit -- */

  function paintBest() {
    const best = ctx.store.best('sudoku', level);
    out.best.textContent = best ? ctx.formatTime(best) : '–';
  }

  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      seconds++;
      out.time.textContent = ctx.formatTime(seconds);
    }, 1000);
  }

  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }
  ctx.onDestroy(stopTimer);

  /* ---------------------------------------------------------- Neues Spiel -- */

  function newPuzzle() {
    msgEl.textContent = 'Rätsel wird erzeugt …';
    msgEl.className = 'msg';
    // Kurz auf den Frame warten, damit der Hinweis sichtbar wird.
    requestAnimationFrame(() => {
      const made = generate(level);
      puzzle = made.puzzle;
      solution = made.solution;
      values = Uint8Array.from(puzzle);
      notes = new Uint16Array(81);
      history = [];
      undoBtn.disabled = true;
      selected = values.indexOf(0) >= 0 ? values.indexOf(0) : 40;
      done = false;
      seconds = 0;
      out.time.textContent = '0:00';
      msgEl.textContent = '';
      paintBest();
      paint();
      startTimer();
      ctx.store.play('sudoku');
    });
  }

  /* ----------------------------------------------------------- Steuerung -- */

  ctx.on(gridEl, 'click', (e) => {
    const el = e.target.closest('.sud-cell');
    if (!el) return;
    selected = Number(el.dataset.i);
    paint();
  });

  ctx.on(padEl, 'click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.digit !== undefined) return input(Number(btn.dataset.digit));
    if (btn.dataset.act === 'notes') return toggleNotes();
    if (btn.dataset.act === 'hint') return hint();
    if (btn.dataset.act === 'check') return check();
  });

  function toggleNotes() {
    notesMode = !notesMode;
    notesBtn.textContent = notesMode ? 'Notizen an' : 'Notizen aus';
    notesBtn.setAttribute('aria-pressed', String(notesMode));
    notesBtn.classList.toggle('on', notesMode);
  }

  ctx.on(window, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key;
    if (key >= '1' && key <= '9') {
      e.preventDefault();
      return input(Number(key));
    }
    if (key === 'Backspace' || key === 'Delete' || key === '0') {
      e.preventDefault();
      return input(0);
    }
    if (key.toLowerCase() === 'n') {
      e.preventDefault();
      return toggleNotes();
    }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 }[key];
    if (step) {
      e.preventDefault();
      const next = selected + step;
      if (next >= 0 && next < 81 && !(Math.abs(step) === 1 && ROW(next) !== ROW(selected))) {
        selected = next;
        paint();
      }
    }
  });

  ctx.on(ctx.root.querySelector('#levels'), 'click', (e) => {
    const btn = e.target.closest('[data-level]');
    if (!btn) return;
    level = btn.dataset.level;
    ctx.store.set('sudoku:level', level);
    for (const b of ctx.root.querySelectorAll('[data-level]')) {
      b.setAttribute('aria-pressed', String(b === btn));
    }
    newPuzzle();
  });

  ctx.on(ctx.root.querySelector('[data-act="new"]'), 'click', newPuzzle);
  ctx.on(undoBtn, 'click', undo);

  for (const b of ctx.root.querySelectorAll('[data-level]')) {
    b.setAttribute('aria-pressed', String(b.dataset.level === level));
  }
  newPuzzle();
}
