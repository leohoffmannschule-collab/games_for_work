/**
 * Snake auf einem Canvas.
 *
 * Die Schleife laeuft ueber requestAnimationFrame mit einem Zeit-Akkumulator:
 * so bleibt das Tempo unabhaengig von der Bildwiederholrate, und das Spiel
 * pausiert von selbst, wenn der Tab in den Hintergrund wandert.
 */

const GRID = 21;
const START_MS = 145;
const MIN_MS = 68;
const SPEEDUP = 3.5;

const MODES = {
  wand: { label: 'Wände tödlich', wrap: false },
  offen: { label: 'Wände offen', wrap: true },
};

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <div class="seg" id="modes">
        ${Object.entries(MODES)
          .map(([key, m]) => `<button type="button" data-mode="${key}">${m.label}</button>`)
          .join('')}
      </div>
      <button class="btn primary" data-act="new">Neue Runde</button>
      <button class="btn" data-act="pause">Pause</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Punkte</div><div class="v" data-out="score">0</div></div>
      <div class="stat"><div class="k">Bestwert</div><div class="v" data-out="best">0</div></div>
      <div class="stat"><div class="k">Länge</div><div class="v" data-out="len">3</div></div>
    </div>
    <div class="snake-wrap">
      <canvas class="snake-canvas" id="cv" width="600" height="600"></canvas>
      <div class="snake-overlay" id="overlay" hidden></div>
    </div>
    <div class="keyhint">
      <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> oder <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ·
      <kbd>Leertaste</kbd> pausiert · am Handy wischen.
    </div>`;

  const canvas = ctx.root.querySelector('#cv');
  const overlay = ctx.root.querySelector('#overlay');
  const pauseBtn = ctx.root.querySelector('[data-act="pause"]');
  const g = canvas.getContext('2d');
  const out = {
    score: ctx.root.querySelector('[data-out="score"]'),
    best: ctx.root.querySelector('[data-out="best"]'),
    len: ctx.root.querySelector('[data-out="len"]'),
  };

  let mode = ctx.store.get('snake:mode', 'wand');
  if (!MODES[mode]) mode = 'wand';

  let snake, dir, queue, food, score, stepMs, phase, acc, last, raf;
  let colors = readColors();

  function readColors() {
    const s = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => (s.getPropertyValue(name) || '').trim() || fallback;
    return {
      accent: pick('--accent', '#2f62e8'),
      good: pick('--good', '#1f9d63'),
      border: pick('--border', '#dfe4ec'),
      surface: pick('--surface-2', '#eef1f6'),
    };
  }

  ctx.on(window, 'themechange', () => {
    colors = readColors();
    draw();
  });

  /* -------------------------------------------------------- Aufloesung -- */

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(240, Math.round(canvas.clientWidth));
    const px = Math.round(size * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
    }
    draw();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  ctx.onDestroy(() => observer.disconnect());

  /* ------------------------------------------------------------ Zeichnen -- */

  function roundRect(x, y, w, h, r) {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  }

  function draw() {
    const size = canvas.width;
    const cell = size / GRID;
    g.clearRect(0, 0, size, size);

    // Feines Raster als Orientierung.
    g.strokeStyle = colors.border;
    g.globalAlpha = 0.55;
    g.lineWidth = Math.max(1, size / 800);
    g.beginPath();
    for (let i = 1; i < GRID; i++) {
      g.moveTo(Math.round(i * cell) + 0.5, 0);
      g.lineTo(Math.round(i * cell) + 0.5, size);
      g.moveTo(0, Math.round(i * cell) + 0.5);
      g.lineTo(size, Math.round(i * cell) + 0.5);
    }
    g.stroke();
    g.globalAlpha = 1;

    if (!snake) return;

    // Futter.
    g.fillStyle = colors.good;
    const fx = food.x * cell;
    const fy = food.y * cell;
    g.beginPath();
    g.arc(fx + cell / 2, fy + cell / 2, cell * 0.3, 0, Math.PI * 2);
    g.fill();

    // Körper von hinten nach vorn, damit der Kopf oben liegt.
    const pad = cell * 0.09;
    const r = cell * 0.28;
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      g.fillStyle = colors.accent;
      g.globalAlpha = i === 0 ? 1 : 0.55 + 0.35 * (1 - i / snake.length);
      roundRect(seg.x * cell + pad, seg.y * cell + pad, cell - 2 * pad, cell - 2 * pad, r);
    }
    g.globalAlpha = 1;

    // Augen auf dem Kopf.
    const head = snake[0];
    const hx = head.x * cell + cell / 2;
    const hy = head.y * cell + cell / 2;
    const off = cell * 0.17;
    g.fillStyle = colors.surface;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(
        hx + dir.y * off * s + dir.x * off * 0.6,
        hy + dir.x * off * s + dir.y * off * 0.6,
        cell * 0.088,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }

  /* ---------------------------------------------------------- Spiellogik -- */

  function placeFood() {
    const taken = new Set(snake.map((s) => s.y * GRID + s.x));
    const free = [];
    for (let i = 0; i < GRID * GRID; i++) if (!taken.has(i)) free.push(i);
    if (!free.length) return null;
    const i = free[Math.floor(Math.random() * free.length)];
    return { x: i % GRID, y: (i / GRID) | 0 };
  }

  function step() {
    const want = queue.shift();
    if (want) dir = want;

    const head = snake[0];
    let x = head.x + dir.x;
    let y = head.y + dir.y;

    if (MODES[mode].wrap) {
      x = (x + GRID) % GRID;
      y = (y + GRID) % GRID;
    } else if (x < 0 || y < 0 || x >= GRID || y >= GRID) {
      return gameOver();
    }

    // Das letzte Segment rueckt nach, ist also kein Hindernis.
    const bodyLimit = snake.length - 1;
    for (let i = 0; i < bodyLimit; i++) {
      if (snake[i].x === x && snake[i].y === y) return gameOver();
    }

    snake.unshift({ x, y });
    if (food && x === food.x && y === food.y) {
      score += 1;
      stepMs = Math.max(MIN_MS, stepMs - SPEEDUP);
      food = placeFood();
      paintStats();
      if (!food) return victory();
    } else {
      snake.pop();
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (phase !== 'running') {
      last = now;
      return;
    }
    if (last == null) last = now;
    acc += now - last;
    last = now;
    // Nach einem Tab-Wechsel nicht mehrere Schritte nachholen.
    if (acc > stepMs * 4) acc = stepMs;
    let moved = false;
    while (acc >= stepMs && phase === 'running') {
      acc -= stepMs;
      step();
      moved = true;
    }
    if (moved) draw();
  }

  function start() {
    phase = 'running';
    last = null;
    acc = 0;
    hideOverlay();
    pauseBtn.textContent = 'Pause';
  }

  function pause(on) {
    if (phase === 'over' || phase === 'ready') return;
    phase = on ? 'paused' : 'running';
    pauseBtn.textContent = on ? 'Weiter' : 'Pause';
    if (on)
      showOverlay('Pause', 'Leertaste oder „Weiter“ setzt fort.', 'Weiter', () => pause(false));
    else hideOverlay();
  }

  function gameOver() {
    phase = 'over';
    const record = ctx.store.score('snake', mode, score);
    paintStats();
    showOverlay(
      `Vorbei – ${score} ${score === 1 ? 'Punkt' : 'Punkte'}`,
      record && score > 0 ? 'Neuer Bestwert!' : `Bestwert: ${ctx.store.best('snake', mode) || 0}`,
      'Nochmal',
      reset,
    );
    draw();
  }

  function victory() {
    phase = 'over';
    ctx.store.score('snake', mode, score, { won: true });
    paintStats();
    showOverlay('Das Feld ist voll!', 'Mehr geht wirklich nicht.', 'Nochmal', reset);
  }

  function paintStats() {
    out.score.textContent = score;
    out.len.textContent = snake ? snake.length : 0;
    out.best.textContent = ctx.store.best('snake', mode) || 0;
  }

  /* ------------------------------------------------------------ Overlay -- */

  function showOverlay(title, sub, label, action) {
    overlay.hidden = false;
    overlay.innerHTML = `<div class="big">${title}</div><div class="sub">${sub}</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = label;
    btn.addEventListener('click', action);
    overlay.appendChild(btn);
    btn.focus({ preventScroll: true });
  }

  function hideOverlay() {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  /* ---------------------------------------------------------- Neue Runde -- */

  function reset() {
    const mid = (GRID / 2) | 0;
    snake = [
      { x: mid, y: mid },
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
    ];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    stepMs = START_MS;
    acc = 0;
    last = null;
    food = placeFood();
    phase = 'ready';
    pauseBtn.textContent = 'Pause';
    paintStats();
    draw();
    ctx.store.play('snake');
    showOverlay('Bereit?', 'Pfeiltasten, WASD oder wischen – los geht’s.', 'Start', start);
  }

  /* ----------------------------------------------------------- Steuerung -- */

  function turn(x, y) {
    const base = queue.length ? queue[queue.length - 1] : dir;
    if (base.x === -x && base.y === -y) return; // keine 180°-Wende
    if (base.x === x && base.y === y) return;
    if (queue.length < 2) queue.push({ x, y });
    if (phase === 'ready') start();
  }

  const KEYS = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
  };

  ctx.on(window, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (phase === 'ready') start();
      else pause(phase === 'running');
      return;
    }
    const v = KEYS[e.key] || KEYS[e.key.toLowerCase()];
    if (v) {
      e.preventDefault();
      turn(v[0], v[1]);
    }
  });

  let touch = null;
  ctx.on(canvas, 'pointerdown', (e) => {
    touch = { x: e.clientX, y: e.clientY };
  });
  ctx.on(canvas, 'pointerup', (e) => {
    if (!touch) return;
    const dx = e.clientX - touch.x;
    const dy = e.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 22 && Math.abs(dy) < 22) {
      if (phase === 'running') pause(true);
      else if (phase === 'paused') pause(false);
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
    else turn(0, dy > 0 ? 1 : -1);
  });

  ctx.on(document, 'visibilitychange', () => {
    if (document.hidden && phase === 'running') pause(true);
  });

  ctx.on(ctx.root.querySelector('#modes'), 'click', (e) => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    mode = btn.dataset.mode;
    ctx.store.set('snake:mode', mode);
    for (const b of ctx.root.querySelectorAll('[data-mode]')) {
      b.setAttribute('aria-pressed', String(b === btn));
    }
    reset();
  });

  ctx.on(ctx.root.querySelector('[data-act="new"]'), 'click', reset);
  ctx.on(pauseBtn, 'click', () => {
    if (phase === 'ready') start();
    else pause(phase === 'running');
  });

  for (const b of ctx.root.querySelectorAll('[data-mode]')) {
    b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  }

  raf = requestAnimationFrame(loop);
  ctx.onDestroy(() => cancelAnimationFrame(raf));

  reset();
}
