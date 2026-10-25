/**
 * Blockwelt – ein 3D-Sandkasten im Browser.
 *
 * Unendliche Welt aus Bloecken (Berge, Meere, Hoehlen, Waelder, Wueste), Tag und
 * Nacht, Bauen und Abbauen, Kreativ- und Ueberlebensmodus. Die Physik folgt den
 * dokumentierten Regeln des grossen Vorbilds (siehe blockwelt/player.js); Code,
 * Texturen und Namen sind komplett eigen.
 *
 * Dateien: world.js (Gelaende, Chunks), mesher.js (Dreiecke), render.js (WebGL2),
 * player.js (Bewegung), atlas.js (Texturen), blocks.js (Blockarten).
 */

import { World, CS, SEA } from './blockwelt/world.js';
import { Player, TPS, HALF, HEIGHT } from './blockwelt/player.js';
import { createRenderer, skyState } from './blockwelt/render.js';
import { blockIcon } from './blockwelt/atlas.js';
import {
  BLOCKS,
  PLACEABLE,
  RECIPES,
  AIR,
  WATER,
  SAND,
  BEDROCK,
  GRASS,
  DIRT,
  STONE,
  PLANKS,
  BRICK,
  GLASS,
  LOG,
  LAMP,
} from './blockwelt/blocks.js';

const SAVE_KEY = 'blockwelt';
const MAX_STACK = 64;
const TICK_MS = 1000 / TPS;
const SENSITIVITY = 0.0022;

const MODES = { kreativ: 'Kreativ', ueberleben: 'Überleben' };
const DISTANCES = { 4: 'Nah', 6: 'Mittel', 8: 'Weit' };

const CREATIVE_BAR = [GRASS, DIRT, STONE, PLANKS, BRICK, GLASS, LOG, SAND, LAMP];

const stack = (id, count = 1) => ({ id, count });

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <div class="seg" id="modes">
        ${Object.entries(MODES)
          .map(([k, label]) => `<button type="button" data-mode="${k}">${label}</button>`)
          .join('')}
      </div>
      <div class="seg" id="dists" title="Sichtweite">
        ${Object.entries(DISTANCES)
          .map(([k, label]) => `<button type="button" data-dist="${k}">${label}</button>`)
          .join('')}
      </div>
      <button class="btn" type="button" data-act="time">Tag / Nacht</button>
      <button class="btn" type="button" data-act="full">Vollbild</button>
      <button class="btn" type="button" data-act="new">Neue Welt</button>
    </div>
    <div class="bw-stage" id="stage">
      <canvas class="bw-canvas" id="cv"></canvas>
      <div class="bw-hud" id="hud" hidden>
        <div class="bw-cross"></div>
        <div class="bw-tint" id="tint"></div>
        <div class="bw-flash" id="flash"></div>
        <pre class="bw-debug" id="debug" hidden></pre>
        <div class="bw-bottom">
          <div class="bw-hearts" id="hearts"></div>
          <div class="bw-hotbar" id="hotbar"></div>
        </div>
        <div class="bw-toast" id="toast"></div>
      </div>
      <div class="bw-panel" id="panel" hidden></div>
      <div class="play-overlay bw-overlay" id="overlay"></div>
    </div>
    <div class="keyhint">
      <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> laufen · <kbd>Leertaste</kbd> springen
      (im Kreativmodus zweimal tippen = fliegen) · <kbd>Strg</kbd> sprinten ·
      <kbd>Shift</kbd> schleichen · linke Maustaste abbauen · rechte setzen ·
      Mittelklick nimmt den Block auf · <kbd>1</kbd>–<kbd>9</kbd> / Mausrad wählt ·
      <kbd>E</kbd> Inventar · <kbd>F3</kbd> Debug. Maus und Tastatur nötig.
    </div>`;

  const $ = (sel) => ctx.root.querySelector(sel);
  const stage = $('#stage');
  const canvas = $('#cv');
  const hud = $('#hud');
  const overlay = $('#overlay');
  const panel = $('#panel');
  const hotbarEl = $('#hotbar');
  const heartsEl = $('#hearts');
  const tintEl = $('#tint');
  const flashEl = $('#flash');
  const debugEl = $('#debug');
  const toastEl = $('#toast');

  const renderer = createRenderer(canvas);
  if (!renderer) {
    ctx.root.innerHTML = `<div class="panel">Blockwelt braucht WebGL 2 – dein Browser
      oder die Grafikbeschleunigung unterstützt das gerade nicht.</div>`;
    return;
  }

  /* ----------------------------------------------------------- Zustand -- */

  const saved = ctx.store.get(SAVE_KEY);
  let mode = saved && MODES[saved.mode] ? saved.mode : 'kreativ';
  let renderDistance = saved && DISTANCES[saved.dist] ? saved.dist : 6;

  const player = new Player();
  let world;
  let time = 1000; // Tageszeit in Ticks, 0 = Sonnenaufgang
  let age = 0; // Gesamtalter der Welt in Ticks
  let health = 20;
  let dead = false;
  let sel = 0;
  const bars = { kreativ: [], ueberleben: [] };
  let wanted = [];
  let wantedCx = NaN;
  let wantedCz = NaN;
  let wantedDist = 0;

  const keys = new Set();
  const mouse = { left: false, right: false };
  let locked = false;
  let forcePlay = false; // fuer Tests ohne Pointer-Lock
  let panelOpen = false;
  let debugOn = false;
  let tapW = 0;
  let tapSpace = 0;
  let sprintKey = false;
  let breakCooldown = 0;
  let useCooldown = 0;
  let breakTarget = null;
  let breakProgress = 0;
  let target = null;
  let prev = { x: 0, y: 0, z: 0 };
  let acc = 0;
  let last = 0;
  let raf = 0;
  let toastTimer = 0;
  let flashAlpha = 0;
  let fps = 0;
  let frames = 0;
  let fpsAt = 0;

  const playing = () => (locked || forcePlay) && !panelOpen && !dead;
  const creative = () => mode === 'kreativ';
  const slots = () => bars[mode];

  /* ------------------------------------------------------- Hilfsfunktionen -- */

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }

  function resetBars() {
    bars.kreativ = CREATIVE_BAR.map((id) => stack(id, 1));
    bars.ueberleben = Array(9).fill(null);
  }

  /** Zaehlt einen Blocktyp im Ueberlebens-Inventar. */
  function countOf(id) {
    return bars.ueberleben.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0);
  }

  function give(id, n = 1) {
    if (creative() || !id) return;
    const s = bars.ueberleben;
    for (const slot of s) {
      if (slot && slot.id === id && slot.count < MAX_STACK) {
        const add = Math.min(n, MAX_STACK - slot.count);
        slot.count += add;
        n -= add;
        if (!n) break;
      }
    }
    for (let i = 0; i < s.length && n > 0; i++) {
      if (!s[i]) {
        const add = Math.min(n, MAX_STACK);
        s[i] = stack(id, add);
        n -= add;
      }
    }
    paintHotbar();
  }

  function take(id, n) {
    for (const slot of bars.ueberleben) {
      if (slot && slot.id === id) {
        const t = Math.min(n, slot.count);
        slot.count -= t;
        n -= t;
        if (!n) break;
      }
    }
    bars.ueberleben = bars.ueberleben.map((s) => (s && s.count > 0 ? s : null));
  }

  /* -------------------------------------------------------------- Welt -- */

  function startWorld(data) {
    const seed = data ? data.seed : (Math.random() * 2 ** 31) | 0;
    world = new World(seed, data ? World.parseEdits(data.edits) : null);
    world.onChunkRemoved = (c) => renderer.freeChunk(c);

    if (data) {
      time = data.time ?? 1000;
      age = data.age ?? 0;
      health = data.health ?? 20;
      bars.kreativ = (data.bars?.kreativ || []).map((s) => (s ? stack(s[0], s[1]) : null));
      bars.ueberleben = (data.bars?.ueberleben || []).map((s) => (s ? stack(s[0], s[1]) : null));
      if (bars.kreativ.length !== 9 || bars.ueberleben.length !== 9) resetBars();
      sel = data.sel ?? 0;
    } else {
      time = 1000;
      age = 0;
      health = 20;
      sel = 0;
      resetBars();
    }
    dead = false;

    const p = data && data.player ? data.player : world.findSpawn();
    const pcx = Math.floor(p.x / CS);
    const pcz = Math.floor(p.z / CS);
    for (let dz = -2; dz <= 2; dz++)
      for (let dx = -2; dx <= 2; dx++) world.generate(pcx + dx, pcz + dz);
    player.teleport(p.x, p.y, p.z);
    if (data && data.player) {
      player.yaw = p.yaw || 0;
      player.pitch = p.pitch || 0;
      player.flying = !!p.flying;
    } else {
      player.yaw = 0;
      player.pitch = -0.1;
      player.flying = false;
      player.y = world.surfaceY(Math.floor(p.x), Math.floor(p.z)) + 1;
    }
    prev = { x: player.x, y: player.y, z: player.z };
    wantedCx = NaN;
    paintAll();
  }

  function save() {
    if (!world) return;
    const pack = (arr) => arr.map((s) => (s ? [s.id, s.count] : null));
    ctx.store.set(SAVE_KEY, {
      v: 1,
      seed: world.seed,
      mode,
      dist: renderDistance,
      time,
      age,
      health,
      sel,
      player: {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        pitch: player.pitch,
        flying: player.flying,
      },
      bars: { kreativ: pack(bars.kreativ), ueberleben: pack(bars.ueberleben) },
      edits: world.serializeEdits(),
    });
    ctx.store.set('blockwelt:info', { days: Math.floor(age / 24000), mode });
  }

  /** Haelt die Chunks rund um den Spieler bereit; erzeugt und vernetzt mit Zeitbudget. */
  function stream() {
    const pcx = Math.floor(player.x / CS);
    const pcz = Math.floor(player.z / CS);
    if (pcx !== wantedCx || pcz !== wantedCz || wantedDist !== renderDistance) {
      wantedCx = pcx;
      wantedCz = pcz;
      wantedDist = renderDistance;
      wanted = [];
      const R = renderDistance + 1;
      for (let dz = -R; dz <= R; dz++) {
        for (let dx = -R; dx <= R; dx++) {
          wanted.push({
            cx: pcx + dx,
            cz: pcz + dz,
            d: dx * dx + dz * dz,
            r: Math.max(Math.abs(dx), Math.abs(dz)),
          });
        }
      }
      wanted.sort((a, b) => a.d - b.d);
      world.unloadFar(pcx, pcz, R + 2);
    }
    const t0 = performance.now();
    for (const w of wanted) {
      if (!world.getChunk(w.cx, w.cz)) {
        world.generate(w.cx, w.cz);
        if (performance.now() - t0 > 6) break;
      }
    }
    const inView = wanted.filter((w) => w.r <= renderDistance);
    renderer.buildMeshes(world, inView, 7);
  }

  /* --------------------------------------------------------- Interaktion -- */

  function reach() {
    return creative() ? 5 : 4.5;
  }

  function aim(cam) {
    const f = player.forward();
    return world.raycast(cam.x, cam.y, cam.z, f[0], f[1], f[2], reach());
  }

  function dropSand(x, y, z) {
    if (world.getBlock(x, y, z) !== SAND) return;
    let ny = y;
    while (ny > 1) {
      const below = world.getBlock(x, ny - 1, z);
      if (below !== AIR && below !== WATER) break;
      ny--;
    }
    if (ny !== y) {
      world.setBlock(x, y, z, AIR);
      world.setBlock(x, ny, z, SAND);
    }
  }

  function breakBlock(t) {
    const def = BLOCKS[t.id];
    if (!def || t.id === BEDROCK) return;
    if (!world.setBlock(t.x, t.y, t.z, AIR)) return;
    give(def.drop);
    for (let y = t.y + 1; world.getBlock(t.x, y, t.z) === SAND; y++) dropSand(t.x, y, t.z);
  }

  function overlapsPlayer(x, y, z) {
    return (
      x + 1 > player.x - HALF &&
      x < player.x + HALF &&
      y + 1 > player.y &&
      y < player.y + HEIGHT &&
      z + 1 > player.z - HALF &&
      z < player.z + HALF
    );
  }

  function placeBlock(t) {
    const slot = slots()[sel];
    if (!slot) return;
    const x = t.x + t.nx;
    const y = t.y + t.ny;
    const z = t.z + t.nz;
    const there = world.getBlock(x, y, z);
    if (there !== AIR && there !== WATER) return;
    if (BLOCKS[slot.id].solid && overlapsPlayer(x, y, z)) return;
    if (!world.setBlock(x, y, z, slot.id)) return;
    if (slot.id === SAND) dropSand(x, y, z);
    if (!creative()) {
      slot.count--;
      if (slot.count <= 0) slots()[sel] = null;
      paintHotbar();
    }
  }

  function pickBlock(t) {
    if (!creative()) return;
    const bar = slots();
    const at = bar.findIndex((s) => s && s.id === t.id);
    if (at >= 0) sel = at;
    else bar[sel] = stack(t.id, 1);
    paintHotbar();
  }

  /* ---------------------------------------------------------- Spieltick -- */

  function damage(n) {
    if (creative() || dead) return;
    health = Math.max(0, health - n);
    flashAlpha = 0.5;
    paintHearts();
    if (health <= 0) die();
  }

  function die() {
    dead = true;
    mouse.left = mouse.right = false;
    if (document.pointerLockElement) document.exitPointerLock();
    showOverlay('Du bist gestorben', 'Dein Inventar bleibt erhalten.', 'Wiederbeleben', respawn);
  }

  function respawn() {
    const s = world.findSpawn();
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++)
        world.generate(Math.floor(s.x / CS) + dx, Math.floor(s.z / CS) + dz);
    }
    player.teleport(s.x, world.surfaceY(Math.floor(s.x), Math.floor(s.z)) + 1, s.z);
    prev = { x: player.x, y: player.y, z: player.z };
    health = 20;
    dead = false;
    paintHearts();
    showPause();
  }

  function tick() {
    prev = { x: player.x, y: player.y, z: player.z };
    const k = (c) => keys.has(c);
    const input = {
      forward: (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0),
      strafe: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
      jump: k('Space'),
      sneak: k('ShiftLeft') || k('ShiftRight'),
      sprint: k('ControlLeft') || sprintKey,
    };
    if (!playing()) {
      input.forward = input.strafe = 0;
      input.jump = input.sneak = false;
    }
    player.tick(world, input);
    if (player.landedDamage) damage(player.landedDamage);

    time = (time + 1) % 24000;
    age++;
    if (!creative() && !dead && health < 20 && age % 80 === 0) {
      health++;
      paintHearts();
    }

    if (breakCooldown > 0) breakCooldown--;
    if (useCooldown > 0) useCooldown--;

    if (!playing()) return;
    const cam = camera(1);
    target = aim(cam);

    if (mouse.left && target) {
      if (creative()) {
        if (breakCooldown === 0) {
          breakBlock(target);
          breakCooldown = 5;
        }
      } else {
        const hardness = BLOCKS[target.id].hardness;
        if (
          !breakTarget ||
          breakTarget.x !== target.x ||
          breakTarget.y !== target.y ||
          breakTarget.z !== target.z
        ) {
          breakTarget = { x: target.x, y: target.y, z: target.z };
          breakProgress = 0;
        }
        if (breakCooldown === 0 && Number.isFinite(hardness)) {
          breakProgress += 1 / Math.max(1, hardness * 1.5 * TPS);
          if (breakProgress >= 1) {
            breakBlock(target);
            breakProgress = 0;
            breakTarget = null;
            breakCooldown = 5;
          }
        }
      }
    } else {
      breakProgress = 0;
      breakTarget = null;
    }

    if (mouse.right && target && useCooldown === 0) {
      placeBlock(target);
      useCooldown = 4;
    }
  }

  /** Kameraposition (Auge), zwischen letztem und aktuellem Tick gemischt. */
  function camera(alpha) {
    const a = Math.max(0, Math.min(1, alpha));
    return {
      x: prev.x + (player.x - prev.x) * a,
      y: prev.y + (player.y - prev.y) * a + player.eyeHeight,
      z: prev.z + (player.z - prev.z) * a,
    };
  }

  /* ------------------------------------------------------------ Zeichnen -- */

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(320, Math.round(stage.clientWidth * dpr));
    const h = Math.max(180, Math.round(stage.clientHeight * dpr));
    renderer.resize(w, h);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  ctx.onDestroy(() => observer.disconnect());

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(now - last, 250);
    last = now;

    if (playing()) {
      acc += dt;
      let n = 0;
      while (acc >= TICK_MS && n < 5) {
        tick();
        acc -= TICK_MS;
        n++;
      }
      if (acc >= TICK_MS) acc = 0;
    } else {
      acc = 0;
      prev = { x: player.x, y: player.y, z: player.z };
    }

    stream();

    const cam = camera(playing() ? acc / TICK_MS : 1);
    if (!playing()) target = null;
    else target = aim(cam);
    const sky = skyState(time);
    const eyeBlock = world.getBlock(Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z));
    const underwater = eyeBlock === WATER;

    renderer.draw(
      world,
      {
        x: cam.x,
        y: cam.y,
        z: cam.z,
        yaw: player.yaw,
        pitch: player.pitch,
        fov: 70 + (player.sprinting ? 6 : 0),
      },
      { sky, renderDistance, underwater, target, breakProgress },
    );

    tintEl.style.opacity = underwater ? '1' : '0';
    if (flashAlpha > 0) {
      flashAlpha = Math.max(0, flashAlpha - dt / 600);
      flashEl.style.opacity = String(flashAlpha);
    }

    frames++;
    if (now - fpsAt > 500) {
      fps = Math.round((frames * 1000) / (now - fpsAt));
      frames = 0;
      fpsAt = now;
      if (debugOn) paintDebug(sky);
    }
  }

  function paintDebug() {
    const f = player.forward();
    const dir =
      Math.abs(f[0]) > Math.abs(f[2])
        ? f[0] > 0
          ? 'Osten (+x)'
          : 'Westen (-x)'
        : f[2] > 0
          ? 'Süden (+z)'
          : 'Norden (-z)';
    const hour = Math.floor((time / 1000 + 6) % 24);
    const min = Math.floor(((time % 1000) / 1000) * 60);
    debugEl.textContent = [
      `${fps} FPS · Chunks ${world.chunks.size} · sichtbar ${renderer.stats.drawn} · ${(renderer.stats.verts / 1000).toFixed(0)}k Ecken`,
      `XYZ ${player.x.toFixed(2)} ${player.y.toFixed(2)} ${player.z.toFixed(2)}`,
      `Chunk ${Math.floor(player.x / CS)} ${Math.floor(player.z / CS)} · Blick ${dir}`,
      `Tempo ${(Math.hypot(player.vx, player.vz) * TPS).toFixed(2)} m/s · ${player.onGround ? 'am Boden' : player.flying ? 'fliegt' : player.inWater ? 'schwimmt' : 'in der Luft'}`,
      `Zeit ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} · Tag ${Math.floor(age / 24000) + 1}`,
      `Seed ${world.seed} · Meereshöhe ${SEA}`,
      target ? `Ziel ${target.x} ${target.y} ${target.z} (${BLOCKS[target.id].name})` : 'Ziel –',
    ].join('\n');
  }

  /* ----------------------------------------------------------------- HUD -- */

  function paintHotbar() {
    hotbarEl.innerHTML = slots()
      .map((s, i) => {
        const icon = s
          ? `<img src="${blockIcon(s.id)}" alt="${BLOCKS[s.id].name}" draggable="false">`
          : '';
        const n = s && !creative() ? `<b>${s.count}</b>` : '';
        return `<div class="bw-slot${i === sel ? ' sel' : ''}" data-i="${i}" title="${s ? BLOCKS[s.id].name : 'leer'}">${icon}${n}</div>`;
      })
      .join('');
    if (panelOpen) paintPanel();
  }

  function paintHearts() {
    if (creative()) {
      heartsEl.innerHTML = '';
      return;
    }
    let out = '';
    for (let i = 0; i < 10; i++) {
      const v = health - i * 2;
      out += `<i class="${v >= 2 ? 'full' : v === 1 ? 'half' : 'empty'}">♥</i>`;
    }
    heartsEl.innerHTML = out;
  }

  function paintToolbar() {
    for (const b of ctx.root.querySelectorAll('[data-mode]')) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    }
    for (const b of ctx.root.querySelectorAll('[data-dist]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.dist) === renderDistance));
    }
  }

  function paintAll() {
    paintToolbar();
    paintHotbar();
    paintHearts();
  }

  function paintPanel() {
    if (creative()) {
      panel.innerHTML = `
        <div class="bw-panel-head"><strong>Bausteine</strong><span>Klick belegt den gewählten Platz in der Leiste.</span></div>
        <div class="bw-grid">${PLACEABLE.map(
          (
            id,
          ) => `<button type="button" class="bw-item" data-block="${id}" title="${BLOCKS[id].name}">
            <img src="${blockIcon(id)}" alt="" draggable="false"><span>${BLOCKS[id].name}</span></button>`,
        ).join('')}</div>`;
    } else {
      panel.innerHTML = `
        <div class="bw-panel-head"><strong>Herstellen</strong><span>Zutaten kommen aus deiner Leiste.</span></div>
        <div class="bw-recipes">${RECIPES.map((r, i) => {
          const can = r.in.every(([id, n]) => countOf(id) >= n);
          const ins = r.in
            .map(
              ([id, n]) =>
                `<span class="bw-ing"><img src="${blockIcon(id)}" alt="" draggable="false">${n}× ${BLOCKS[id].name}</span>`,
            )
            .join(' + ');
          return `<div class="bw-recipe"><span>${ins}</span><span>→</span>
            <span class="bw-ing"><img src="${blockIcon(r.out[0])}" alt="" draggable="false">${r.out[1]}× ${BLOCKS[r.out[0]].name}</span>
            <button type="button" class="btn${can ? ' primary' : ''}" data-recipe="${i}" ${can ? '' : 'disabled'}>Herstellen</button></div>`;
        }).join('')}</div>`;
    }
  }

  function setPanel(open) {
    panelOpen = open;
    panel.hidden = !open;
    if (open) {
      mouse.left = mouse.right = false;
      if (document.pointerLockElement) document.exitPointerLock();
      paintPanel();
      overlay.hidden = true;
    } else if (!locked && !forcePlay) {
      showPause();
    }
  }

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

  function lock() {
    try {
      const p = canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch {
      /* ohne Pointer-Lock ist nur Umschauen ueber die Maus nicht moeglich */
    }
  }

  function showPause() {
    const first = age === 0;
    showOverlay(
      first ? 'Willkommen in der Blockwelt' : 'Pause',
      first
        ? 'Klicken, dann Maus und Tastatur benutzen. Esc pausiert.'
        : 'Klicken, um weiterzuspielen. Dein Fortschritt wird automatisch gespeichert.',
      first ? 'Spielen' : 'Weiter',
      lock,
    );
  }

  /* ----------------------------------------------------------- Eingaben -- */

  document.addEventListener('pointerlockchange', onLockChange);
  ctx.onDestroy(() => document.removeEventListener('pointerlockchange', onLockChange));
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
    if (locked) {
      overlay.hidden = true;
      hud.hidden = false;
      ctx.store.play('blockwelt');
    } else {
      mouse.left = mouse.right = false;
      keys.clear();
      sprintKey = false;
      save();
      if (!panelOpen && !dead) showPause();
    }
  }

  ctx.on(
    window,
    'keydown',
    (e) => {
      if (e.key === 'Escape' && (playing() || panelOpen)) {
        e.stopPropagation(); // nur pausieren, nicht gleich zur Uebersicht springen
        if (panelOpen) setPanel(false);
        return;
      }
      if (!playing() && !panelOpen) return;

      if (e.code === 'KeyE') {
        e.preventDefault();
        setPanel(!panelOpen);
        if (!panelOpen) lock();
        return;
      }
      if (panelOpen) return;

      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.code === 'F3') {
        e.preventDefault();
        debugOn = !debugOn;
        debugEl.hidden = !debugOn;
        return;
      }
      if (e.repeat) return;
      keys.add(e.code);

      if (/^Digit[1-9]$/.test(e.code)) {
        sel = Number(e.code.slice(5)) - 1;
        paintHotbar();
      } else if (e.code === 'KeyW') {
        if (e.timeStamp - tapW < 300) sprintKey = true;
        tapW = e.timeStamp;
      } else if (e.code === 'Space' && creative()) {
        if (e.timeStamp - tapSpace < 300) {
          player.flying = !player.flying;
          player.vy = 0;
          toast(player.flying ? 'Flugmodus an' : 'Flugmodus aus');
        }
        tapSpace = e.timeStamp;
      }
    },
    true,
  );

  ctx.on(window, 'keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'KeyW') sprintKey = false;
  });

  ctx.on(window, 'blur', () => {
    keys.clear();
    sprintKey = false;
  });

  ctx.on(document, 'mousemove', (e) => {
    if (!locked || panelOpen) return;
    player.yaw -= e.movementX * SENSITIVITY;
    player.pitch -= e.movementY * SENSITIVITY;
    player.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, player.pitch));
  });

  ctx.on(canvas, 'mousedown', (e) => {
    if (!playing()) return;
    e.preventDefault();
    if (e.button === 0) mouse.left = true;
    else if (e.button === 2) {
      mouse.right = true;
      useCooldown = 0;
    } else if (e.button === 1 && target) pickBlock(target);
  });
  ctx.on(window, 'mouseup', (e) => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  ctx.on(canvas, 'contextmenu', (e) => e.preventDefault());

  ctx.on(
    canvas,
    'wheel',
    (e) => {
      if (!playing()) return;
      e.preventDefault();
      sel = (sel + (e.deltaY > 0 ? 1 : 8)) % 9;
      paintHotbar();
    },
    { passive: false },
  );

  ctx.on(hotbarEl, 'mousedown', (e) => {
    const slot = e.target.closest('.bw-slot');
    if (!slot) return;
    sel = Number(slot.dataset.i);
    paintHotbar();
  });

  ctx.on(panel, 'click', (e) => {
    const item = e.target.closest('[data-block]');
    if (item) {
      slots()[sel] = stack(Number(item.dataset.block), 1);
      paintHotbar();
      return;
    }
    const rec = e.target.closest('[data-recipe]');
    if (rec) {
      const r = RECIPES[Number(rec.dataset.recipe)];
      if (!r.in.every(([id, n]) => countOf(id) >= n)) return;
      for (const [id, n] of r.in) take(id, n);
      give(r.out[0], r.out[1]);
      paintHotbar();
    }
  });

  /* -------------------------------------------------------------- Toolbar -- */

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    player.flying = false;
    health = Math.max(health, 1);
    sel = Math.min(sel, 8);
    paintAll();
    save();
  }

  ctx.on($('#modes'), 'click', (e) => {
    const b = e.target.closest('[data-mode]');
    if (b) setMode(b.dataset.mode);
  });
  ctx.on($('#dists'), 'click', (e) => {
    const b = e.target.closest('[data-dist]');
    if (!b) return;
    renderDistance = Number(b.dataset.dist);
    paintToolbar();
  });
  ctx.on(ctx.root.querySelector('.toolbar'), 'click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'time') {
      time = time > 0 && time < 12000 ? 14000 : 1000;
    } else if (b.dataset.act === 'full') {
      if (document.fullscreenElement) document.exitFullscreen();
      else stage.requestFullscreen?.();
    } else if (b.dataset.act === 'new') {
      if (!confirm('Eine neue Welt anlegen? Die bisherige Welt geht dabei verloren.')) return;
      for (const c of world.chunks.values()) renderer.freeChunk(c);
      startWorld(null);
      save();
      showPause();
    }
  });

  /* ------------------------------------------------------------- Start -- */

  startWorld(saved && saved.seed != null ? saved : null);
  resize();
  hud.hidden = false;
  showPause();
  last = performance.now();
  fpsAt = last;
  raf = requestAnimationFrame(frame);

  ctx.interval(save, 15000);
  ctx.onDestroy(() => {
    cancelAnimationFrame(raf);
    save();
    if (document.pointerLockElement) document.exitPointerLock();
    if (document.fullscreenElement) document.exitFullscreen();
    renderer.dispose();
  });

  // Fuer Tests und Neugierige: Zugriff auf den Innenleben.
  stage.__bw = {
    get world() {
      return world;
    },
    player,
    renderer,
    tick,
    camera,
    setPlay(on) {
      forcePlay = on;
      if (on) {
        overlay.hidden = true;
        hud.hidden = false;
      }
    },
    get state() {
      return { mode, time, health, sel, age };
    },
  };
}
