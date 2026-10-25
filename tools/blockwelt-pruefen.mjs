/**
 * Prueft Welt, Physik und Spielregeln der Blockwelt ohne Browser.
 *
 *   node tools/blockwelt-pruefen.mjs
 *
 * Die Regeln sind aus den dokumentierten Werten des Vorbilds abgeleitet. Stimmen
 * die Ergebnisse mit den bekannten Messwerten ueberein (4,317 m/s gehen, 5,612 m/s
 * sprinten, 1,25 Bloecke Sprunghoehe, 7,5 s Stein mit der Hand, 7 Bloecke
 * Wasserfluss, Fackellicht 14 …), sind die Werte richtig uebernommen.
 */

import { World, CS, CH, SEA } from '../assets/games/blockwelt/world.js';
import { Player } from '../assets/games/blockwelt/player.js';
import { Mob } from '../assets/games/blockwelt/entities.js';
import { meshChunk } from '../assets/games/blockwelt/mesher.js';
import {
  AIR,
  STONE,
  WATER,
  SAND,
  DIRT,
  LOG,
  PLANKS,
  COBBLE,
  IRON_ORE,
  BEDROCK,
  TORCH,
  TABLE,
  POPPY,
  TALL_GRASS,
} from '../assets/games/blockwelt/blocks.js';
import {
  breakTicks,
  drops,
  Inventory,
  RECIPES,
  STICK,
  toolId,
  WOOD_PICKAXE,
  STONE_PICKAXE,
  IRON_PICKAXE,
  WOOD_SWORD,
  attackDamage,
} from '../assets/games/blockwelt/items.js';

let failed = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' – ' + detail : ''}`);
  if (!ok) failed++;
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

/* ------------------------------------------------------------- Welt -- */

const a = new World(1234);
const b = new World(1234);
const c = new World(4321);
a.generate(3, -2);
b.generate(3, -2);
c.generate(3, -2);
const same = a.getChunk(3, -2).blocks.every((v, i) => v === b.getChunk(3, -2).blocks[i]);
const differs = a.getChunk(3, -2).blocks.some((v, i) => v !== c.getChunk(3, -2).blocks[i]);
check('Gleicher Seed erzeugt dieselbe Welt', same);
check('Anderer Seed erzeugt eine andere Welt', differs);

// Baeume duerfen an Chunk-Grenzen nicht abgeschnitten werden: Nachbarn muessen nahtlos passen.
{
  const w1 = new World(99);
  const w2 = new World(99);
  for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) w1.generate(x, z);
  w2.generate(0, 0); // allein erzeugt: gleiche Bloecke wie im Verbund
  check(
    'Chunk-Inhalt haengt nicht von der Erzeugungsreihenfolge ab',
    w1.getChunk(0, 0).blocks.every((v, i) => v === w2.getChunk(0, 0).blocks[i]),
  );
}

{
  let water = 0;
  let stone = 0;
  let air = 0;
  let minH = CH;
  let maxH = 0;
  const w = new World(7);
  for (let cx = -6; cx <= 6; cx++) {
    for (let cz = -6; cz <= 6; cz++) {
      const ch = w.generate(cx, cz);
      for (let i = 0; i < CS * CS; i++) {
        minH = Math.min(minH, ch.top[i]);
        maxH = Math.max(maxH, ch.top[i]);
      }
      for (const id of ch.blocks) {
        if (id === WATER) water++;
        else if (id === STONE) stone++;
        else if (id === AIR) air++;
      }
    }
  }
  check('Welt hat Land und Wasser und Stein', water > 0 && stone > 0 && air > 0, `${water} Wasser`);
  check('Geländehöhe bleibt im Bereich', minH >= 1 && maxH < CH - 4, `${minH}…${maxH}`);
  const s = w.findSpawn();
  w.generate(Math.floor(s.x / CS), Math.floor(s.z / CS));
  check('Startpunkt liegt über dem Meer', s.y > SEA);
}

// Aenderungen ueberleben Speichern und Neuladen.
{
  const w = new World(5);
  w.generate(0, 0);
  w.setBlock(3, 40, 3, SAND);
  w.setBlock(4, 12, 4, AIR);
  const data = JSON.parse(JSON.stringify(w.serializeEdits()));
  const w2 = new World(5, World.parseEdits(data));
  w2.generate(0, 0);
  check(
    'Spieleränderungen werden gespeichert und wiederhergestellt',
    w2.getBlock(3, 40, 3) === SAND && w2.getBlock(4, 12, 4) === AIR,
  );
  check('Grundgestein lässt sich nicht entfernen', !w.setBlock(2, 0, 2, AIR));
}

// Strahlentest gegen bekannte Geometrie.
{
  const w = new World(5);
  w.generate(0, 0);
  for (let y = 30; y < 60; y++) {
    for (let x = 6; x <= 10; x++) for (let z = 2; z <= 10; z++) w.setBlock(x, y, z, AIR);
  }
  w.setBlock(8, 50, 8, STONE);
  const hit = w.raycast(8.5, 50.5, 3.5, 0, 0, 1, 10);
  check(
    'Strahl trifft Block samt Seitenfläche',
    hit && hit.x === 8 && hit.z === 8 && hit.nz === -1,
    JSON.stringify(hit),
  );
  const miss = w.raycast(8.5, 55.5, 3.5, 0, 0, 1, 10);
  check('Strahl daneben trifft nichts', miss === null);
}

/* ----------------------------------------------------------- Physik -- */

/** Ebener Boden bei y = 0 (oberster Block y = -1), optional Wasser. */
function flat(extra = {}) {
  return {
    solidAt: (x, y, z) => (extra.solid ? extra.solid(x, y, z) : false) || y < 0,
    isWater: (x, y, z) => (extra.water ? extra.water(x, y, z) : false),
  };
}

function settle(p, w) {
  for (let i = 0; i < 40; i++) p.tick(w, { forward: 0, strafe: 0 });
}

{
  const w = flat();
  const p = new Player();
  p.teleport(0.5, 0, 0.5);
  settle(p, w);
  check('Spieler steht auf dem Boden', p.onGround && near(p.y, 0, 1e-6));

  for (let i = 0; i < 60; i++) p.tick(w, { forward: 1, strafe: 0 });
  const t0 = p.z;
  for (let i = 0; i < 20; i++) p.tick(w, { forward: 1, strafe: 0 });
  const walk = Math.abs(p.z - t0); // Strecke pro Sekunde im Beharrungszustand
  check('Gehtempo ≈ 4,317 m/s', near(walk, 4.317, 0.03), walk.toFixed(3));

  const q = new Player();
  q.teleport(0.5, 0, 0.5);
  settle(q, w);
  for (let i = 0; i < 60; i++) q.tick(w, { forward: 1, strafe: 0, sprint: true });
  const s0 = q.z;
  for (let i = 0; i < 20; i++) q.tick(w, { forward: 1, strafe: 0, sprint: true });
  const sprint = Math.abs(q.z - s0);
  check('Sprinttempo ≈ 5,612 m/s', near(sprint, 5.612, 0.04), sprint.toFixed(3));

  const j = new Player();
  j.teleport(0.5, 0, 0.5);
  settle(j, w);
  let apex = 0;
  j.tick(w, { forward: 0, strafe: 0, jump: true });
  for (let i = 0; i < 30; i++) {
    j.tick(w, { forward: 0, strafe: 0 });
    apex = Math.max(apex, j.y);
  }
  check('Sprunghöhe ≈ 1,252 Blöcke', near(apex, 1.2522, 0.02), apex.toFixed(4));

  const f = new Player();
  f.teleport(0.5, 20, 0.5);
  let dmg = 0;
  for (let i = 0; i < 100 && !f.onGround; i++) {
    f.tick(w, { forward: 0, strafe: 0 });
    dmg = f.landedDamage || dmg;
  }
  check('Sturz aus 20 Blöcken richtet 17 Schaden an', dmg === 17, String(dmg));

  const g = new Player();
  g.teleport(0.5, 3, 0.5);
  dmg = 0;
  for (let i = 0; i < 100 && !g.onGround; i++) {
    g.tick(w, { forward: 0, strafe: 0 });
    dmg = g.landedDamage || dmg;
  }
  check('Sturz aus 3 Blöcken ist harmlos', dmg === 0, String(dmg));
}

{
  // Wand: man darf nicht hindurchlaufen, auch nicht bei hohem Tempo.
  const w = flat({ solid: (x, y, z) => z >= 6 && y >= 0 && y < 4 });
  const p = new Player();
  p.teleport(0.5, 0, 0.5);
  settle(p, w);
  p.vz = 3;
  for (let i = 0; i < 20; i++) p.tick(w, { forward: 0, strafe: 0 });
  check('Wand hält auch Tempo 3 Blöcke/Tick auf', p.z <= 6 - 0.3 + 1e-6, p.z.toFixed(3));
}

{
  // Schleichen: kein Absturz ueber die Kante.
  const w = flat({ solid: (x, y, z) => y < 0 && z < 3 });
  const p = new Player();
  w.solidAt = (x, y, z) => y < 0 && z < 3; // Boden endet bei z = 3
  p.teleport(0.5, 0, 1.5);
  settle(p, w);
  for (let i = 0; i < 60; i++) p.tick(w, { forward: -1, strafe: 0, sneak: true });
  check(
    'Schleichen: Spieler bleibt auf dem Boden',
    p.y === 0 || near(p.y, 0, 1e-6),
    p.y.toFixed(3),
  );
}

{
  // Schwimmen: Auftrieb mit Sprungtaste, langsames Sinken ohne.
  const w = flat({ water: (x, y, z) => y >= 0 && y < 10 });
  const p = new Player();
  p.teleport(0.5, 5, 0.5);
  for (let i = 0; i < 40; i++) p.tick(w, { forward: 0, strafe: 0 });
  check('Im Wasser sinkt man langsam', p.y > 0 && p.y < 5 && p.vy > -0.3);
  for (let i = 0; i < 100; i++) p.tick(w, { forward: 0, strafe: 0, jump: true });
  check('Mit Sprungtaste steigt man im Wasser', p.y > 5);
}

/* ---------------------------------------------------------- Abbauen -- */

check('Erde mit der Hand: 15 Ticks (0,75 s)', breakTicks(DIRT, 0) === 15);
check(
  'Stein mit der Hand: 150 Ticks (7,5 s), ohne Beute',
  breakTicks(STONE, 0) === 150 && drops(STONE, 0).length === 0,
);
check(
  'Stein mit der Holzspitzhacke: 23 Ticks (1,15 s), gibt Bruchstein',
  breakTicks(STONE, WOOD_PICKAXE) === 23 && drops(STONE, WOOD_PICKAXE)[0][0] === COBBLE,
);
check('Stein mit der Steinspitzhacke: 12 Ticks (0,6 s)', breakTicks(STONE, STONE_PICKAXE) === 12);
check(
  'Eisenerz braucht mindestens eine Steinspitzhacke',
  drops(IRON_ORE, WOOD_PICKAXE).length === 0 && drops(IRON_ORE, STONE_PICKAXE)[0][0] === IRON_ORE,
);
check(
  'Eisenerz mit der Eisenspitzhacke: 15 Ticks (0,75 s)',
  breakTicks(IRON_ORE, IRON_PICKAXE) === 15,
);
check(
  'Holz: mit der Hand 3 s, mit der Holzaxt 1,5 s',
  breakTicks(LOG, 0) === 60 && breakTicks(LOG, toolId('axe', 0)) === 30,
);
check(
  'Unter Wasser und in der Luft je fünfmal langsamer',
  breakTicks(DIRT, 0, { inWater: true, onGround: false }) === 375,
);
check('Grundgestein ist unzerstörbar', breakTicks(BEDROCK, IRON_PICKAXE) === Infinity);
check('Fackeln gehen sofort ab', breakTicks(TORCH, 0) === 0);
check(
  'Holzschwert macht 4 Schaden, die Hand 1',
  attackDamage(WOOD_SWORD) === 4 && attackDamage(0) === 1,
);

/* ------------------------------------------------- Inventar, Rezepte -- */

{
  const inv = new Inventory();
  inv.add(LOG, 2);
  const planks = RECIPES.find((r) => r.out[0] === PLANKS);
  check(
    'Aus 1 Holz werden 4 Bretter',
    inv.craft(planks) === null && inv.count(PLANKS) === 4 && inv.count(LOG) === 1,
  );
  inv.add(COBBLE, 70);
  const stacks = inv.slots.filter((s) => s && s.id === COBBLE).map((s) => s.count);
  check('Stapel fassen 64 Stück', stacks.join() === '64,6', stacks.join());
  const pick = RECIPES.find((r) => r.out[0] === WOOD_PICKAXE);
  check('Werkzeuge entstehen an der Werkbank', pick.at === TABLE);
  inv.add(STICK, 2);
  inv.add(PLANKS, 3);
  check(
    'Holzspitzhacke aus 3 Brettern und 2 Stöcken',
    inv.craft(pick) === null && inv.count(WOOD_PICKAXE) === 1 && inv.count(STICK) === 0,
  );
  check('Ohne Zutaten klappt nichts', inv.craft(pick) !== null);
}

/* --------------------------------------------------- Testwelt (flach) -- */

function flatWorld(seed) {
  const w = new World(seed);
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) w.generate(x, z);
  const y0 = 40;
  for (let x = -30; x <= 30; x++) {
    for (let z = -30; z <= 30; z++) {
      for (let y = y0; y < y0 + 10; y++) w.setBlock(x, y, z, AIR);
      w.setBlock(x, y0 - 1, z, STONE);
      w.setBlock(x, y0 - 2, z, STONE);
    }
  }
  w.fluidQueue.clear();
  w.events.length = 0;
  return { w, y0 };
}

/* ------------------------------------------------------------ Wasser -- */

{
  const { w, y0 } = flatWorld(3);
  w.setBlock(0, y0, 0, WATER, 0);
  for (let i = 0; i < 300; i++) w.tick();
  let row = '';
  for (let x = 0; x <= 8; x++) row += w.getBlock(x, y0, 0) === WATER ? w.getMeta(x, y0, 0) : '.';
  check('Wasser fließt 7 Blöcke weit, je Block eine Stufe', row === '01234567.', row);
  w.setBlock(0, y0, 0, AIR);
  for (let i = 0; i < 400; i++) w.tick();
  let wet = 0;
  for (let x = -9; x <= 9; x++) for (let z = -9; z <= 9; z++) if (w.isWater(x, y0, z)) wet++;
  check('Ohne Quelle trocknet der Fluss aus', wet === 0, wet + ' nasse Felder');
  w.setBlock(0, y0, 0, WATER, 0);
  w.setBlock(2, y0, 0, WATER, 0);
  for (let i = 0; i < 100; i++) w.tick();
  check(
    'Zwischen zwei Quellen entsteht eine neue Quelle',
    w.isWater(1, y0, 0) && w.getMeta(1, y0, 0) === 0,
  );
}

{
  const { w, y0 } = flatWorld(5);
  w.setBlock(3, y0 - 1, 0, AIR);
  w.setBlock(3, y0 - 2, 0, AIR);
  w.setBlock(0, y0, 0, WATER, 0);
  for (let i = 0; i < 6; i++) w.tick();
  check(
    'Wasser fließt zum nächsten Gefälle (Loch 3 Blöcke östlich)',
    w.isWater(1, y0, 0) && !w.isWater(-1, y0, 0) && !w.isWater(0, y0, 1) && !w.isWater(0, y0, -1),
  );
  for (let i = 0; i < 100; i++) w.tick();
  check('…und fällt hinein', w.isWater(3, y0 - 1, 0) && w.getMeta(3, y0 - 1, 0) === 8);
}

/* ------------------------------------------------- Schwerkraft, Halt -- */

{
  const { w, y0 } = flatWorld(7);
  w.setBlock(0, y0 + 4, 0, SAND);
  check(
    'Sand fällt bis auf den Boden',
    w.getBlock(0, y0, 0) === SAND && w.getBlock(0, y0 + 4, 0) === AIR,
  );
  w.setBlock(5, y0, 5, STONE);
  w.setBlock(6, y0, 5, TORCH, 1);
  w.setBlock(5, y0, 5, AIR);
  check(
    'Fackel fällt ab, wenn die Wand fehlt',
    w.getBlock(6, y0, 5) === AIR && w.events.some((e) => e.id === TORCH),
  );
  w.setBlock(8, y0 - 1, 8, DIRT);
  w.setBlock(8, y0, 8, POPPY);
  w.setBlock(8, y0 - 1, 8, AIR);
  check('Blume ohne Erde verschwindet', w.getBlock(8, y0, 8) === AIR);
  w.setBlock(10, y0, 10, TALL_GRASS);
  w.setBlock(11, y0, 10, WATER, 0);
  for (let i = 0; i < 20; i++) w.tick();
  check('Fließendes Wasser spült Pflanzen weg', w.isWater(10, y0, 10));

  w.setBlock(12, y0, 12, WATER, 3);
  w.setBlock(13, y0, 12, TORCH, 2);
  const w2 = new World(w.seed, World.parseEdits(JSON.parse(JSON.stringify(w.serializeEdits()))));
  w2.generate(0, 0);
  check(
    'Zustände (Wasserstand, Fackelrichtung) überleben das Speichern',
    w2.getMeta(12, y0, 12) === w.getMeta(12, y0, 12) &&
      w2.getMeta(13, y0, 12) === w.getMeta(13, y0, 12),
  );
}

/* ------------------------------------------------------------- Licht -- */

{
  const { w, y0 } = flatWorld(9);
  for (let x = -3; x <= 3; x++) {
    for (let y = 0; y <= 5; y++) {
      for (let z = -3; z <= 3; z++) {
        const edge = Math.abs(x) === 3 || Math.abs(z) === 3 || y === 0 || y === 5;
        w.setBlock(x, y0 + y, z, edge ? STONE : AIR);
      }
    }
  }
  w.setBlock(0, y0 + 1, 0, TORCH, 0);
  meshChunk(w, w.getChunk(0, 0));
  const L = (x, y, z) => w.lightAt(x, y, z);
  check(
    'Fackel leuchtet mit 14, je Block eins weniger',
    L(0, y0 + 1, 0).block === 14 && L(1, y0 + 1, 0).block === 13 && L(2, y0 + 1, 0).block === 12,
  );
  check('Die Wand hält das Licht auf', L(4, y0 + 1, 0).block === 0);
  check('In der geschlossenen Kammer gibt es kein Himmelslicht', L(1, y0 + 2, 1).sky === 0);

  for (let x = 6; x <= 11; x++) for (let z = 6; z <= 11; z++) w.setBlock(x, y0 + 3, z, STONE);
  meshChunk(w, w.getChunk(0, 0));
  check('Unter freiem Himmel Stufe 15', L(14, y0, 14).sky === 15);
  check(
    'Unter einem Dach sickert Himmelslicht seitlich ein',
    L(9, y0, 9).sky === 12,
    String(L(9, y0, 9).sky),
  );

  const m = meshChunk(w, w.getChunk(0, 0));
  check(
    'Netz enthält keine ungültigen Zahlen',
    m.solid.every(Number.isFinite) && m.water.every(Number.isFinite),
  );
}

/* ------------------------------------------------------------ Hunger -- */

{
  const w = flat();
  const p = new Player();
  p.teleport(0.5, 0, 0.5);
  settle(p, w);
  p.food = 20;
  p.saturation = 0;
  p.exhaustion = 0;
  const z0 = p.z;
  for (let i = 0; i < 200; i++) {
    p.tick(w, { forward: 1, strafe: 0, sprint: true });
    p.survivalTick();
  }
  const dist = Math.abs(p.z - z0);
  check(
    'Sprinten kostet 0,1 Erschöpfung je Meter',
    p.food === 19 && near(p.exhaustion, dist * 0.1 - 4, 0.06),
    `${dist.toFixed(1)} m, Hunger ${p.food}, Erschöpfung ${p.exhaustion.toFixed(2)}`,
  );

  const q = new Player();
  q.health = 10;
  q.food = 20;
  q.saturation = 5;
  // Im Vorbild wird die Erschoepfung erst im folgenden Tick verrechnet.
  for (let i = 0; i < 11; i++) q.survivalTick();
  check(
    'Satt heilt man schnell: 5/6 Leben in 10 Ticks, kostet Sättigung',
    near(q.health, 10 + 5 / 6, 1e-6) && q.saturation === 4,
    `${q.health.toFixed(3)} Leben, Sättigung ${q.saturation}`,
  );

  const r = new Player();
  r.health = 5;
  r.food = 0;
  r.saturation = 0;
  for (let i = 0; i < 80 * 10; i++) {
    r.invuln = 0;
    r.survivalTick();
  }
  check('Verhungern endet bei einem halben Herz', r.health === 1, String(r.health));
}

{
  const w = flat({ water: (x, y) => y >= 0 && y < 10 });
  const p = new Player();
  p.teleport(0.5, 2, 0.5);
  for (let i = 0; i < 300; i++) {
    p.tick(w, { forward: 0, strafe: 0 });
    p.survivalTick();
  }
  const before = p.health;
  for (let i = 0; i < 25; i++) {
    p.tick(w, { forward: 0, strafe: 0 });
    p.survivalTick();
  }
  check(
    'Unter Wasser reicht die Luft 15 s, dann 2 Schaden',
    before === 20 && p.health === 18,
    `${before} -> ${p.health}`,
  );
}

/* ------------------------------------------------------------- Wesen -- */

{
  const { w, y0 } = flatWorld(11);
  const p = new Player();
  p.teleport(28.5, y0, 0.5);
  const env = {
    player: p,
    targetable: true,
    isDay: false,
    night: true,
    monsters: true,
    rnd: Math.random,
    despawn: 500,
    attack: () => {},
    loadedLight: () => null,
  };
  const z = new Mob('zombie', -5.5, y0, 0.5);
  z.target = p;
  for (let i = 0; i < 60; i++) z.tick(w, env);
  const x0 = z.x;
  for (let i = 0; i < 20; i++) z.tick(w, env);
  check('Zombie läuft ≈ 2,28 m/s (Tempo 0,23)', near(z.x - x0, 2.284, 0.05), (z.x - x0).toFixed(3));

  let hits = 0;
  env.attack = () => hits++;
  z.teleport(p.x - 1, y0, p.z);
  for (let i = 0; i < 60; i++) z.tick(w, env);
  check('Zombie schlägt einmal pro Sekunde zu', hits === 3, String(hits));

  const pig = new Mob('schwein', 0.5, y0, 5.5);
  pig.hurt(4, p);
  pig.hurt(4, p);
  check('Nach einem Treffer kurz unverwundbar', pig.health === 6, String(pig.health));
  for (let i = 0; i < 10; i++) pig.tick(w, env);
  pig.hurt(4, p);
  check('…danach trifft es wieder', pig.health === 2, String(pig.health));
  check('Getroffene Tiere fliehen', pig.panic > 0);
}

console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : '\nAlles in Ordnung.');
process.exit(failed ? 1 : 0);
