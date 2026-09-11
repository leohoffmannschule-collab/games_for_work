/**
 * 2048 – Zahlen zusammenschieben.
 *
 * Die Kacheln liegen absolut positioniert uebereinander und werden per
 * transform verschoben; dadurch gleiten sie, statt zu springen. Der Spielstand
 * selbst steckt in `grid` (4x4, enthaelt Kachel-Objekte oder null).
 */

const SIZE = 4;
const START_TILES = 2;
const MOVE_MS = 110;

const COLORS = {
  2: ['#eee4da', '#6d6357'],
  4: ['#ede0c8', '#6d6357'],
  8: ['#f2b179', '#ffffff'],
  16: ['#f59563', '#ffffff'],
  32: ['#f67c5f', '#ffffff'],
  64: ['#f65e3b', '#ffffff'],
  128: ['#edcf72', '#ffffff'],
  256: ['#edcc61', '#ffffff'],
  512: ['#edc850', '#ffffff'],
  1024: ['#edc53f', '#ffffff'],
  2048: ['#edc22e', '#ffffff'],
};
const COLOR_HIGH = ['#3c3a32', '#ffffff'];

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <button class="btn primary" data-act="new">Neues Spiel</button>
      <button class="btn" data-act="undo" disabled>Zug zurück</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Punkte</div><div class="v" data-out="score">0</div></div>
      <div class="stat"><div class="k">Bestwert</div><div class="v" data-out="best">0</div></div>
      <div class="stat"><div class="k">Größte Kachel</div><div class="v" data-out="max">0</div></div>
    </div>
    <div class="board-wrap">
      <div class="g2048" id="board" tabindex="0" aria-label="Spielfeld 2048">
        <div class="cells">${'<i></i>'.repeat(SIZE * SIZE)}</div>
        <div class="tiles" id="tiles"></div>
      </div>
    </div>
    <div class="keyhint">
      <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> oder <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> zum Schieben ·
      am Handy wischen · <kbd>Z</kbd> nimmt einen Zug zurück.
    </div>`;

  const board = ctx.root.querySelector('#board');
  const layer = ctx.root.querySelector('#tiles');
  const out = {
    score: ctx.root.querySelector('[data-out="score"]'),
    best: ctx.root.querySelector('[data-out="best"]'),
    max: ctx.root.querySelector('[data-out="max"]'),
  };
  const undoBtn = ctx.root.querySelector('[data-act="undo"]');

  let grid, score, nextId, history, animating, queued, won, over;

  /* ------------------------------------------------------------ Helfer -- */

  const empties = () => {
    const list = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) if (!grid[r][c]) list.push([r, c]);
    }
    return list;
  };

  function makeTile(r, c, value, fresh) {
    const el = document.createElement('div');
    el.className = 'tile-2048' + (fresh ? ' new' : '');
    const tile = { id: nextId++, r, c, value, el };
    grid[r][c] = tile;
    paint(tile);
    layer.appendChild(el);
    return tile;
  }

  function paint(tile) {
    const [bg, fg] = COLORS[tile.value] || COLOR_HIGH;
    tile.el.style.setProperty('--t-bg', bg);
    tile.el.style.setProperty('--t-fg', fg);
    tile.el.style.setProperty('--r', tile.r);
    tile.el.style.setProperty('--c', tile.c);
    tile.el.textContent = tile.value;
    tile.el.classList.toggle('small', tile.value >= 1024);
  }

  function place(tile) {
    tile.el.style.setProperty('--r', tile.r);
    tile.el.style.setProperty('--c', tile.c);
  }

  function spawn() {
    const free = empties();
    if (!free.length) return null;
    const [r, c] = free[Math.floor(Math.random() * free.length)];
    return makeTile(r, c, Math.random() < 0.9 ? 2 : 4, true);
  }

  function maxTile() {
    let m = 0;
    for (const row of grid) for (const t of row) if (t && t.value > m) m = t.value;
    return m;
  }

  function updateStats() {
    out.score.textContent = score.toLocaleString('de-DE');
    out.max.textContent = maxTile() || 0;
    ctx.store.score('2048', 'klassisch', score);
    out.best.textContent = (ctx.store.best('2048', 'klassisch') || 0).toLocaleString('de-DE');
  }

  /* ------------------------------------------------------- Zug-Logik -- */

  /** Koordinaten je Reihe/Spalte, geordnet von der Zielseite nach hinten. */
  function lines(dir) {
    const result = [];
    for (let i = 0; i < SIZE; i++) {
      const line = [];
      for (let j = 0; j < SIZE; j++) {
        if (dir === 'left') line.push([i, j]);
        else if (dir === 'right') line.push([i, SIZE - 1 - j]);
        else if (dir === 'up') line.push([j, i]);
        else line.push([SIZE - 1 - j, i]);
      }
      result.push(line);
    }
    return result;
  }

  function snapshot() {
    return {
      cells: grid.map((row) => row.map((t) => (t ? t.value : 0))),
      score,
    };
  }

  function move(dir) {
    if (over) return;
    if (animating) {
      queued = dir;
      return;
    }

    const before = snapshot();
    const dying = [];
    const merges = [];
    let moved = false;
    let gained = 0;

    for (const line of lines(dir)) {
      const seq = line.map(([r, c]) => grid[r][c]).filter(Boolean);
      const slots = [];
      for (let i = 0; i < seq.length; i++) {
        const tile = seq[i];
        const prev = slots[slots.length - 1];
        if (prev && !prev.merged && prev.tile.value === tile.value) {
          prev.merged = true;
          prev.eaten = tile;
        } else {
          slots.push({ tile, merged: false });
        }
      }
      // Zielfelder der Reihe neu belegen.
      for (const [r, c] of line) grid[r][c] = null;
      slots.forEach((slot, i) => {
        const [r, c] = line[i];
        const tile = slot.tile;
        if (tile.r !== r || tile.c !== c) moved = true;
        tile.r = r;
        tile.c = c;
        grid[r][c] = tile;
        if (slot.merged) {
          moved = true;
          slot.eaten.r = r;
          slot.eaten.c = c;
          dying.push(slot.eaten);
          merges.push(tile);
          gained += tile.value * 2;
        }
      });
    }

    if (!moved) return;

    history.push(before);
    if (history.length > 12) history.shift();
    undoBtn.disabled = false;

    score += gained;

    // Erst alle Kacheln (auch die sterbenden) an ihr Ziel gleiten lassen …
    for (const row of grid) for (const t of row) if (t) place(t);
    for (const t of dying) {
      t.el.style.zIndex = '0';
      place(t);
    }

    animating = true;
    setTimeout(() => {
      // … und danach aufräumen: verschmolzene Kacheln entfernen, Werte verdoppeln.
      for (const t of dying) t.el.remove();
      for (const t of merges) {
        t.value *= 2;
        paint(t);
        t.el.classList.remove('pop');
        void t.el.offsetWidth;
        t.el.classList.add('pop');
      }
      spawn();
      updateStats();
      animating = false;

      if (!won && maxTile() >= 2048) {
        won = true;
        overlay('Geschafft – 2048!', 'Weiterspielen');
      } else if (stuck()) {
        over = true;
        overlay('Kein Zug mehr möglich', 'Neues Spiel', true);
      } else if (queued) {
        const dir2 = queued;
        queued = null;
        move(dir2);
      }
    }, MOVE_MS);
  }

  function stuck() {
    if (empties().length) return false;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = grid[r][c].value;
        if (r + 1 < SIZE && grid[r + 1][c].value === v) return false;
        if (c + 1 < SIZE && grid[r][c + 1].value === v) return false;
      }
    }
    return true;
  }

  function overlay(title, label, restart = false) {
    const box = document.createElement('div');
    box.className = 'g2048-over';
    box.innerHTML = `<div>${title}</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      box.remove();
      if (restart) reset();
    });
    box.appendChild(btn);
    board.appendChild(box);
    btn.focus();
  }

  /* ---------------------------------------------------------- Undo/Neu -- */

  function loadCells(cells, points) {
    layer.innerHTML = '';
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    score = points;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (cells[r][c]) makeTile(r, c, cells[r][c], false);
      }
    }
    updateStats();
  }

  function undo() {
    if (!history.length || animating) return;
    const prev = history.pop();
    board.querySelector('.g2048-over')?.remove();
    over = false;
    loadCells(prev.cells, prev.score);
    undoBtn.disabled = history.length === 0;
  }

  function reset() {
    board.querySelector('.g2048-over')?.remove();
    layer.innerHTML = '';
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    score = 0;
    nextId = 1;
    history = [];
    animating = false;
    queued = null;
    won = false;
    over = false;
    undoBtn.disabled = true;
    for (let i = 0; i < START_TILES; i++) spawn();
    updateStats();
    ctx.store.play('2048');
    board.focus({ preventScroll: true });
  }

  /* --------------------------------------------------------- Steuerung -- */

  const KEYS = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right',
  };

  ctx.on(window, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const dir = KEYS[e.key] || KEYS[e.key.toLowerCase()];
    if (dir) {
      e.preventDefault();
      move(dir);
    } else if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    }
  });

  let start = null;
  ctx.on(board, 'pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
  });
  ctx.on(board, 'pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  });

  ctx.on(ctx.root.querySelector('[data-act="new"]'), 'click', reset);
  ctx.on(undoBtn, 'click', undo);

  reset();
}
