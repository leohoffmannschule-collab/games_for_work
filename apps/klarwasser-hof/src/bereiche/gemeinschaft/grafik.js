// Bereich „gemeinschaft" – Pixelkunst und Zeichner: die alte Mühle (verfallen oder repariert)
// mit ihrem Mühlrad, das Schwarze Brett (mit „!", solange ein Auftrag aushängt), die Medaille.

import { kunst, gebaeudeKunst, dekoKunst, gecacht, leinwand, umriss, dach, fensterKasten, tuer, P, R, E, L, POLY, kugel } from '../../sprites.js';
import { zeichner, blase } from '../../render.js';
import { S } from '../../spiel.js';
import { T } from '../../daten.js';
import * as Logik from '../../logik.js';

kunst('medaille', (g) => {
  POLY(g, [[4, 0], [7, 0], [9, 6], [7, 7]], '#c83a3a'); POLY(g, [[9, 0], [12, 0], [9, 7], [7, 6]], '#3a5ac8');
  kugel(g, 8, 10.5, 4.5, 4.5, '#f2c94c');
  for (const [x, y] of [[8, 8], [7, 10], [9, 10], [8, 11], [6, 10], [10, 10]]) P(g, x, y, '#fff3b0');
});

gebaeudeKunst('muehle', {
  b: 80, h: 96, licht: [[40, 40]],
  zustand: (s) => ({ repariert: !!s.muehle }),
  malen(g, { winter, nacht, zustand }) {
    const repariert = zustand.repariert;
    R(g, 6, 50, 68, 46, '#a8a090'); for (let y = 54; y < 94; y += 6) for (let x = 6 + ((y / 6) % 2) * 5; x < 74; x += 10) R(g, x, y, 9, 5, '#b8b0a0');
    R(g, 10, 22, 60, 30, '#9a6a3a'); for (let x = 14; x < 70; x += 5) R(g, x, 22, 1, 30, '#7a4e2a');
    dach(g, 2, 26, 78, 26, 0, 14, repariert ? '#6a4a3a' : '#5a4a42', winter);
    if (!repariert) { R(g, 26, 8, 8, 5, '#2a1e18'); R(g, 50, 14, 6, 4, '#2a1e18'); }
    if (repariert) fensterKasten(g, 34, 34, 12, 10, nacht);
    else { R(g, 33, 33, 14, 12, '#3a2a20'); L(g, 33, 33, 46, 44, '#a87848', 2); L(g, 46, 33, 33, 44, '#a87848', 2); }
    tuer(g, 33, 72, 14, 24, repariert ? '#7a4a2a' : '#5a4a3a');
    if (!repariert) { R(g, 31, 78, 18, 3, '#a87848'); R(g, 31, 86, 18, 3, '#a87848'); }
    if (repariert) { R(g, 10, 0, 1, 10, '#3a3a3a'); R(g, 11, 0, 8, 5, '#e8c24a'); }
  },
});

/** Mühlrad, 40×48, Phase 0–7; dem kaputten Rad fehlen drei Speichen. */
function muehlradBild(phase, repariert) {
  return gecacht(`rad:${phase}:${repariert ? 1 : 0}`, () => {
    const [c, g] = leinwand(40, 48);
    E(g, 20, 24, 18, 18, '#6a4426');
    g.globalCompositeOperation = 'destination-out';
    E(g, 20, 24, 15.5, 15.5, '#000000');
    g.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 8; i++) {
      if (!repariert && [1, 4, 6].includes(i)) continue;
      const a = (i / 8) * Math.PI * 2 + (phase * Math.PI) / 16;
      L(g, 20, 24, Math.round(20 + Math.cos(a) * 16), Math.round(24 + Math.sin(a) * 16), '#8a5a32', 2);
      const px = Math.round(20 + Math.cos(a) * 18);
      const py = Math.round(24 + Math.sin(a) * 18);
      R(g, px - 2, py - 2, 4, 4, '#a87848');
    }
    E(g, 20, 24, 3, 3, '#4a4a52');
    return umriss(c);
  });
}

/** Das Rad steht rechts an der Mühle und dreht sich, sobald sie repariert ist. */
zeichner({
  name: 'muehlrad', ebene: 'welt', reihe: 42,
  sammeln(ort, v) {
    const teile = [];
    for (const g of Logik.gebaeudeListe(v.s, ort.def)) {
      if (g.typ !== 'muehle') continue;
      const x = (g.x + g.w) * T - 6;
      const y = (g.y + 2) * T - 4;
      if (!v.imBild(x, y, 40, 48)) continue;
      const rad = muehlradBild(v.s.muehle ? Math.floor(S.t * 5) % 8 : 0, v.s.muehle);
      teile.push({ y: (g.y + g.h) * T + 1, f: (gr) => gr.drawImage(rad, x, y) });
    }
    return teile;
  },
});

dekoKunst('brett', {
  b: 16, h: 24,
  malen(g) {
    R(g, 2, 10, 2, 14, '#6a4426'); R(g, 12, 10, 2, 14, '#6a4426');
    R(g, 1, 2, 14, 12, '#8a5a32'); R(g, 1, 2, 14, 1, '#a87848'); R(g, 1, 13, 14, 1, '#5a3a1e');
    R(g, 3, 4, 4, 5, '#f2ead8'); R(g, 8, 5, 5, 4, '#e8dfc8'); R(g, 4, 10, 6, 2, '#f2ead8');
    P(g, 5, 4, '#c83a3a'); P(g, 10, 5, '#3a5ac8');
  },
  /** „!" über dem Brett, solange ein Auftrag aushängt. */
  danach(g, d, { bx, y }, k) {
    if (k.s?.brett) blase(g, bx, y - 3, '!');
  },
});
