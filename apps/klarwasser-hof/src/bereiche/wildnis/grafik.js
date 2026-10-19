// Bereich „wildnis" – Pixelkunst: Lenes Hütte am Strand und die Strandkörbe.
// (Bäume, Büsche und Felsen der Karten kommen aus „basis", der Mineneingang aus „mine".)

import { gebaeudeKunst, dekoKunst, dach, fensterKasten, tuer, P, R, E, L } from '../../sprites.js';

gebaeudeKunst('huette', {
  b: 80, h: 64, licht: [[56, 38]],
  malen(g, { winter, nacht }) {
    R(g, 6, 24, 68, 36, '#9a8a6a'); for (let y = 26; y < 60; y += 4) R(g, 6, y, 68, 1, '#7a6a4e');
    for (const x of [8, 28, 50, 70]) R(g, x, 58, 3, 6, '#5a4a3a');
    dach(g, 0, 28, 80, 28, 6, 8, '#5a6a7a', winter);
    tuer(g, 33, 40, 14, 22, '#3a5a7a');
    fensterKasten(g, 52, 32, 10, 8, nacht);
    for (let x = 10; x < 28; x += 3) L(g, x, 30, x + 4, 46, '#d8d0b0', 1);
    for (let y = 32; y < 46; y += 4) L(g, 10, y, 28, y, '#d8d0b0', 1);
    E(g, 64, 50, 4, 4, '#e84a3a'); E(g, 64, 50, 2, 2, '#9a8a6a'); P(g, 60, 50, '#ffffff'); P(g, 68, 50, '#ffffff');
  },
});

dekoKunst('strandkorb', {
  b: 16, h: 24,
  malen(g) {
    R(g, 2, 4, 12, 18, '#e2cfa0'); for (let y = 6; y < 22; y += 2) R(g, 2, y, 12, 1, '#c8b480');
    R(g, 2, 2, 12, 4, '#3a7ac0'); for (const x of [4, 8, 12]) R(g, x, 2, 2, 4, '#f4f0e8');
    R(g, 4, 8, 8, 8, '#2f5f9a'); R(g, 4, 14, 8, 3, '#e8e0c8'); R(g, 2, 22, 12, 2, '#a8946a');
  },
});
