/**
 * Minensucher.
 *
 * Die Minen werden erst nach dem ersten Klick verteilt – das Startfeld und
 * seine Nachbarn bleiben frei, damit keine Partie sofort vorbei ist.
 */

const LEVELS = {
  leicht: { cols: 9, rows: 9, mines: 10, label: 'Leicht' },
  mittel: { cols: 16, rows: 16, mines: 40, label: 'Mittel' },
  schwer: { cols: 30, rows: 16, mines: 99, label: 'Schwer' },
};

const HIDDEN = 0;
const OPEN = 1;
const FLAG = 2;

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <div class="seg" id="levels">
        ${Object.entries(LEVELS)
          .map(
            ([key, l], i) =>
              `<button type="button" data-level="${key}" aria-pressed="${i === 0}">${l.label}</button>`,
          )
          .join('')}
      </div>
      <button class="btn primary" data-act="new">Neues Feld</button>
      <button class="btn" data-act="flagmode" aria-pressed="false">🚩 Flaggen-Modus</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Minen übrig</div><div class="v" data-out="mines">0</div></div>
      <div class="stat"><div class="k">Zeit</div><div class="v" data-out="time">0:00</div></div>
      <div class="stat"><div class="k">Bestzeit</div><div class="v" data-out="best">–</div></div>
    </div>
    <div class="minen-scroll"><div class="minen" id="grid"></div></div>
    <div class="msg" id="msg"></div>
    <div class="keyhint">
      Linksklick deckt auf, Rechtsklick setzt eine Flagge (am Handy: lange tippen oder den
      Flaggen-Modus einschalten). Ein Klick auf eine aufgedeckte Zahl deckt alle Nachbarn auf,
      sobald genug Flaggen gesetzt sind.
    </div>`;

  const gridEl = ctx.root.querySelector('#grid');
  const msgEl = ctx.root.querySelector('#msg');
  const out = {
    mines: ctx.root.querySelector('[data-out="mines"]'),
    time: ctx.root.querySelector('[data-out="time"]'),
    best: ctx.root.querySelector('[data-out="best"]'),
  };
  const flagBtn = ctx.root.querySelector('[data-act="flagmode"]');

  let level = ctx.store.get('minen:level', 'leicht');
  if (!LEVELS[level]) level = 'leicht';
  let cols, rows, mineCount, mine, count, state, cells;
  let started,
    finished,
    opened,
    flags,
    seconds,
    timer,
    flagMode = false;

  const idx = (r, c) => r * cols + c;

  function* neighbours(r, c) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) yield [nr, nc];
      }
    }
  }

  /* ------------------------------------------------------------- Aufbau -- */

  function build() {
    const cfg = LEVELS[level];
    cols = cfg.cols;
    rows = cfg.rows;
    mineCount = cfg.mines;

    mine = new Uint8Array(cols * rows);
    count = new Uint8Array(cols * rows);
    state = new Uint8Array(cols * rows);
    started = false;
    finished = false;
    opened = 0;
    flags = 0;
    seconds = 0;
    stopTimer();

    gridEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    gridEl.innerHTML = '';
    cells = [];
    const frag = document.createDocumentFragment();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'mine-cell';
        btn.dataset.r = r;
        btn.dataset.c = c;
        btn.setAttribute('aria-label', `Feld ${r + 1}, ${c + 1}`);
        cells.push(btn);
        frag.appendChild(btn);
      }
    }
    gridEl.appendChild(frag);

    msgEl.textContent = '';
    msgEl.className = 'msg';
    paintCounters();
    ctx.store.play('minen');
  }

  /** Minen verteilen, sobald klar ist, wo der erste Klick lag. */
  function seed(safeR, safeC) {
    const forbidden = new Set([idx(safeR, safeC)]);
    for (const [r, c] of neighbours(safeR, safeC)) forbidden.add(idx(r, c));

    const pool = [];
    for (let i = 0; i < mine.length; i++) if (!forbidden.has(i)) pool.push(i);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let i = 0; i < mineCount && i < pool.length; i++) mine[pool[i]] = 1;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0;
        for (const [nr, nc] of neighbours(r, c)) n += mine[idx(nr, nc)];
        count[idx(r, c)] = n;
      }
    }
  }

  /* ------------------------------------------------------------- Zuege -- */

  function reveal(r, c) {
    const stack = [[r, c]];
    while (stack.length) {
      const [cr, cc] = stack.pop();
      const i = idx(cr, cc);
      if (state[i] !== HIDDEN) continue;
      state[i] = OPEN;
      opened++;
      const el = cells[i];
      el.classList.add('open');
      if (mine[i]) {
        el.classList.add('boom');
        el.textContent = '💣';
        return lose(i);
      }
      if (count[i]) {
        el.textContent = count[i];
        el.classList.add('n' + count[i]);
      } else {
        for (const [nr, nc] of neighbours(cr, cc)) stack.push([nr, nc]);
      }
    }
    checkWin();
  }

  function toggleFlag(r, c) {
    const i = idx(r, c);
    if (state[i] === OPEN) return;
    if (state[i] === FLAG) {
      state[i] = HIDDEN;
      flags--;
      cells[i].textContent = '';
    } else {
      state[i] = FLAG;
      flags++;
      cells[i].textContent = '🚩';
    }
    paintCounters();
  }

  /** Aufgedeckte Zahl anklicken: Nachbarn öffnen, wenn die Flaggen passen. */
  function chord(r, c) {
    const i = idx(r, c);
    if (state[i] !== OPEN || !count[i]) return;
    let flagged = 0;
    for (const [nr, nc] of neighbours(r, c)) if (state[idx(nr, nc)] === FLAG) flagged++;
    if (flagged !== count[i]) return;
    for (const [nr, nc] of neighbours(r, c)) {
      if (state[idx(nr, nc)] === HIDDEN) {
        reveal(nr, nc);
        if (finished) return;
      }
    }
  }

  function lose(boomIndex) {
    finished = true;
    stopTimer();
    for (let i = 0; i < mine.length; i++) {
      if (mine[i] && state[i] !== FLAG && i !== boomIndex) {
        cells[i].classList.add('open');
        cells[i].textContent = '💣';
      } else if (!mine[i] && state[i] === FLAG) {
        cells[i].classList.add('wrong');
        cells[i].textContent = '✕';
      }
    }
    msgEl.textContent = 'Mine erwischt. Neues Feld?';
    msgEl.className = 'msg bad';
  }

  function checkWin() {
    if (finished || opened !== cols * rows - mineCount) return;
    finished = true;
    stopTimer();
    for (let i = 0; i < mine.length; i++) {
      if (mine[i] && state[i] !== FLAG) {
        state[i] = FLAG;
        flags++;
        cells[i].textContent = '🚩';
      }
    }
    paintCounters();
    const record = ctx.store.score('minen', level, seconds, { lowerIsBetter: true, won: true });
    msgEl.textContent = record
      ? `Geschafft in ${ctx.formatTime(seconds)} – neue Bestzeit!`
      : `Geschafft in ${ctx.formatTime(seconds)}.`;
    msgEl.className = 'msg good';
  }

  /* ------------------------------------------------------------ Anzeige -- */

  function paintCounters() {
    out.mines.textContent = Math.max(0, mineCount - flags);
    out.time.textContent = ctx.formatTime(seconds);
    const best = ctx.store.best('minen', level);
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

  /* ---------------------------------------------------------- Steuerung -- */

  function cellFrom(target) {
    const el = target.closest('.mine-cell');
    if (!el) return null;
    return [Number(el.dataset.r), Number(el.dataset.c)];
  }

  function primary(r, c) {
    if (finished) return;
    if (!started) {
      started = true;
      seed(r, c);
      startTimer();
    }
    const i = idx(r, c);
    if (flagMode && state[i] !== OPEN) return toggleFlag(r, c);
    if (state[i] === FLAG) return;
    if (state[i] === OPEN) return chord(r, c);
    reveal(r, c);
  }

  let longPress = null;
  let skipClick = false;

  ctx.on(gridEl, 'pointerdown', (e) => {
    const pos = cellFrom(e.target);
    if (!pos || e.button === 2) return;
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      longPress = setTimeout(() => {
        longPress = null;
        skipClick = true;
        if (!finished) toggleFlag(...pos);
      }, 420);
    }
  });

  const cancelLongPress = () => {
    if (longPress) clearTimeout(longPress);
    longPress = null;
  };
  ctx.on(gridEl, 'pointerup', cancelLongPress);
  ctx.on(gridEl, 'pointercancel', cancelLongPress);
  ctx.on(gridEl, 'pointermove', (e) => {
    if (longPress && (Math.abs(e.movementX) > 4 || Math.abs(e.movementY) > 4)) cancelLongPress();
  });

  ctx.on(gridEl, 'click', (e) => {
    if (skipClick) {
      skipClick = false;
      return;
    }
    const pos = cellFrom(e.target);
    if (pos) primary(...pos);
  });

  ctx.on(gridEl, 'contextmenu', (e) => {
    e.preventDefault();
    const pos = cellFrom(e.target);
    if (pos && !finished) toggleFlag(...pos);
  });

  ctx.on(ctx.root.querySelector('#levels'), 'click', (e) => {
    const btn = e.target.closest('[data-level]');
    if (!btn) return;
    level = btn.dataset.level;
    ctx.store.set('minen:level', level);
    for (const b of ctx.root.querySelectorAll('[data-level]')) {
      b.setAttribute('aria-pressed', String(b === btn));
    }
    build();
  });

  ctx.on(ctx.root.querySelector('[data-act="new"]'), 'click', build);

  ctx.on(flagBtn, 'click', () => {
    flagMode = !flagMode;
    flagBtn.setAttribute('aria-pressed', String(flagMode));
    flagBtn.classList.toggle('on', flagMode);
  });

  for (const b of ctx.root.querySelectorAll('[data-level]')) {
    b.setAttribute('aria-pressed', String(b.dataset.level === level));
  }
  build();
}
