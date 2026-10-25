/**
 * Blockwelt – ein 3D-Sandkasten im Browser.
 *
 * Unendliche Welt aus Bloecken (Berge, Meere, Hoehlen, Waelder, Wueste), Tag und
 * Nacht, Bauen und Abbauen, Werkzeuge und Handwerk, fliessendes Wasser, Fackeln,
 * Tiere und Zombies, Hunger – im Kreativ- oder Ueberlebensmodus. Die Regeln folgen
 * den dokumentierten Werten des grossen Vorbilds; Code, Texturen und Namen sind eigen.
 *
 * Dateien unter blockwelt/: world.js (Gelaende, Chunks), fluids.js (Wasser),
 * region.js (Licht), mesher.js (Dreiecke), render.js (WebGL2), entities.js (Physik,
 * Wesen), player.js (Spieler, Hunger), models.js (Wesen-Modelle), items.js
 * (Gegenstaende, Rezepte, Inventar), blocks.js (Blockarten), atlas.js (Grafiken).
 */

import { World, CS, SEA } from './blockwelt/world.js';
import { Player, TPS, HALF, HEIGHT, MAX_AIR } from './blockwelt/player.js';
import { createRenderer, skyState, lightColor } from './blockwelt/render.js';
import { itemIcon, hudIcon } from './blockwelt/atlas.js';
import { MobManager, Mob, mobDrops } from './blockwelt/entities.js';
import { EntityBuffer, addMob } from './blockwelt/models.js';
import {
  BLOCKS,
  AIR,
  WATER,
  BEDROCK,
  GRASS,
  STONE,
  PLANKS,
  BRICK,
  GLASS,
  LOG,
  LAMP,
  TABLE,
  FURNACE,
  TORCH,
  REPLACEABLE,
} from './blockwelt/blocks.js';
import {
  ITEMS,
  RECIPES,
  CREATIVE_ITEMS,
  FUELS,
  Inventory,
  itemName,
  breakTicks,
  drops,
  wearOnBreak,
  wearOnAttack,
  attackDamage,
  fuelValue,
  BUCKET,
  WATER_BUCKET,
} from './blockwelt/items.js';

const SAVE_KEY = 'blockwelt';
const TICK_MS = 1000 / TPS;
const SENSITIVITY = 0.0022;
const TOUCH_SENSITIVITY = 0.0055;
const STICK_R = 52; // Joystick-Radius in Pixeln
const EAT_TICKS = 32; // 1,6 Sekunden wie im Vorbild
const STATION_RANGE = 4;

const MODES = { kreativ: 'Kreativ', ueberleben: 'Überleben' };
const DISTANCES = { 4: 'Nah', 6: 'Mittel', 8: 'Weit' };

const CREATIVE_BAR = [GRASS, STONE, PLANKS, GLASS, LOG, BRICK, TORCH, WATER_BUCKET, LAMP];

const DEATH_TEXT = {
  sturz: 'Du bist zu tief gefallen.',
  zombie: 'Ein Zombie hat dich erwischt.',
  wasser: 'Du bist ertrunken.',
  hunger: 'Du bist verhungert.',
};

const stack = (id, count = 1) => ({ id, count, wear: 0 });

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
      <button class="btn" type="button" data-act="monsters" aria-pressed="true">Monster</button>
      <button class="btn" type="button" data-act="full">Vollbild</button>
      <button class="btn" type="button" data-act="new">Neue Welt</button>
    </div>
    <div class="bw-stage" id="stage">
      <canvas class="bw-canvas" id="cv"></canvas>
      <div class="bw-hud" id="hud" hidden>
        <div class="bw-cross"></div>
        <div class="bw-use" id="use"><i></i></div>
        <div class="bw-tint" id="tint"></div>
        <div class="bw-flash" id="flash"></div>
        <pre class="bw-debug" id="debug" hidden></pre>
        <div class="bw-bottom">
          <div class="bw-stats" id="stats">
            <div class="bw-row" id="hearts"></div>
            <div class="bw-row right" id="food"></div>
          </div>
          <div class="bw-stats"><span></span><div class="bw-row right" id="air"></div></div>
          <div class="bw-hotbar" id="hotbar"></div>
        </div>
        <div class="bw-toast" id="toast"></div>
        <div class="bw-touch" id="touchUi">
          <div class="bw-zone left" id="zoneMove">
            <div class="bw-stick" id="stick"><i></i></div>
          </div>
          <div class="bw-zone right" id="zoneLook"></div>
          <div class="bw-tbtns">
            <button type="button" class="bw-tbtn" data-t="sneak">Ducken</button>
            <button type="button" class="bw-tbtn big" data-t="jump">Sprung</button>
          </div>
          <div class="bw-tmenu">
            <button type="button" class="bw-tbtn small only-creative" data-t="fly">Fliegen</button>
            <button type="button" class="bw-tbtn small" data-t="inv">Inventar</button>
            <button type="button" class="bw-tbtn small" data-t="pause">Pause</button>
          </div>
        </div>
      </div>
      <div class="bw-panel" id="panel" hidden></div>
      <div class="play-overlay bw-overlay" id="overlay"></div>
    </div>
    <div class="keyhint">
      <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> laufen · <kbd>Leertaste</kbd> springen
      (im Kreativmodus zweimal tippen = fliegen) · <kbd>Strg</kbd> sprinten ·
      <kbd>Shift</kbd> schleichen · linke Maustaste abbauen und angreifen · rechte setzen,
      essen, Eimer benutzen, Werkbank und Ofen öffnen · Mittelklick nimmt den Block auf ·
      <kbd>1</kbd>–<kbd>9</kbd> / Mausrad wählt · <kbd>E</kbd> Inventar · <kbd>F3</kbd> Debug.
    </div>
    <div class="keyhint bw-touchhint">
      <strong>Am Handy:</strong> links wischen = gehen (ganz nach vorn = sprinten) · rechts wischen =
      umschauen · kurz tippen = setzen, essen oder angreifen · halten = abbauen · Leiste antippen
      wählt.
    </div>`;

  const $ = (sel) => ctx.root.querySelector(sel);
  const stage = $('#stage');
  const canvas = $('#cv');
  const hud = $('#hud');
  const overlay = $('#overlay');
  const panel = $('#panel');
  const hotbarEl = $('#hotbar');
  const heartsEl = $('#hearts');
  const foodEl = $('#food');
  const airEl = $('#air');
  const statsEl = $('#stats');
  const useEl = $('#use');
  const tintEl = $('#tint');
  const flashEl = $('#flash');
  const debugEl = $('#debug');
  const toastEl = $('#toast');

  let renderer = null;
  try {
    renderer = createRenderer(canvas);
  } catch (err) {
    console.error(err);
  }
  if (!renderer) {
    ctx.root.innerHTML = `<div class="panel">Blockwelt braucht WebGL 2 – dein Browser
      oder die Grafikbeschleunigung unterstützt das gerade nicht.</div>`;
    return;
  }

  /* ----------------------------------------------------------- Zustand -- */

  const saved = ctx.store.get(SAVE_KEY);
  let mode = saved && MODES[saved.mode] ? saved.mode : 'kreativ';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let renderDistance = saved && DISTANCES[saved.dist] ? saved.dist : coarse ? 4 : 6;
  let monsters = saved ? saved.monsters !== false : true;

  const player = new Player();
  const mobs = new MobManager();
  const entityBuf = new EntityBuffer();
  let world;
  let time = 1000; // Tageszeit in Ticks, 0 = Sonnenaufgang
  let age = 0; // Gesamtalter der Welt in Ticks
  let dead = false;
  let sel = 0;
  let inv = new Inventory(36);
  let creativeBar = [];
  let fuel = 0; // Restglut im Ofen (in geschmolzenen Gegenstaenden)
  let wanted = [];
  let wantedCx = NaN;
  let wantedCz = NaN;
  let wantedDist = 0;

  const keys = new Set();
  const mouse = { left: false, right: false };
  let locked = false;
  let forcePlay = false; // fuer Tests ohne Pointer-Lock
  // Touch-Steuerung: Joystick links, Umschauen rechts, dazu ein paar Knoepfe.
  const touch = { on: false, play: false, move: null, look: null, jump: false, sneak: false };
  let panelOpen = false;
  let picked = -1; // ausgewaehlter Inventarplatz zum Tauschen
  let debugOn = false;
  let tapW = 0;
  let tapSpace = 0;
  let sprintKey = false;
  let breakCooldown = 0;
  let useCooldown = 0;
  let attackTimer = 0;
  let breakTarget = null;
  let breakProgress = 0;
  let eating = null;
  let hit = { block: null, mob: null };
  let prev = { x: 0, y: 0, z: 0 };
  let acc = 0;
  let last = 0;
  let raf = 0;
  let toastTimer = 0;
  let flashAlpha = 0;
  let fps = 0;
  let frames = 0;
  let fpsAt = 0;
  let statsKey = '';

  const playing = () => (locked || forcePlay || (touch.on && touch.play)) && !panelOpen && !dead;
  const creative = () => mode === 'kreativ';
  /** Die Schnellleiste: im Kreativmodus eigene 9 Plaetze, sonst die ersten 9 des Inventars. */
  const bar = () => (creative() ? creativeBar : inv.slots);
  const held = () => bar()[sel] || null;
  const heldId = () => (held() ? held().id : 0);

  /* ------------------------------------------------------- Hilfsfunktionen -- */

  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 1800);
  }

  function resetCreativeBar() {
    creativeBar = CREATIVE_BAR.map((id) => stack(id, 1));
  }

  /** Legt Beute ins Inventar (nur im Ueberlebensmodus). */
  function give(id, n = 1) {
    if (creative() || !id || n <= 0) return;
    const rest = inv.add(id, n);
    if (rest > 0) toast('Inventar voll – ' + itemName(id) + ' ging verloren.');
    paintHotbar();
  }

  /** Verbraucht ein Stueck des gehaltenen Gegenstands (Ueberlebensmodus). */
  function consumeHeld(n = 1) {
    if (creative()) return;
    const s = inv.slots[sel];
    if (!s) return;
    s.count -= n;
    if (s.count <= 0) inv.slots[sel] = null;
    paintHotbar();
  }

  /** Ersetzt den gehaltenen Gegenstand (z. B. Eimer -> Wassereimer). */
  function swapHeld(id) {
    if (creative()) return;
    const s = inv.slots[sel];
    if (s && s.count > 1) {
      s.count--;
      give(id, 1);
    } else {
      inv.slots[sel] = stack(id, 1);
    }
    paintHotbar();
  }

  function wearHeld(amount) {
    if (creative() || !amount) return;
    const s = inv.slots[sel];
    const tool = s && ITEMS[s.id].tool;
    if (!tool) return;
    s.wear = (s.wear || 0) + amount;
    if (s.wear >= tool.uses) {
      inv.slots[sel] = null;
      toast(itemName(s.id) + ' ist zerbrochen.');
    }
    paintHotbar();
  }

  function stationNear(id) {
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    const pz = Math.floor(player.z);
    const r = STATION_RANGE;
    for (let dy = -2; dy <= 3; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (world.getBlock(px + dx, py + dy, pz + dz) === id) return true;
        }
      }
    }
    return false;
  }

  /* -------------------------------------------------------------- Welt -- */

  function startWorld(data) {
    const seed = data ? data.seed : (Math.random() * 2 ** 31) | 0;
    world = new World(seed, data ? World.parseEdits(data.edits) : null);
    world.onChunkRemoved = (c) => renderer.freeChunk(c);
    mobs.clear();
    eating = null;

    const p = data && data.player ? data.player : null;
    player.resetStats();
    if (data) {
      time = data.time ?? 1000;
      age = data.age ?? 0;
      sel = Math.min(8, data.sel ?? 0);
      fuel = data.fuel || 0;
      if (data.v >= 2) {
        inv = Inventory.from(data.inventory);
        creativeBar = (data.creative || []).map((s) => (s && ITEMS[s[0]] ? stack(s[0], 1) : null));
        if (p) {
          for (const k of ['health', 'food', 'saturation', 'exhaustion', 'air']) {
            if (typeof p[k] === 'number') player[k] = p[k];
          }
        }
      } else {
        // Spielstand der ersten Version: nur eine Leiste je Modus.
        inv = Inventory.from(data.bars && data.bars.ueberleben);
        creativeBar = ((data.bars && data.bars.kreativ) || []).map((s) =>
          s && ITEMS[s[0]] ? stack(s[0], 1) : null,
        );
        player.health = data.health ?? 20;
      }
      if (creativeBar.length !== 9) resetCreativeBar();
    } else {
      time = 1000;
      age = 0;
      sel = 0;
      fuel = 0;
      inv = new Inventory(36);
      resetCreativeBar();
    }
    dead = false;

    const spawn = p || world.findSpawn();
    const pcx = Math.floor(spawn.x / CS);
    const pcz = Math.floor(spawn.z / CS);
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) world.generate(pcx + dx, pcz + dz);
    }
    player.teleport(spawn.x, spawn.y, spawn.z);
    if (p) {
      player.yaw = p.yaw || 0;
      player.pitch = p.pitch || 0;
      player.flying = !!p.flying && creative();
    } else {
      player.yaw = 0;
      player.pitch = -0.1;
      player.flying = false;
      player.y = world.surfaceY(Math.floor(spawn.x), Math.floor(spawn.z)) + 1;
    }
    prev = { x: player.x, y: player.y, z: player.z };
    wantedCx = NaN;
    paintAll();
  }

  function save() {
    if (!world) return;
    ctx.store.set(SAVE_KEY, {
      v: 2,
      seed: world.seed,
      mode,
      dist: renderDistance,
      monsters,
      time,
      age,
      sel,
      fuel,
      player: {
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        pitch: player.pitch,
        flying: player.flying,
        health: player.health,
        food: player.food,
        saturation: player.saturation,
        exhaustion: player.exhaustion,
        air: player.air,
      },
      inventory: inv.serialize(),
      creative: creativeBar.map((s) => (s ? [s.id, 1] : null)),
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

  const reach = () => (creative() ? 5 : 4.5);
  const attackReach = () => (creative() ? 5 : 3);

  /** Was liegt unter dem Fadenkreuz: ein Block, ein Wesen oder nichts? */
  function aim(cam) {
    const f = player.forward();
    const block = world.raycast(cam.x, cam.y, cam.z, f[0], f[1], f[2], reach());
    let mob = null;
    let best = Math.min(attackReach(), block ? block.dist : Infinity);
    for (const m of mobs.list) {
      if (m.dead) continue;
      const d = m.hitByRay(cam.x, cam.y, cam.z, f[0], f[1], f[2], best);
      if (d != null && d <= best) {
        best = d;
        mob = m;
      }
    }
    return { block: mob ? null : block, mob };
  }

  function breakAt(t) {
    if (t.id === BEDROCK) return;
    if (!world.setBlock(t.x, t.y, t.z, AIR)) return;
    if (creative()) return;
    const tool = heldId();
    for (const [id, n] of drops(t.id, tool)) give(id, n);
    wearHeld(wearOnBreak(tool, t.id));
    player.exhaust(0.005);
  }

  function blockedByBody(x, y, z) {
    const overlaps = (b) =>
      x + 1 > b.x - b.half &&
      x < b.x + b.half &&
      y + 1 > b.y &&
      y < b.y + b.height &&
      z + 1 > b.z - b.half &&
      z < b.z + b.half;
    if (overlaps({ x: player.x, y: player.y, z: player.z, half: HALF, height: HEIGHT }))
      return true;
    return mobs.list.some((m) => !m.dead && overlaps(m));
  }

  /** Front des Ofens zeigt zum Spieler (Zustand 0..3 = -z, +x, +z, -x). */
  function facingToward(x, z) {
    const dx = player.x - (x + 0.5);
    const dz = player.z - (z + 0.5);
    if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 1 : 3;
    return dz > 0 ? 2 : 0;
  }

  function placeItem(t, s) {
    const id = ITEMS[s.id].block;
    if (!id) return false;
    const def = BLOCKS[id];
    let x = t.x + t.nx;
    let y = t.y + t.ny;
    let z = t.z + t.nz;
    let intoTarget = false;
    if (REPLACEABLE[t.id] && t.id !== WATER) {
      x = t.x;
      y = t.y;
      z = t.z;
      intoTarget = true;
    }
    const there = world.getBlock(x, y, z);
    if (there !== AIR && !REPLACEABLE[there]) return false;
    let meta = 0;
    if (id === TORCH) {
      if (!intoTarget && t.ny === -1) return false; // nicht an die Decke
      if (!intoTarget && t.ny === 0) {
        if (t.nx === 1) meta = 1;
        else if (t.nx === -1) meta = 2;
        else if (t.nz === 1) meta = 3;
        else if (t.nz === -1) meta = 4;
      }
    } else if (id === FURNACE) {
      meta = facingToward(x, z);
    }
    if (!world.hasSupport(x, y, z, id, meta)) return false;
    if (def.solid && blockedByBody(x, y, z)) return false;
    if (!world.setBlock(x, y, z, id, meta)) return false;
    consumeHeld(1);
    return true;
  }

  function fillBucket(cam) {
    const f = player.forward();
    const t = world.raycast(cam.x, cam.y, cam.z, f[0], f[1], f[2], reach(), true);
    if (!t || t.id !== WATER) return false;
    if (!world.setBlock(t.x, t.y, t.z, AIR)) return false;
    swapHeld(WATER_BUCKET);
    return true;
  }

  function pourBucket(t) {
    if (!t) return false;
    let x = t.x + t.nx;
    let y = t.y + t.ny;
    let z = t.z + t.nz;
    if (REPLACEABLE[t.id]) {
      x = t.x;
      y = t.y;
      z = t.z;
    }
    const there = world.getBlock(x, y, z);
    if (there !== AIR && !REPLACEABLE[there]) return false;
    if (!world.setBlock(x, y, z, WATER, 0)) return false;
    swapHeld(BUCKET);
    return true;
  }

  function startEating(auto) {
    const s = held();
    if (!s || !ITEMS[s.id].food || creative()) return false;
    if (player.food >= 20) {
      toast('Du bist satt.');
      return false;
    }
    eating = { ticks: 0, slot: sel, id: s.id, auto };
    return true;
  }

  /** Rechtsklick bzw. kurzes Tippen. */
  function use(h, auto) {
    const b = h.block;
    if (b && (b.id === TABLE || b.id === FURNACE) && !player.sneaking) {
      setPanel(true);
      return;
    }
    const s = held();
    if (!s) return;
    const it = ITEMS[s.id];
    if (it.food) startEating(auto);
    else if (s.id === BUCKET) fillBucket(camera(1));
    else if (s.id === WATER_BUCKET) pourBucket(b);
    else if (it.block && b) placeItem(b, s);
  }

  function attack(mob) {
    const tool = heldId();
    let dmg = attackDamage(tool);
    // Kritischer Treffer im Fallen wie im Vorbild.
    if (player.fallDistance > 0 && !player.onGround && !player.inWater && !player.flying)
      dmg *= 1.5;
    const done = mob.hurt(dmg, player);
    if (!done) return;
    if (!creative()) {
      wearHeld(wearOnAttack(tool));
      player.exhaust(0.1);
    }
    if (mob.dead) for (const [id, n] of mobDrops(mob)) give(id, n);
  }

  function pickBlock(t) {
    if (!creative() || !t || !ITEMS[t.id]) return;
    const at = creativeBar.findIndex((s) => s && s.id === t.id);
    if (at >= 0) sel = at;
    else creativeBar[sel] = stack(t.id, 1);
    paintHotbar();
  }

  /* ---------------------------------------------------------- Spieltick -- */

  function hurtPlayer(amount, cause, from) {
    if (creative() || dead) return;
    const done = player.hurt(amount, cause);
    if (!done) return;
    if (from) player.knockback(from.x, from.z);
    flashAlpha = 0.5;
    paintStats();
    if (player.health <= 0) die();
  }

  function die() {
    dead = true;
    eating = null;
    mouse.left = mouse.right = false;
    if (document.pointerLockElement) document.exitPointerLock();
    setTouchPlay(false);
    showOverlay(
      'Du bist gestorben',
      (DEATH_TEXT[player.cause] || '') + ' Dein Inventar bleibt erhalten.',
      'Wiederbeleben',
      respawn,
    );
  }

  function respawn() {
    const s = world.findSpawn();
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        world.generate(Math.floor(s.x / CS) + dx, Math.floor(s.z / CS) + dz);
      }
    }
    player.teleport(s.x, world.surfaceY(Math.floor(s.x), Math.floor(s.z)) + 1, s.z);
    prev = { x: player.x, y: player.y, z: player.z };
    player.resetStats();
    dead = false;
    paintStats();
    showPause();
  }

  function mobEnv(sky) {
    return {
      player,
      targetable: !creative() && !dead,
      isDay: sky.day > 0.6,
      night: sky.day < 0.35,
      monsters,
      rnd: Math.random,
      despawn: renderDistance * CS + 8,
      attack: (mob, target) => {
        if (target === player) hurtPlayer(mob.species.damage, 'zombie', mob);
      },
      loadedLight: (x, y, z) => {
        const c = world.getChunk(x >> 4, z >> 4);
        return c && c.light ? world.lightAt(x, y, z) : null;
      },
    };
  }

  function readInput() {
    const k = (c) => keys.has(c);
    const input = {
      forward: (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0),
      strafe: (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0),
      jump: k('Space'),
      sneak: k('ShiftLeft') || k('ShiftRight'),
      sprint: k('ControlLeft') || sprintKey,
      noSprint: !creative() && !player.canSprint,
    };
    if (touch.on) {
      const m = touch.move;
      if (m) {
        const len = Math.hypot(m.dx, m.dy) / STICK_R;
        if (len > 0.18) {
          input.forward = Math.max(-1, Math.min(1, -m.dy / STICK_R));
          input.strafe = Math.max(-1, Math.min(1, m.dx / STICK_R));
          if (input.forward > 0.95) input.sprint = true;
        }
      }
      if (touch.jump) input.jump = true;
      if (touch.sneak) input.sneak = true;
    }
    if (!playing()) {
      input.forward = input.strafe = 0;
      input.jump = input.sneak = false;
    }
    return input;
  }

  function tick() {
    prev = { x: player.x, y: player.y, z: player.z };
    player.tick(world, readInput());
    if (!creative()) {
      player.survivalTick();
      if (player.hurtTime === 10) {
        flashAlpha = 0.5;
        if (player.health <= 0 && !dead) die();
      }
    } else {
      player.health = 20;
      player.air = MAX_AIR;
    }

    world.tick();
    const sky = skyState(time);
    mobs.tick(world, mobEnv(sky));
    if (age === 40) mobs.spawnAnimals(world, mobEnv(sky), 10);

    // Weggespuelte oder abgefallene Fackeln und Pflanzen landen im Inventar.
    for (const e of world.events.splice(0)) {
      if (e.type !== 'drop' || creative()) continue;
      if (Math.hypot(e.x + 0.5 - player.x, e.z + 0.5 - player.z) > 8) continue;
      for (const [id, n] of drops(e.id, 0)) give(id, n);
    }

    time = (time + 1) % 24000;
    age++;
    if (breakCooldown > 0) breakCooldown--;
    if (useCooldown > 0) useCooldown--;
    if (attackTimer > 0) attackTimer--;

    // Essen.
    if (eating) {
      const s = held();
      if (eating.slot !== sel || !s || s.id !== eating.id || (!eating.auto && !mouse.right)) {
        eating = null;
      } else if (++eating.ticks >= EAT_TICKS) {
        const [food, sat] = ITEMS[s.id].food;
        player.eat(food, sat);
        consumeHeld(1);
        eating = null;
      }
    }

    if (dead || !playing()) return;
    hit = aim(camera(1));

    if (mouse.left && hit.mob) {
      if (attackTimer === 0) {
        attack(hit.mob);
        attackTimer = 10;
      }
      breakProgress = 0;
      breakTarget = null;
    } else if (mouse.left && hit.block) {
      const t = hit.block;
      if (creative()) {
        if (breakCooldown === 0) {
          breakAt(t);
          breakCooldown = 5;
        }
      } else {
        if (
          !breakTarget ||
          breakTarget.x !== t.x ||
          breakTarget.y !== t.y ||
          breakTarget.z !== t.z
        ) {
          breakTarget = { x: t.x, y: t.y, z: t.z };
          breakProgress = 0;
        }
        if (breakCooldown === 0) {
          const ticks = breakTicks(t.id, heldId(), {
            inWater: player.headInWater,
            onGround: player.onGround || player.flying,
          });
          if (Number.isFinite(ticks)) breakProgress += ticks === 0 ? 1 : 1 / ticks;
          if (breakProgress >= 1) {
            breakAt(t);
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

    if (mouse.right && useCooldown === 0 && !eating) {
      const s = held();
      if (!(s && (s.id === BUCKET || s.id === WATER_BUCKET) && mouse.rightUsed)) use(hit, false);
      mouse.rightUsed = true;
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

  function mobColor(m, sky) {
    const l = world.lightAt(Math.floor(m.x), Math.floor(m.y + m.eyeHeight), Math.floor(m.z));
    const c = lightColor(l.sky, l.block, sky);
    if (m.hurtTime > 0 || m.dead) return [c[0], c[1] * 0.45, c[2] * 0.45];
    if (m.burning > 0) {
      // Brennende Wesen glimmen orange, auch in der Nacht.
      const f = 0.85 + Math.sin(m.age * 1.7) * 0.15;
      return [c[0] * 0.6 + 0.4 * f, c[1] * 0.6 + 0.2 * f, c[2] * 0.6 + 0.06 * f];
    }
    return c;
  }

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

    const alpha = playing() ? acc / TICK_MS : 1;
    const cam = camera(alpha);
    if (playing()) hit = aim(cam);
    else hit = { block: null, mob: null };
    const sky = skyState(time);
    const eyeBlock = world.getBlock(Math.floor(cam.x), Math.floor(cam.y), Math.floor(cam.z));
    const underwater = eyeBlock === WATER;

    entityBuf.reset();
    for (const m of mobs.list) addMob(entityBuf, m, playing() ? alpha : 1, cam, mobColor(m, sky));

    const t = hit.block;
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
      {
        sky,
        renderDistance,
        underwater,
        target: t,
        breakStage: breakProgress > 0 && t ? Math.floor(breakProgress * 10) : -1,
        entities: entityBuf,
      },
    );

    tintEl.style.opacity = underwater ? '1' : '0';
    if (flashAlpha > 0) {
      flashAlpha = Math.max(0, flashAlpha - dt / 600);
      flashEl.style.opacity = String(flashAlpha);
    }
    const useProgress = eating ? eating.ticks / EAT_TICKS : 0;
    useEl.classList.toggle('on', useProgress > 0);
    useEl.firstElementChild.style.width = Math.round(useProgress * 100) + '%';
    paintStats();

    frames++;
    if (now - fpsAt > 500) {
      fps = Math.round((frames * 1000) / (now - fpsAt));
      frames = 0;
      fpsAt = now;
      if (debugOn) paintDebug();
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
    const l = world.lightAt(Math.floor(player.x), Math.floor(player.y), Math.floor(player.z));
    const target = hit.mob
      ? `${hit.mob.species.name} (${Math.ceil(hit.mob.health)} Leben)`
      : hit.block
        ? `${hit.block.x} ${hit.block.y} ${hit.block.z} (${BLOCKS[hit.block.id].name})`
        : '–';
    debugEl.textContent = [
      `${fps} FPS · Chunks ${world.chunks.size} · sichtbar ${renderer.stats.drawn} · ${(renderer.stats.verts / 1000).toFixed(0)}k Ecken`,
      `XYZ ${player.x.toFixed(2)} ${player.y.toFixed(2)} ${player.z.toFixed(2)}`,
      `Chunk ${Math.floor(player.x / CS)} ${Math.floor(player.z / CS)} · Blick ${dir}`,
      `Tempo ${(Math.hypot(player.vx, player.vz) * TPS).toFixed(2)} m/s · ${player.onGround ? 'am Boden' : player.flying ? 'fliegt' : player.inWater ? 'schwimmt' : 'in der Luft'}`,
      `Licht Himmel ${l.sky} · Block ${l.block}`,
      `Hunger ${player.food} · Sättigung ${player.saturation.toFixed(1)} · Erschöpfung ${player.exhaustion.toFixed(2)}`,
      `Tiere ${mobs.passiveCount} · Monster ${mobs.hostileCount} · Wasser-Updates ${world.fluidQueue.size}`,
      `Zeit ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} · Tag ${Math.floor(age / 24000) + 1}`,
      `Seed ${world.seed} · Meereshöhe ${SEA}`,
      `Ziel ${target}`,
    ].join('\n');
  }

  /* ----------------------------------------------------------------- HUD -- */

  function slotHtml(s, i, extraClass = '') {
    if (!s) return `<div class="bw-slot${extraClass}" data-i="${i}" title="leer"></div>`;
    const it = ITEMS[s.id];
    const icon = `<img src="${itemIcon(s.id)}" alt="${it.name}" draggable="false">`;
    const n = s.count > 1 && !(creative() && extraClass.includes('bar')) ? `<b>${s.count}</b>` : '';
    let wear = '';
    if (it.tool && s.wear) {
      const left = 1 - s.wear / it.tool.uses;
      wear = `<i class="bw-dur" style="width:${Math.round(left * 80)}%;background:hsl(${Math.round(left * 120)},80%,45%)"></i>`;
    }
    return `<div class="bw-slot${extraClass}" data-i="${i}" title="${it.name}">${icon}${n}${wear}</div>`;
  }

  function paintHotbar() {
    const slots = bar();
    let html = '';
    for (let i = 0; i < 9; i++) html += slotHtml(slots[i], i, (i === sel ? ' sel' : '') + ' bar');
    hotbarEl.innerHTML = html;
    if (panelOpen) paintPanel();
  }

  function icons(kind, value, max = 20) {
    let out = '';
    for (let i = 0; i < max / 2; i++) {
      const v = value - i * 2;
      const state = v >= 2 ? 'full' : v >= 1 ? 'half' : 'empty';
      out += `<img src="${hudIcon(kind, state)}" alt="">`;
    }
    return out;
  }

  function paintStats() {
    const hp = Math.ceil(player.health);
    const air =
      player.headInWater || player.air < MAX_AIR
        ? Math.max(0, Math.ceil((player.air * 10) / MAX_AIR))
        : -1;
    const key = `${mode}|${hp}|${player.food}|${air}`;
    if (key === statsKey) return;
    statsKey = key;
    if (creative()) {
      statsEl.hidden = true;
      airEl.innerHTML = '';
      return;
    }
    statsEl.hidden = false;
    heartsEl.innerHTML = icons('heart', hp);
    foodEl.innerHTML = icons('food', player.food);
    let bubbles = '';
    if (air >= 0)
      for (let i = 0; i < air; i++) bubbles += `<img src="${hudIcon('bubble')}" alt="">`;
    airEl.innerHTML = bubbles;
  }

  function paintToolbar() {
    stage.classList.toggle('is-creative', creative());
    for (const b of ctx.root.querySelectorAll('[data-mode]')) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    }
    for (const b of ctx.root.querySelectorAll('[data-dist]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.dist) === renderDistance));
    }
    const mb = ctx.root.querySelector('[data-act="monsters"]');
    mb.setAttribute('aria-pressed', String(monsters));
    mb.classList.toggle('on', monsters);
    mb.textContent = monsters ? 'Monster an' : 'Monster aus';
  }

  function paintAll() {
    statsKey = '';
    paintToolbar();
    paintHotbar();
    paintStats();
  }

  /* -------------------------------------------------------------- Inventar -- */

  function recipeHtml(r, i, near) {
    const station = r.at === TABLE ? near.table : r.at === FURNACE ? near.furnace : true;
    const have = inv.canCraft(r);
    const fuelOk = r.at !== FURNACE || fuelAvailable(r) >= 1;
    const can = have && station && fuelOk;
    const ins = r.in
      .map(([id, n]) => {
        const ok = inv.count(id) >= n;
        return `<span class="bw-ing${ok ? '' : ' missing'}"><img src="${itemIcon(id)}" alt="" draggable="false">${n}× ${itemName(id)}</span>`;
      })
      .join('<span class="bw-plus">+</span>');
    let why = '';
    if (!station) why = r.at === TABLE ? 'Werkbank nötig' : 'Ofen nötig';
    else if (!have) why = 'Zutaten fehlen';
    else if (!fuelOk) why = 'Brennstoff fehlt';
    const [out, n] = r.out;
    return `<div class="bw-recipe${can ? '' : ' off'}"><span class="bw-ins">${ins}</span><span class="bw-arrow">→</span>
      <span class="bw-ing"><img src="${itemIcon(out)}" alt="" draggable="false">${n}× ${itemName(out)}</span>
      <button type="button" class="btn${can ? ' primary' : ''}" data-recipe="${i}" ${can ? '' : 'disabled'}>${can ? 'Herstellen' : why}</button></div>`;
  }

  /** Brennstoff, der fuer ein Rezept bereitsteht (ohne die eigenen Zutaten zu verheizen). */
  function fuelAvailable(r) {
    let total = fuel;
    for (const id of FUELS) {
      const need = r.in.filter(([i]) => i === id).reduce((a, [, n]) => a + n, 0);
      total += Math.max(0, inv.count(id) - need) * fuelValue(id);
    }
    return total;
  }

  function burnFuel(r) {
    for (const id of FUELS) {
      if (fuel >= 1) break;
      const need = r.in.filter(([i]) => i === id).reduce((a, [, n]) => a + n, 0);
      while (fuel < 1 && inv.count(id) > need) {
        inv.remove(id, 1);
        fuel += fuelValue(id);
      }
    }
    return fuel >= 1;
  }

  function craft(r) {
    const near = { table: stationNear(TABLE), furnace: stationNear(FURNACE) };
    if (r.at === TABLE && !near.table) return toast('Dafür brauchst du eine Werkbank in der Nähe.');
    if (r.at === FURNACE && !near.furnace)
      return toast('Dafür brauchst du einen Ofen in der Nähe.');
    if (r.at === FURNACE && !burnFuel(r))
      return toast('Es fehlt Brennstoff (Kohle, Holz oder Bretter).');
    const err = inv.craft(r);
    if (err) return toast(err);
    if (r.at === FURNACE) fuel -= 1;
    paintHotbar();
  }

  function paintPanel() {
    if (creative()) {
      panel.innerHTML = `
        <div class="bw-panel-head"><strong>Bausteine und Gegenstände</strong>
          <span>Antippen legt den Gegenstand auf den gewählten Platz der Leiste.</span>
          <button type="button" class="btn" data-close>Schließen</button></div>
        <div class="bw-grid">${CREATIVE_ITEMS.map(
          (id) => `<button type="button" class="bw-item" data-item="${id}" title="${itemName(id)}">
            <img src="${itemIcon(id)}" alt="" draggable="false"><span>${itemName(id)}</span></button>`,
        ).join('')}</div>`;
      return;
    }
    const near = { table: stationNear(TABLE), furnace: stationNear(FURNACE) };
    const groups = [
      ['Aus der Hand', null],
      ['An der Werkbank', TABLE],
      ['Im Ofen', FURNACE],
    ];
    const pickedStack = picked >= 0 ? inv.slots[picked] : null;
    let main = '';
    for (let i = 9; i < 36; i++) main += slotHtml(inv.slots[i], i, i === picked ? ' picked' : '');
    let hot = '';
    for (let i = 0; i < 9; i++) hot += slotHtml(inv.slots[i], i, i === picked ? ' picked' : '');
    const fuelText =
      fuel > 0 ? ` · Glut im Ofen reicht noch für ${Math.floor(fuel * 10) / 10} Vorgänge` : '';
    panel.innerHTML = `
      <div class="bw-panel-head"><strong>Inventar</strong>
        <span>${pickedStack ? itemName(pickedStack.id) + ' gewählt – zweiten Platz antippen zum Tauschen.' : 'Platz antippen, dann einen zweiten zum Tauschen.'}</span>
        ${pickedStack ? '<button type="button" class="btn" data-trash>Wegwerfen</button>' : ''}
        <button type="button" class="btn" data-close>Schließen</button></div>
      <div class="bw-invgrid">${main}</div>
      <div class="bw-invgrid bw-invbar">${hot}</div>
      <div class="bw-panel-head"><strong>Herstellen</strong>
        <span>Werkbank ${near.table ? 'in der Nähe' : 'nicht in der Nähe'} · Ofen ${near.furnace ? 'in der Nähe' : 'nicht in der Nähe'}${fuelText}</span></div>
      ${groups
        .map(
          ([title, at]) =>
            `<div class="bw-group">${title}</div><div class="bw-recipes">${RECIPES.map((r, i) =>
              r.at === at ? recipeHtml(r, i, near) : '',
            ).join('')}</div>`,
        )
        .join('')}`;
  }

  function setPanel(open) {
    panelOpen = open;
    panel.hidden = !open;
    picked = -1;
    if (open) {
      mouse.left = mouse.right = false;
      eating = null;
      endTouches();
      if (document.pointerLockElement) document.exitPointerLock();
      paintPanel();
      overlay.hidden = true;
    } else if (!locked && !forcePlay && !(touch.on && touch.play)) {
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

  /** Startet bzw. setzt fort: Touch geht direkt los, mit Maus braucht es den Pointer-Lock. */
  function begin() {
    if (touch.on) {
      overlay.hidden = true;
      hud.hidden = false;
      setTouchPlay(true);
      ctx.store.play('blockwelt');
    } else {
      lock();
    }
  }

  function showPause() {
    const first = age === 0;
    showOverlay(
      first ? 'Willkommen in der Blockwelt' : 'Pause',
      first
        ? touch.on
          ? 'Tippen, dann mit Daumen steuern. Links gehen, rechts umschauen.'
          : 'Klicken, dann Maus und Tastatur benutzen. Esc pausiert.'
        : 'Dein Fortschritt wird automatisch gespeichert.',
      first ? 'Spielen' : 'Weiter',
      begin,
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
        if (!panelOpen && !touch.on) lock();
        return;
      }
      if (panelOpen) return;

      if (['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.code === 'F3') {
        e.preventDefault();
        debugOn = !debugOn;
        debugEl.hidden = !debugOn;
        if (debugOn) paintDebug();
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
        if (e.timeStamp - tapSpace < 300) toggleFly();
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
    mouse.left = mouse.right = false;
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
    if (e.button === 0) {
      mouse.left = true;
      attackTimer = 0;
    } else if (e.button === 2) {
      mouse.right = true;
      mouse.rightUsed = false;
      useCooldown = 0;
    } else if (e.button === 1) pickBlock(hit.block);
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

  ctx.on(hotbarEl, 'pointerdown', (e) => {
    const slot = e.target.closest('.bw-slot');
    if (!slot) return;
    sel = Number(slot.dataset.i);
    paintHotbar();
  });

  ctx.on(panel, 'click', (e) => {
    if (e.target.closest('[data-close]')) {
      setPanel(false);
      if (!touch.on) lock();
      return;
    }
    const item = e.target.closest('[data-item]');
    if (item) {
      creativeBar[sel] = stack(Number(item.dataset.item), 1);
      paintHotbar();
      return;
    }
    if (e.target.closest('[data-trash]')) {
      if (picked >= 0) inv.slots[picked] = null;
      picked = -1;
      paintHotbar();
      return;
    }
    const slot = e.target.closest('.bw-slot');
    if (slot && !creative()) {
      const i = Number(slot.dataset.i);
      if (picked < 0) {
        if (inv.slots[i]) picked = i;
      } else {
        inv.move(picked, i);
        picked = -1;
      }
      paintHotbar();
      return;
    }
    const rec = e.target.closest('[data-recipe]');
    if (rec) craft(RECIPES[Number(rec.dataset.recipe)]);
  });

  /* ---------------------------------------------------------------- Touch -- */

  const zoneMove = $('#zoneMove');
  const zoneLook = $('#zoneLook');
  const stick = $('#stick');
  const knob = stick.firstElementChild;

  function setTouchMode(on) {
    if (touch.on === on) return;
    touch.on = on;
    stage.classList.toggle('touch', on);
    ctx.root.classList.toggle('bw-is-touch', on);
    if (!on) setTouchPlay(false);
  }

  /** Im Touch-Modus fuellt das Spiel waehrend des Spielens den ganzen Bildschirm. */
  function setTouchPlay(on) {
    touch.play = on && touch.on;
    stage.classList.toggle('immersive', touch.play);
    if (touch.play) window.scrollTo(0, 0);
    else endTouches();
  }

  function endTouches() {
    if (touch.look) clearTimeout(touch.look.timer);
    touch.move = touch.look = null;
    touch.jump = touch.sneak = false;
    mouse.left = false;
    stick.classList.remove('on');
    knob.style.transform = '';
  }

  function touchPause() {
    save();
    setTouchPlay(false);
    showPause();
  }

  if (coarse) setTouchMode(true);
  // Auch Laptops mit Touchscreen: der erste Fingerdruck schaltet um.
  ctx.on(
    stage,
    'pointerdown',
    (e) => {
      if (e.pointerType === 'touch' && !touch.on) setTouchMode(true);
    },
    true,
  );

  ctx.on(zoneMove, 'pointerdown', (e) => {
    if (!playing() || touch.move) return;
    e.preventDefault();
    zoneMove.setPointerCapture(e.pointerId);
    const box = zoneMove.getBoundingClientRect();
    touch.move = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
    stick.style.left = e.clientX - box.left + 'px';
    stick.style.top = e.clientY - box.top + 'px';
    stick.classList.add('on');
  });
  ctx.on(zoneMove, 'pointermove', (e) => {
    const m = touch.move;
    if (!m || m.id !== e.pointerId) return;
    let dx = e.clientX - m.ox;
    let dy = e.clientY - m.oy;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) {
      dx = (dx / len) * STICK_R;
      dy = (dy / len) * STICK_R;
    }
    m.dx = dx;
    m.dy = dy;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  const endMove = (e) => {
    if (touch.move && touch.move.id === e.pointerId) {
      touch.move = null;
      stick.classList.remove('on');
      knob.style.transform = '';
    }
  };
  ctx.on(zoneMove, 'pointerup', endMove);
  ctx.on(zoneMove, 'pointercancel', endMove);

  ctx.on(zoneLook, 'pointerdown', (e) => {
    if (!playing() || touch.look) return;
    e.preventDefault();
    zoneLook.setPointerCapture(e.pointerId);
    const look = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      sx: e.clientX,
      sy: e.clientY,
      t: performance.now(),
      moved: false,
      holding: false,
      timer: 0,
    };
    // Halten ohne Wischen = abbauen (bzw. weiter angreifen).
    look.timer = setTimeout(() => {
      if (touch.look === look && !look.moved) {
        look.holding = true;
        mouse.left = true;
        attackTimer = 0;
      }
    }, 260);
    touch.look = look;
  });
  ctx.on(zoneLook, 'pointermove', (e) => {
    const l = touch.look;
    if (!l || l.id !== e.pointerId) return;
    if (!l.moved && Math.hypot(e.clientX - l.sx, e.clientY - l.sy) > 12) l.moved = true;
    player.yaw -= (e.clientX - l.x) * TOUCH_SENSITIVITY;
    player.pitch -= (e.clientY - l.y) * TOUCH_SENSITIVITY;
    player.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, player.pitch));
    l.x = e.clientX;
    l.y = e.clientY;
  });
  const endLook = (e) => {
    const l = touch.look;
    if (!l || l.id !== e.pointerId) return;
    clearTimeout(l.timer);
    touch.look = null;
    if (l.holding) mouse.left = false;
    else if (!l.moved && e.type === 'pointerup' && performance.now() - l.t < 300 && playing()) {
      // Kurzes Tippen: Wesen angreifen, sonst setzen/essen/benutzen.
      const h = aim(camera(1));
      if (h.mob) attack(h.mob);
      else use(h, true);
    }
  };
  ctx.on(zoneLook, 'pointerup', endLook);
  ctx.on(zoneLook, 'pointercancel', endLook);

  const touchUi = $('#touchUi');
  ctx.on(touchUi, 'pointerdown', (e) => {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    e.preventDefault();
    const act = b.dataset.t;
    if (act === 'jump') {
      touch.jump = true;
      // Zweimal schnell tippen = Flugmodus (Kreativ), wie bei der Leertaste.
      if (creative() && e.timeStamp - tapSpace < 300) toggleFly();
      tapSpace = e.timeStamp;
    } else if (act === 'sneak') touch.sneak = true;
    else if (act === 'fly') toggleFly();
    else if (act === 'inv') setPanel(!panelOpen);
    else if (act === 'pause') touchPause();
  });
  const releaseButtons = (e) => {
    const b = e.target.closest && e.target.closest('[data-t]');
    if (!b) return;
    if (b.dataset.t === 'jump') touch.jump = false;
    if (b.dataset.t === 'sneak') touch.sneak = false;
  };
  ctx.on(touchUi, 'pointerup', releaseButtons);
  ctx.on(touchUi, 'pointercancel', releaseButtons);
  ctx.on(touchUi, 'pointerout', releaseButtons);
  ctx.on(touchUi, 'contextmenu', (e) => e.preventDefault());

  // App-Wechsel oder gesperrter Bildschirm: automatisch pausieren.
  ctx.on(document, 'visibilitychange', () => {
    if (document.hidden && touch.play) touchPause();
  });

  function toggleFly() {
    if (!creative()) return;
    player.flying = !player.flying;
    player.vy = 0;
    toast(player.flying ? 'Flugmodus an' : 'Flugmodus aus');
  }

  /* -------------------------------------------------------------- Toolbar -- */

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    player.flying = false;
    eating = null;
    breakProgress = 0;
    if (player.health <= 0) player.health = 1;
    paintAll();
    if (panelOpen) paintPanel();
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
    } else if (b.dataset.act === 'monsters') {
      monsters = !monsters;
      if (!monsters) mobs.list = mobs.list.filter((m) => !m.species.hostile);
      paintToolbar();
      save();
    } else if (b.dataset.act === 'full') {
      if (document.fullscreenElement) document.exitFullscreen();
      else stage.requestFullscreen?.();
    } else if (b.dataset.act === 'new') {
      askNewWorld();
    }
  });

  /** Neue Welt – mit Rueckfrage im Spiel selbst (Browser-Dialoge sind nicht ueberall erlaubt). */
  function askNewWorld() {
    overlay.hidden = false;
    overlay.innerHTML = `<div class="big">Neue Welt anlegen?</div>
      <div class="sub">Die bisherige Welt und dein Inventar gehen dabei verloren.</div>`;
    const row = document.createElement('div');
    row.className = 'bw-choice';
    const yes = document.createElement('button');
    yes.className = 'btn primary';
    yes.textContent = 'Neue Welt';
    yes.addEventListener('click', () => {
      for (const c of world.chunks.values()) renderer.freeChunk(c);
      startWorld(null);
      save();
      showPause();
    });
    const no = document.createElement('button');
    no.className = 'btn';
    no.textContent = 'Abbrechen';
    no.addEventListener('click', showPause);
    row.append(yes, no);
    overlay.appendChild(row);
    if (document.pointerLockElement) document.exitPointerLock();
    setTouchPlay(false);
  }

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

  // Fuer Tests und Neugierige: Zugriff auf das Innenleben.
  stage.__bw = {
    get world() {
      return world;
    },
    player,
    renderer,
    touch,
    mobs,
    entityBuf,
    get inv() {
      return inv;
    },
    tick,
    camera,
    give,
    setMode,
    spawnMob(kind, x, y, z) {
      const m = new Mob(kind, x, y, z);
      mobs.list.push(m);
      return m;
    },
    select(i) {
      sel = i;
      paintHotbar();
    },
    setPlay(on) {
      forcePlay = on;
      if (on) {
        overlay.hidden = true;
        hud.hidden = false;
      }
    },
    get state() {
      return { mode, time, health: player.health, food: player.food, sel, age, fuel, monsters };
    },
    set time(t) {
      time = t;
    },
  };
}
