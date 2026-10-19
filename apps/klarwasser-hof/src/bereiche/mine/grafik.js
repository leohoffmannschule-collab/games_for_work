// Bereich „mine" – Pixelkunst und Zeichner: Erze, Barren, Mineralien, Schwert, die Farben der
// Minen-Bänder, Gestein und Leitern, Schatztruhen, Förderkorb, Mineneingang am Berg (mit Geröll,
// solange die Mine zu ist), Schleime und Fledermäuse samt Lebensbalken.

import {
  kunst, objektKunst, dekoKunst, gebaeudeKunst, monsterKunst, MINE_FARBEN, mineFarben, objektBild, monsterBild, kunstMalen,
  P, R, E, L, POLY, kugel, mische, hell, dunkel,
} from '../../sprites.js';
import { zeichner, schatten } from '../../render.js';
import { S } from '../../spiel.js';
import { MONSTER } from '../../mine.js';

// Bänder: 0 Lehm (Ebene 1–10 und Eingang), 1 Frost, 2 Glut
MINE_FARBEN.push(
  { boden: '#8a6c50', d: '#735840', h: '#a3845f', wand: '#4a3628', wandH: '#6a5040', stein: '#9a8a74' },
  { boden: '#6f8296', d: '#5b6c80', h: '#8b9db0', wand: '#2f4054', wandH: '#4a5e76', stein: '#a8b8c8' },
  { boden: '#5a3a34', d: '#48302a', h: '#74504a', wand: '#2a1816', wandH: '#4a2a24', stein: '#7a6460' },
);

// ─── Gegenstände ────────────────────────────────────────────────────────────

kunst({
  schwert(g) {
    L(g, 6, 10, 13, 3, '#b8a890', 2); L(g, 7, 9, 13, 3, '#e0d8c8', 1);
    P(g, 10, 6, '#9a6a4a'); P(g, 8, 8, '#9a6a4a');
    L(g, 3, 9, 7, 13, '#6a4a2a', 2); L(g, 2, 14, 4, 12, '#4a3020', 2);
  },
  kristall(g, b) {
    POLY(g, [[8, 1], [12, 5], [12, 11], [8, 15], [4, 11], [4, 5]], b.f);
    POLY(g, [[8, 1], [8, 15], [4, 11], [4, 5]], hell(b.f, 0.35));
    L(g, 8, 2, 8, 14, hell(b.f, 0.6), 1); P(g, 6, 5, '#ffffff');
    POLY(g, [[12, 8], [14, 10], [14, 14], [12, 15], [11, 12]], dunkel(b.f, 0.15));
  },
  edelstein(g, b) {
    POLY(g, [[4, 4], [12, 4], [15, 7], [8, 14], [1, 7]], b.f);
    R(g, 4, 4, 8, 3, hell(b.f, 0.35)); L(g, 1, 7, 15, 7, dunkel(b.f, 0.15), 1);
    L(g, 6, 7, 8, 13, hell(b.f, 0.25), 1); P(g, 5, 5, '#ffffff'); P(g, 6, 5, '#ffffff');
  },
  traene(g, b) {
    E(g, 8, 10, 4.2, 4.6, b.f); POLY(g, [[8, 1], [4.5, 8], [11.5, 8]], b.f);
    E(g, 6.5, 9, 1.2, 2, hell(b.f, 0.6)); P(g, 7, 5, '#ffffff');
  },
  erz(g, b) {
    kugel(g, 8, 9, 6.2, 5.2, '#8a8078');
    for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 10], [4, 11]]) { R(g, x, y, 2, 2, b.f); P(g, x, y, hell(b.f, 0.5)); }
  },
  barren(g, b) {
    POLY(g, [[2, 12], [4.5, 6], [11.5, 6], [14, 12]], b.f);
    R(g, 5, 6, 6, 2, hell(b.f, 0.45)); R(g, 2, 11, 12, 1, dunkel(b.f, 0.3));
    L(g, 12, 7, 13, 11, dunkel(b.f, 0.18), 1); P(g, 6, 9, hell(b.f, 0.6));
  },
  schleim(g, b) {
    E(g, 8, 11, 6, 3.6, dunkel(b.f, 0.2)); E(g, 8, 9, 4.5, 4, b.f); E(g, 6.5, 7.5, 1.4, 1.2, hell(b.f, 0.5));
    P(g, 3, 13, b.f); P(g, 13, 12, b.f);
  },
  fluegel(g) {
    POLY(g, [[1, 6], [8, 4], [14, 7], [12, 10], [10, 8], [8, 11], [6, 8], [3, 10]], '#4a3a5a');
    L(g, 8, 4, 8, 11, '#2a1e3a', 1); L(g, 8, 4, 4, 9, '#6a5a7a', 1); L(g, 8, 4, 12, 9, '#6a5a7a', 1);
  },
});

// ─── Gestein, Leiter, Schatz ────────────────────────────────────────────────

objektKunst({
  /** Minenstein; o.art: stein, kohle, kupfer, eisen, gold, edel. Farbe nach Band. */
  mstein: {
    schluessel: (o, k) => `${o.art}:${k.band}:${o.v || 0}`,
    malen(g, o, { band }) {
      const f = mineFarben(band).stein;
      kugel(g, 8, 10, 6.6, 5.3, mische(f, '#000000', (o.v || 0) * 0.05));
      const flecken = { kupfer: '#d98a4e', eisen: '#e8eef4', gold: '#f2c94c', edel: '#c07af0', kohle: '#1e1e24' }[o.art];
      if (flecken) for (const [x, y] of [[5, 8], [9, 7], [7, 11], [11, 10]]) { R(g, x, y, 2, 2, flecken); P(g, x, y, hell(flecken, 0.5)); }
      else { P(g, 7, 10, dunkel(f, 0.3)); P(g, 10, 12, dunkel(f, 0.3)); }
    },
  },
  /** Loch mit Leiter nach unten; liegt flach im Boden. */
  leiter: {
    umriss: false, tiefe: -15,
    malen(g) {
      E(g, 8, 10, 6.5, 4.5, '#120c0a'); R(g, 5, 2, 1, 10, '#a8763e'); R(g, 10, 2, 1, 10, '#a8763e');
      for (const y of [3, 6, 9]) R(g, 5, y, 6, 1, '#c8925a');
    },
  },
  schatz: {
    malen(g) {
      kunstMalen(g, 'truhe');
      R(g, 2, 7, 12, 1, '#f2c94c'); R(g, 3, 3, 1, 11, '#f2c94c'); R(g, 12, 3, 1, 11, '#f2c94c');
    },
  },
});

// ─── Deko im Mineneingang und auf den Ebenen ────────────────────────────────

dekoKunst({
  leiter_ab: { bild: (d, k) => objektBild({ t: 'leiter' }, k), flach: true },
  leiter_auf: {
    b: 16, h: 24, umriss: false,
    malen(g) {
      R(g, 4, 0, 2, 22, '#a8763e'); R(g, 10, 0, 2, 22, '#a8763e');
      for (let y = 2; y < 22; y += 4) R(g, 4, y, 8, 1, '#c8925a');
      E(g, 8, 21, 5, 2, 'rgba(0,0,0,0.35)');
    },
  },
  aufzug: {
    b: 16, h: 32,
    malen(g) {
      R(g, 1, 0, 2, 32, '#5a5a62'); R(g, 13, 0, 2, 32, '#5a5a62'); R(g, 1, 0, 14, 2, '#5a5a62');
      E(g, 8, 4, 3, 3, '#8a8a92'); E(g, 8, 4, 1, 1, '#3a3a40'); L(g, 8, 6, 8, 16, '#3a3a40', 1);
      R(g, 2, 16, 12, 12, '#8a6a3a'); R(g, 2, 16, 12, 1, '#a8885a'); R(g, 2, 20, 12, 1, '#6a4a2a'); R(g, 4, 24, 3, 3, '#f2c94c');
    },
  },
  schwertfund: {
    b: 16, h: 24,
    malen(g) {
      L(g, 5, 20, 11, 4, '#b8a890', 2); L(g, 6, 19, 11, 5, '#e0d8c8', 1);
      L(g, 3, 18, 8, 21, '#6a4a2a', 2); L(g, 4, 21, 3, 23, '#4a3020', 2);
      P(g, 12, 3, '#ffffff'); P(g, 13, 2, '#ffffff'); P(g, 11, 2, '#fff3b0');
    },
  },
  wandlampe: {
    umriss: false,
    malen(g) {
      R(g, 7, 8, 2, 6, '#5a3a24'); R(g, 5, 7, 6, 2, '#4a4a52');
      E(g, 8, 5, 2.4, 3, '#f2a03a'); E(g, 8, 5.5, 1.4, 2, '#fff3b0');
    },
  },
});

// ─── Mineneingang am Berg ───────────────────────────────────────────────────

gebaeudeKunst('hoehle', {
  b: 48, h: 32,
  zustand: (s) => ({ offen: !!s.flags.mineOffen }),
  malen(g, { winter, zustand }) {
    E(g, 24, 28, 10, 14, '#140e0c'); R(g, 14, 28, 20, 4, '#140e0c');
    R(g, 12, 8, 4, 24, '#6a4a2a'); R(g, 32, 8, 4, 24, '#6a4a2a'); R(g, 10, 6, 28, 4, '#7a5a32'); R(g, 10, 6, 28, 1, '#9a7a4a');
    if (!zustand.offen) {
      for (const [x, y, r] of [[18, 26, 5], [27, 25, 6], [22, 20, 4], [31, 28, 4], [15, 29, 3]]) kugel(g, x, y, r, r * 0.8, '#8a847a');
    }
    if (winter) R(g, 10, 5, 28, 1, '#ffffff');
  },
});

// ─── Monster ────────────────────────────────────────────────────────────────

monsterKunst({
  schleim(g, farbe, phase) {
    const [rx, ry, cy] = phase === 0 ? [6, 4.5, 11] : phase === 1 ? [7, 3.6, 12] : [5, 5.6, 9];
    E(g, 8, cy, rx, ry, dunkel(farbe, 0.15)); E(g, 8, cy - 0.8, rx - 1, ry - 1, farbe); E(g, 6, cy - ry * 0.5, 1.6, 1.2, hell(farbe, 0.55));
    P(g, 6, cy, '#141414'); P(g, 10, cy, '#141414'); P(g, 6, cy - 1, '#141414'); P(g, 10, cy - 1, '#141414');
  },
  fledermaus(g, farbe, phase) {
    E(g, 8, 8, 2.8, 3.2, farbe); P(g, 6, 4, farbe); P(g, 10, 4, farbe);
    if (phase % 2 === 0) { POLY(g, [[6, 8], [0, 3], [2, 6], [1, 9]], dunkel(farbe, 0.1)); POLY(g, [[10, 8], [16, 3], [14, 6], [15, 9]], dunkel(farbe, 0.1)); }
    else { POLY(g, [[6, 8], [0, 12], [3, 10], [2, 7]], dunkel(farbe, 0.1)); POLY(g, [[10, 8], [16, 12], [13, 10], [14, 7]], dunkel(farbe, 0.1)); }
    P(g, 7, 7, '#f2d24a'); P(g, 9, 7, '#f2d24a');
  },
});

/** Monster der aktuellen Ebene (S.monster) mit Schatten, Treffer-Blinken und Lebensbalken. */
zeichner({
  name: 'monster', ebene: 'welt', reihe: 80,
  sammeln(ort, v) {
    const teile = [];
    for (const m of S.monster) {
      if (!v.imBild(m.x - 12, m.y - 40, 24, 44)) continue;
      const d = MONSTER[m.typ];
      const phase = d.art === 'schleim' ? (m.phase === 'sprung' ? 2 : Math.floor(m.anim * 3) % 2) : Math.floor(m.anim * 9) % 2;
      teile.push({ y: m.y, f: (g) => {
        schatten(g, m.x, m.y, 5, 2);
        const hoch = d.fliegt ? 8 + Math.sin(m.anim * 4) * 2 : 0;
        g.globalAlpha = m.blitz > 0 ? 0.5 : 1;
        g.drawImage(monsterBild(m.typ, d.farbe, d.art, phase), Math.round(m.x - 8), Math.round(m.y - 15 - hoch));
        g.globalAlpha = 1;
        if (m.hp < m.max) {
          g.fillStyle = '#2a1a1a'; g.fillRect(m.x - 7, m.y - 19 - hoch, 14, 2);
          g.fillStyle = '#e8504a'; g.fillRect(m.x - 7, m.y - 19 - hoch, 14 * (m.hp / m.max), 2);
        }
      } });
    }
    return teile;
  },
});
