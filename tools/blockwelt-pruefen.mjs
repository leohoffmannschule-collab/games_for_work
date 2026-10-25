/**
 * Prueft Welt und Physik der Blockwelt ohne Browser.
 *
 *   node tools/blockwelt-pruefen.mjs
 *
 * Die Bewegungsregeln sind aus den dokumentierten Konstanten des Vorbilds
 * abgeleitet. Stimmt das Ergebnis mit den bekannten Messwerten ueberein
 * (4,317 m/s gehen, 5,612 m/s sprinten, 1,25 Bloecke Sprunghoehe), sind die
 * Konstanten richtig uebernommen.
 */

import { World, CS, CH, SEA } from '../assets/games/blockwelt/world.js';
import { Player, TPS } from '../assets/games/blockwelt/player.js';
import { AIR, STONE, WATER, SAND } from '../assets/games/blockwelt/blocks.js';

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

console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : '\nAlles in Ordnung.');
process.exit(failed ? 1 : 0);
