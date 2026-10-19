// Bereich „hof" – Pixelkunst: Wohnhaus, Innenraumfarben des Hauses, Bett, Fernseher, Herd,
// Versandkiste und Briefkasten (mit Fähnchen, wenn Post da ist).

import { gebaeudeKunst, dekoKunst, INNEN_FARBEN, dach, fensterKasten, tuer, P, R, E } from '../../sprites.js';

INNEN_FARBEN.haus = { tapete: '#d7b98c', streifen: '#c9a676', leiste: '#7a4e2c', teppich: '#a8453f', muster: '#e0b060' };

gebaeudeKunst('haus', {
  b: 80, h: 80, licht: [[21, 52], [59, 52]],
  malen(g, { winter, nacht }) {
    R(g, 6, 34, 68, 46, '#d6b383'); for (let x = 10; x < 72; x += 5) R(g, x, 34, 1, 46, '#bf9a6a');
    R(g, 6, 34, 4, 46, '#7a5232'); R(g, 70, 34, 4, 46, '#7a5232'); R(g, 6, 77, 68, 3, '#8a7a6a');
    R(g, 54, 2, 9, 18, '#8a6a5a'); R(g, 53, 2, 11, 2, '#6a4a3a');
    dach(g, 0, 38, 80, 38, 8, 12, '#a8452f', winter);
    tuer(g, 33, 56, 14, 24, '#7a4a2a');
    fensterKasten(g, 15, 47, 12, 10, nacht); fensterKasten(g, 53, 47, 12, 10, nacht);
    R(g, 14, 59, 14, 3, '#7a4e2c'); R(g, 52, 59, 14, 3, '#7a4e2c');
    if (!winter) for (const x of [15, 18, 21, 24, 53, 56, 59, 62]) P(g, x + 1, 58, ['#e8506a', '#f2d24a', '#f4f0f8'][x % 3]);
  },
});

dekoKunst({
  /** Bett 2×2; liegt flach (sortiert nach der Oberkante). */
  bett: {
    b: 32, h: 32, flach: true,
    malen(g) {
      R(g, 1, 0, 30, 6, '#7a4e2c'); R(g, 1, 0, 30, 1, '#9a6a3a');
      R(g, 2, 5, 28, 26, '#8a5a32'); R(g, 3, 5, 26, 7, '#f4f0e8'); R(g, 5, 6, 9, 5, '#ffffff'); R(g, 18, 6, 9, 5, '#ffffff');
      R(g, 3, 12, 26, 18, '#4a7ac0');
      for (let y = 14; y < 30; y += 4) for (let x = 5; x < 29; x += 6) R(g, x, y, 3, 2, '#6a9ae0');
      R(g, 3, 12, 26, 1, '#7aa6e8');
    },
  },
  tv(g, d, { nacht }) {
    R(g, 1, 9, 14, 7, '#7a4e2c'); R(g, 1, 9, 14, 1, '#9a6a3a');
    R(g, 2, 1, 12, 9, '#3a3a40'); R(g, 3, 2, 10, 6, nacht ? '#5a7ac8' : '#7aa0c0'); P(g, 4, 3, '#c8e0f0'); R(g, 6, 0, 1, 1, '#3a3a40'); R(g, 10, 0, 1, 1, '#3a3a40');
  },
  herd: {
    b: 16, h: 24,
    malen(g, d, { nacht }) {
      R(g, 1, 8, 14, 16, '#3a3a44'); R(g, 1, 8, 14, 2, '#5a5a66'); R(g, 3, 14, 10, 7, '#2a2a32'); R(g, 4, 15, 8, 2, nacht ? '#e86a2a' : '#4a2a20');
      R(g, 3, 4, 5, 4, '#9aa0a8'); R(g, 3, 4, 5, 1, '#c8ccd2'); R(g, 10, 5, 4, 3, '#c84a3a');
    },
  },
  versandkiste: {
    b: 32, h: 18,
    malen(g, d, { jz }) {
      R(g, 1, 6, 30, 12, '#9a6a3a'); R(g, 1, 10, 30, 1, '#7a4e2a'); R(g, 1, 14, 30, 1, '#7a4e2a');
      R(g, 0, 2, 32, 5, '#b07a48'); R(g, 0, 2, 32, 1, '#c8925a');
      R(g, 1, 6, 2, 12, '#6a6a72'); R(g, 29, 6, 2, 12, '#6a6a72'); R(g, 13, 8, 6, 4, '#f2ead8'); R(g, 14, 9, 4, 1, '#c84a3a');
      if (jz === 'winter') R(g, 0, 1, 32, 2, '#ffffff');
    },
  },
  /** Briefkasten; das gelbe Fähnchen steht, solange Post wartet. */
  briefkasten: {
    b: 16, h: 24,
    zustand: (d, k) => ({ flagge: (k.s?.post.length ?? 0) > 0 }),
    malen(g, d, { jz, zustand }) {
      R(g, 7, 12, 2, 12, '#6a4426');
      R(g, 3, 5, 10, 8, '#c84a3a'); E(g, 8, 5, 5, 2.5, '#c84a3a'); R(g, 4, 9, 8, 1, '#8a2a20'); R(g, 4, 6, 1, 6, '#e06a5a');
      if (zustand.flagge) { R(g, 13, 2, 1, 6, '#3a3a3a'); R(g, 13, 2, 3, 2, '#f2c94c'); }
      if (jz === 'winter') R(g, 4, 2, 8, 1, '#ffffff');
    },
  },
});
