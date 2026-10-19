// Höhlen-Mechanik: Höhlenform per zellulärem Automaten, Monster-Register und -Verhalten.
// Was in einer Ebene liegt (Steine, Erze, Schätze, welche Monster wo), legt der
// Bereich „mine" fest (bereiche/mine/inhalt.js).

import { T } from './daten.js';

export const MONSTER = {};

/**
 * monster(id, { name, hp, schaden, tempo, xp, farbe, art: 'schleim'|'fledermaus', fliegt, beute: [[id, chance, von, bis]…] })
 * `art` wählt Verhalten (und Bild); weitere Verhalten über `schritt(m, dt, spieler, frei)`.
 */
export function monster(id, def) {
  const { ersetzen, ...d } = def;
  if (MONSTER[id] && !ersetzen) throw new Error(`Monster „${id}" gibt es schon.`);
  MONSTER[id] = { id, ...d };
  return MONSTER[id];
}

function automat(r, W, H, dichte) {
  let g = [];
  for (let y = 0; y < H; y++) {
    g.push([]);
    for (let x = 0; x < W; x++) {
      const rand = x === 0 || y === 0 || x === W - 1 || y === H - 1;
      g[y].push(rand || r() < dichte);
    }
  }
  for (let runde = 0; runde < 4; runde++) {
    const neu = g.map((z) => z.slice());
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy][x + dx]) n++;
        neu[y][x] = n >= 5;
      }
    }
    g = neu;
  }
  return g;
}

function groessteFlaeche(g, W, H) {
  const gesehen = new Set();
  let beste = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (g[y][x] || gesehen.has(y * W + x)) continue;
      const flaeche = [];
      const offen = [[x, y]];
      gesehen.add(y * W + x);
      while (offen.length) {
        const [cx, cy] = offen.pop();
        flaeche.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (g[ny][nx] || gesehen.has(ny * W + nx)) continue;
          gesehen.add(ny * W + nx);
          offen.push([nx, ny]);
        }
      }
      if (flaeche.length > beste.length) beste = flaeche;
    }
  }
  return beste;
}

/**
 * Gräbt eine Höhle: größte zusammenhängende Fläche, alles andere Fels.
 * Ergebnis: { grid (Zeilen aus boden/'#'), flaeche: [[x, y]…], offen(x, y) }.
 */
export function hoehleGraben(r, { breite = 26, hoehe = 20, dichte = 0.43, mindestens = 150, boden = 'm' } = {}) {
  let g;
  let flaeche;
  for (let versuch = 0; versuch < 30; versuch++) {
    g = automat(r, breite, hoehe, dichte);
    flaeche = groessteFlaeche(g, breite, hoehe);
    if (flaeche.length >= mindestens) break;
  }
  const inFlaeche = new Set(flaeche.map(([x, y]) => y * breite + x));
  const grid = [];
  for (let y = 0; y < hoehe; y++) {
    let z = '';
    for (let x = 0; x < breite; x++) z += inFlaeche.has(y * breite + x) ? boden : '#';
    grid.push(z);
  }
  return { grid, flaeche, offen: (x, y) => inFlaeche.has(y * breite + x) };
}

export function neuesMonster(typ, tx, ty) {
  const d = MONSTER[typ];
  return {
    typ, x: tx * T + T / 2, y: ty * T + T / 2 + 2, hp: d.hp, max: d.hp,
    vx: 0, vy: 0, uhr: Math.random() * 1.5, phase: 'ruhe', stoss: 0, blitz: 0, anim: Math.random() * 10,
  };
}

/**
 * Ein Schritt Monster-Verhalten. `frei(px, py, fliegt)` sagt, ob ein Punkt begehbar ist.
 * Gibt true zurück, wenn das Monster den Spieler berührt.
 */
export function monsterSchritt(m, dt, spieler, frei) {
  const d = MONSTER[m.typ];
  if (d.schritt) return d.schritt(m, dt, spieler, frei);
  m.anim += dt;
  if (m.blitz > 0) m.blitz -= dt;
  const dx = spieler.x - m.x;
  const dy = spieler.y - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  const jagt = dist < 9 * T;

  if (m.stoss > 0) {
    m.stoss -= dt;
  } else if (d.art === 'schleim') {
    m.uhr -= dt;
    if (m.phase === 'ruhe' && m.uhr <= 0) {
      m.phase = 'sprung';
      m.uhr = 0.38;
      const ziel = jagt ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;
      m.vx = Math.cos(ziel) * d.tempo * 2.2;
      m.vy = Math.sin(ziel) * d.tempo * 2.2;
    } else if (m.phase === 'sprung' && m.uhr <= 0) {
      m.phase = 'ruhe';
      m.uhr = 0.5 + Math.random() * 0.7;
      m.vx = 0;
      m.vy = 0;
    }
  } else {
    // Fledermaus: flattert in Wellen auf den Spieler zu
    const winkel = jagt ? Math.atan2(dy, dx) + Math.sin(m.anim * 3) * 0.6 : m.anim * 0.8;
    m.vx = Math.cos(winkel) * d.tempo;
    m.vy = Math.sin(winkel) * d.tempo;
  }

  const nx = m.x + m.vx * dt;
  if (frei(nx, m.y, d.fliegt)) m.x = nx; else m.vx = -m.vx * 0.5;
  const ny = m.y + m.vy * dt;
  if (frei(m.x, ny, d.fliegt)) m.y = ny; else m.vy = -m.vy * 0.5;

  return Math.hypot(spieler.x - m.x, spieler.y - 4 - m.y) < 11;
}
