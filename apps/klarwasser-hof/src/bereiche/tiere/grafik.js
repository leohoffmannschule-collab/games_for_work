// Bereich „tiere" – Pixelkunst und Zeichner: Eier, der Hühnerstall, das Huhn und die Hühner,
// die tagsüber im Auslauf scharren.

import { kunst, gebaeudeKunst, tierKunst, tierBild, dach, fensterKasten, E, P, R, L, kugel } from '../../sprites.js';
import { zeichner, schatten } from '../../render.js';
import { S } from '../../spiel.js';
import { huehnerDraussen } from './inhalt.js';

kunst('ei', (g, b) => {
  if (b.gross) kugel(g, 8, 9, 5, 6, b.f); else kugel(g, 8, 9.5, 4.2, 5, b.f);
});

gebaeudeKunst('stall', {
  b: 80, h: 64, licht: [[58, 34]],
  malen(g, { winter, nacht }) {
    R(g, 6, 24, 68, 40, '#b8483a'); for (let x = 10; x < 72; x += 6) R(g, x, 24, 1, 40, '#9a3a2e');
    R(g, 6, 24, 68, 2, '#f0e8d8'); R(g, 6, 62, 68, 2, '#6a5a4a');
    dach(g, 0, 28, 80, 28, 4, 10, '#5a3a3a', winter);
    R(g, 31, 40, 18, 24, '#f0e8d8'); R(g, 33, 42, 14, 22, '#8a3a2e'); L(g, 33, 42, 46, 63, '#f0e8d8', 1); L(g, 46, 42, 33, 63, '#f0e8d8', 1);
    fensterKasten(g, 54, 30, 10, 8, nacht); fensterKasten(g, 16, 30, 10, 8, nacht);
  },
});

/** Huhn 16×16, nach links; Schritt 0 steht, 1 läuft, 2 pickt. */
tierKunst('huhn', (g, schritt) => {
  const pick = schritt === 2;
  E(g, 8, 10, 5, 4, '#f4f0e8'); E(g, 7, 11, 3, 2, '#e0dacc'); P(g, 3, 7, '#f4f0e8'); P(g, 3, 8, '#e8e2d4'); P(g, 2, 7, '#e0dacc');
  const kx = pick ? 12 : 11;
  const ky = pick ? 9 : 6;
  E(g, kx, ky, 2.6, 2.6, '#f4f0e8'); R(g, kx - 1, ky - 4, 2, 2, '#d83a3a'); P(g, kx + 3, ky, '#f2a03a'); P(g, kx + 1, ky - 1, '#141414');
  P(g, kx + 1, ky + 2, '#d83a3a');
  const bein = schritt === 1 ? 1 : 0;
  P(g, 7, 14 - bein, '#f2a03a'); P(g, 9, 14, '#f2a03a'); P(g, 7, 15 - bein, '#f2a03a'); P(g, 9, 15, '#f2a03a');
});

zeichner({
  name: 'huehner', ebene: 'welt', reihe: 70,
  sammeln(ort, v) {
    if (!huehnerDraussen()) return null;
    const teile = [];
    for (const h of S.huehner) {
      if (!v.imBild(h.x - 10, h.y - 18, 20, 22)) continue;
      const schritt = h.pick > 0 ? 2 : h.zx != null ? Math.floor(h.anim * 6) % 2 : 0;
      teile.push({ y: h.y, f: (g) => { schatten(g, h.x, h.y, 4, 1.5); g.drawImage(tierBild('huhn', schritt, h.links), Math.round(h.x - 8), Math.round(h.y - 15)); } });
    }
    return teile;
  },
});
