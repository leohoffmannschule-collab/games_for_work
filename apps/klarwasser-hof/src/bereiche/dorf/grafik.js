// Bereich „dorf" – Pixelkunst: Krämerladen, Rathaus, Gasthaus, Schmiede, Atelier, die
// Innenraumfarben von Laden und Gasthaus, Dorf-Deko (Brunnen, Bänke, Blumen, Amboss, Fässer,
// Regale, Theken) und das Essen aus dem Gasthaus.

import {
  kunst, gebaeudeKunst, dekoKunst, INNEN_FARBEN, dach, fensterKasten, tuer, schrift, P, R, E, L, POLY, hell, BLATT_D,
} from '../../sprites.js';
import { hash } from '../../zufall.js';

INNEN_FARBEN.laden = { tapete: '#b4c79a', streifen: '#a3b888', leiste: '#5d4630', teppich: '#4f7aa8', muster: '#d8e4f0' };
INNEN_FARBEN.gasthaus = { tapete: '#a8744a', streifen: '#946238', leiste: '#4a2c18', teppich: '#7a3a5a', muster: '#e8b860' };

// ─── Essen aus dem Gasthaus ─────────────────────────────────────────────────

kunst({
  brot(g) {
    E(g, 8, 10, 6.5, 4, '#b8783a'); E(g, 8, 9, 6, 3.5, '#d29a5a');
    for (const x of [5, 8, 11]) L(g, x - 1, 8, x + 1, 10, '#f2d4a0', 1);
  },
  salat(g) {
    E(g, 8, 9, 5.5, 3, '#5aa83a'); E(g, 7, 8, 3, 2, '#7cc25a'); P(g, 10, 8, '#e04a3a'); P(g, 5, 9, '#e04a3a');
    POLY(g, [[1, 10], [15, 10], [12, 14], [4, 14]], '#efe8da'); R(g, 1, 10, 14, 1, '#ffffff');
  },
  kaffee(g) {
    R(g, 4, 7, 7, 7, '#f0ece4'); R(g, 4, 13, 7, 1, '#c8c0b4'); R(g, 5, 7, 5, 1, '#5a3a2a');
    P(g, 11, 8, '#f0ece4'); P(g, 12, 9, '#f0ece4'); P(g, 12, 10, '#f0ece4'); P(g, 11, 11, '#f0ece4');
    for (const [x, y] of [[6, 4], [7, 3], [8, 5], [9, 3]]) P(g, x, y, '#c8ccd8');
  },
  suppe(g) {
    E(g, 8, 9, 5.5, 2.4, '#e09a48'); P(g, 6, 9, '#f2d080'); P(g, 9, 8, '#c86a3a'); P(g, 10, 10, '#f2d080');
    POLY(g, [[1, 9], [15, 9], [12, 14], [4, 14]], '#5a7aa8'); R(g, 1, 9, 14, 1, '#7a9ac8');
  },
});

// ─── Gebäude ────────────────────────────────────────────────────────────────

gebaeudeKunst('laden', {
  b: 112, h: 96, licht: [[18, 70], [94, 70]],
  malen(g, { winter, nacht }) {
    R(g, 4, 30, 104, 66, '#ecd7a2'); R(g, 4, 84, 104, 12, '#9a948a'); for (let x = 4; x < 108; x += 8) R(g, x, 84, 1, 12, '#7a746a');
    dach(g, 0, 34, 112, 34, 4, 12, '#3f7a5a', winter);
    R(g, 30, 36, 52, 12, '#6a4426'); R(g, 31, 37, 50, 10, '#8a5a32'); schrift(g, 'LADEN', 46, 40, '#f2e8c8');
    for (let x = 4; x < 108; x += 8) { R(g, x, 52, 4, 8, '#3f8a5a'); R(g, x + 4, 52, 4, 8, '#f4f0e8'); }
    for (let x = 4; x < 108; x += 4) P(g, x + 2, 60, x % 8 ? '#f4f0e8' : '#3f8a5a');
    fensterKasten(g, 12, 64, 26, 16, nacht, '#6a4426'); fensterKasten(g, 74, 64, 26, 16, nacht, '#6a4426');
    if (!nacht) { for (const [x, f] of [[16, '#e8506a'], [22, '#f2d24a'], [28, '#7cc25a'], [80, '#e5872a'], [88, '#c99a5b']]) R(g, x, 75, 4, 4, f); }
    tuer(g, 49, 66, 14, 30, '#5a8a6a');
  },
});

gebaeudeKunst('rathaus', {
  b: 80, h: 96, licht: [[18, 56], [62, 56]],
  malen(g, { winter, nacht }) {
    R(g, 4, 36, 72, 60, '#cbc3b2'); for (let y = 40; y < 92; y += 6) R(g, 4, y, 72, 1, '#b3ab9a');
    R(g, 4, 90, 72, 6, '#9a928a');
    dach(g, 0, 40, 80, 40, 6, 16, '#4a5a7a', winter);
    E(g, 40, 22, 7, 7, '#f0e8d8'); E(g, 40, 22, 5.5, 5.5, '#ffffff'); L(g, 40, 22, 40, 18, '#2a2a2a', 1); L(g, 40, 22, 43, 22, '#2a2a2a', 1);
    R(g, 23, 46, 34, 9, '#5a4a3a'); schrift(g, 'RATHAUS', 26, 48, '#f2e8c8');
    R(g, 22, 60, 4, 30, '#e8e0d0'); R(g, 54, 60, 4, 30, '#e8e0d0');
    fensterKasten(g, 10, 60, 10, 14, nacht); fensterKasten(g, 60, 60, 10, 14, nacht);
    tuer(g, 33, 70, 14, 26, '#3a4a6a');
    R(g, 62, 0, 1, 12, '#3a3a3a'); R(g, 63, 0, 8, 5, '#3a8a5a');
  },
});

gebaeudeKunst('gasthaus', {
  b: 112, h: 112, licht: [[22, 76], [90, 76], [30, 44], [82, 44]],
  malen(g, { winter, nacht }) {
    R(g, 4, 34, 104, 78, '#efe4c8');
    const balken = '#5a3a24';
    for (const x of [4, 30, 56, 82, 104]) R(g, x, 34, 4, 78, balken);
    for (const y of [34, 64, 108]) R(g, 4, y, 104, 4, balken);
    L(g, 8, 38, 30, 64, balken, 2); L(g, 82, 64, 104, 38, balken, 2);
    dach(g, 0, 38, 112, 38, 2, 14, '#8a3a2a', winter);
    R(g, 47, 42, 18, 10, balken); schrift(g, 'KRUG', 49, 45, '#f2e8c8');
    fensterKasten(g, 34, 42, 14, 12, nacht, balken); fensterKasten(g, 64, 42, 14, 12, nacht, balken);
    fensterKasten(g, 12, 72, 18, 14, nacht, balken); fensterKasten(g, 82, 72, 18, 14, nacht, balken);
    tuer(g, 49, 82, 14, 30, '#7a4a2a');
    R(g, 66, 72, 10, 1, '#3a3a3a'); R(g, 68, 73, 6, 7, '#c8a050'); R(g, 69, 75, 4, 4, '#f2e8c8'); P(g, 74, 76, '#c8a050');
  },
});

gebaeudeKunst('schmiede', {
  b: 96, h: 80, licht: [[70, 54]],
  malen(g, { winter }) {
    R(g, 4, 28, 88, 52, '#6a6460'); for (let y = 32; y < 78; y += 6) for (let x = 4 + ((y / 6) % 2) * 6; x < 92; x += 12) R(g, x, y, 11, 5, '#7a746e');
    R(g, 70, 0, 12, 24, '#5a5450'); R(g, 69, 0, 14, 3, '#3a3634');
    if (!winter) { E(g, 76, 0, 3, 2, 'rgba(200,200,200,0.5)'); }
    dach(g, 0, 32, 96, 32, 8, 12, '#3a3a44', winter);
    R(g, 22, 36, 44, 9, '#3a2a20'); schrift(g, 'SCHMIEDE', 28, 38, '#f2c94c');
    R(g, 60, 48, 22, 16, '#2a1e18'); E(g, 71, 60, 8, 4, '#e86a2a'); E(g, 71, 59, 5, 2.4, '#f2c94c');
    R(g, 59, 47, 24, 2, '#4a4040');
    tuer(g, 33, 54, 14, 26, '#5a3a24');
  },
});

gebaeudeKunst('atelier', {
  b: 80, h: 80, licht: [[22, 50], [58, 50]],
  malen(g, { winter, nacht }) {
    R(g, 6, 32, 68, 48, '#5a7ab0'); for (let x = 10; x < 72; x += 6) R(g, x, 32, 1, 48, '#4e6a9c');
    R(g, 6, 76, 68, 4, '#3a4a6a');
    dach(g, 0, 36, 80, 36, 6, 12, '#e8e0d0', winter);
    R(g, 44, 10, 18, 12, '#c8dce8'); R(g, 43, 9, 20, 1, '#6a6a72'); L(g, 44, 10, 61, 21, '#a8c8d8', 1);
    fensterKasten(g, 14, 44, 16, 12, nacht); fensterKasten(g, 52, 44, 12, 12, nacht);
    tuer(g, 33, 56, 14, 24, '#e8c24a');
    for (const [x, y, f] of [[12, 66, '#e8506a'], [20, 70, '#f2d24a'], [60, 64, '#7cc25a'], [66, 70, '#e8506a']]) { R(g, x, y, 2, 2, f); P(g, x + 2, y + 1, f); }
  },
});

// ─── Deko im Dorf und in den Innenräumen ────────────────────────────────────

dekoKunst({
  brunnen: {
    b: 32, h: 32,
    malen(g, d, { jz }) {
      E(g, 16, 22, 15, 9, '#8f8981'); E(g, 16, 21, 14, 8, '#b5aea4'); E(g, 16, 21, 11.5, 6, '#4a8ac2'); E(g, 13, 19, 4, 1.6, '#7ab4e0');
      R(g, 14, 6, 4, 14, '#a8a29a'); R(g, 14, 6, 1, 14, '#c8c2b8'); E(g, 16, 7, 5.5, 2.2, '#b5aea4'); E(g, 16, 6.5, 4, 1.2, '#4a8ac2');
      P(g, 16, 3, '#9ad0f0'); P(g, 15, 4, '#9ad0f0'); P(g, 17, 4, '#9ad0f0');
      if (jz === 'winter') { E(g, 16, 21, 11.5, 6, '#c8e4f2'); R(g, 11, 14, 10, 1, '#ffffff'); }
    },
  },
  bank: {
    b: 32, h: 16,
    malen(g, d, { jz }) {
      R(g, 1, 2, 30, 3, '#8a5a32'); R(g, 1, 7, 30, 4, '#9a6a3a'); R(g, 1, 7, 30, 1, '#b07a48');
      R(g, 3, 11, 2, 4, '#4a3a2a'); R(g, 27, 11, 2, 4, '#4a3a2a'); R(g, 3, 4, 2, 4, '#4a3a2a'); R(g, 27, 4, 2, 4, '#4a3a2a');
      if (jz === 'winter') R(g, 1, 6, 30, 1, '#ffffff');
    },
  },
  blumen(g, d, { jz }) {
    R(g, 1, 9, 14, 6, '#7a4a2a'); R(g, 1, 9, 14, 1, '#9a6a3a');
    if (jz === 'winter') { R(g, 2, 8, 12, 1, '#ffffff'); return; }
    const farben = { fruehling: ['#e8506a', '#f2d24a', '#f4f0f8'], sommer: ['#f2a03a', '#e8506a', '#8a5ad8'], herbst: ['#d8742f', '#b8452f', '#f2c94c'] }[jz];
    for (let i = 0; i < 5; i++) {
      const x = 3 + i * 2.5;
      L(g, x, 9, x, 6, BLATT_D, 1); E(g, x, 5, 1.4, 1.4, farben[i % 3]);
    }
  },
  amboss(g) {
    R(g, 3, 11, 10, 5, '#7a5232'); R(g, 3, 11, 10, 1, '#9a6e44');
    R(g, 2, 4, 11, 3, '#4a4a54'); POLY(g, [[13, 4], [16, 5], [13, 7]], '#4a4a54'); R(g, 5, 7, 6, 4, '#3a3a44'); R(g, 2, 4, 11, 1, '#7a7a88');
  },
  fass(g) {
    E(g, 8, 9, 6, 6.5, '#8a5a32'); R(g, 2, 5, 12, 1, '#4a4a52'); R(g, 2, 12, 12, 1, '#4a4a52'); E(g, 8, 3.5, 5, 1.6, '#a87848');
    L(g, 5, 4, 5, 14, '#6a4426', 1); L(g, 11, 4, 11, 14, '#6a4426', 1);
  },
  /** Theke über die volle Breite; im Gasthaus mit Bierkrügen, sonst mit Kasse und Papier. */
  theke(g, d, { w, innen }) {
    R(g, 0, 3, w, 6, '#a8784a'); R(g, 0, 3, w, 1, '#c8986a'); R(g, 0, 9, w, 7, '#6a4426');
    for (let x = 6; x < w; x += 16) R(g, x, 10, 1, 6, '#4e3018');
    if (innen === 'gasthaus') { for (const x of [10, 30, 58]) if (x < w) { R(g, x, 0, 4, 4, '#e8c870'); R(g, x, 0, 4, 1, '#ffffff'); } }
    else { R(g, 5, 0, 8, 4, '#4a4a54'); R(g, 6, 1, 6, 1, '#9ad070'); R(g, 30, 1, 6, 3, '#e8dcc0'); }
  },
  regal: {
    h: 24,
    malen(g, d, { w }) {
      R(g, 0, 0, w, 24, '#6a4426'); R(g, 1, 1, w - 2, 22, '#4e3018');
      for (const y of [7, 15, 22]) R(g, 1, y, w - 2, 1, '#8a5a32');
      for (let x = 2; x < w - 2; x += 4) {
        const f = ['#c84a3a', '#e8c870', '#5a8ac8', '#7ab04a', '#e8e0d0'][Math.floor(hash(x, d.x, 2) * 5)];
        R(g, x, 3, 3, 4, f); R(g, x, 11, 3, 4, ['#d8b07a', '#c8d8e8', '#a87848'][Math.floor(hash(x, d.y, 3) * 3)]); R(g, x, 18, 3, 4, f);
      }
    },
  },
  saatregal(g, d, { w }) {
    R(g, 0, 4, w, 12, '#8a5a32'); R(g, 0, 4, w, 1, '#a87848');
    for (let x = 2; x < w - 3; x += 5) {
      const f = ['#efe0a0', '#5fae3c', '#f4f0e0', '#e0475b', '#c99a5b'][Math.floor(hash(x, 1, 5) * 5)];
      R(g, x, 0, 4, 9, '#ead9b0'); R(g, x + 1, 3, 2, 3, f);
    }
  },
  flaschen: {
    umriss: false,
    malen(g, d, { w }) {
      R(g, 0, 12, w, 2, '#6a4426');
      for (let x = 2; x < w - 2; x += 5) {
        const f = ['#3a7a4a', '#8a3a2a', '#c8a050', '#4a5aa8'][Math.floor(hash(x, 2, 1) * 4)];
        R(g, x, 6, 3, 6, f); R(g, x + 1, 3, 1, 3, f); P(g, x, 7, hell(f, 0.4));
      }
    },
  },
});

