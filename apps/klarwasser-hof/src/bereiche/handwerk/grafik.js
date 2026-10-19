// Bereich „handwerk" – Pixelkunst: Truhe, Vogelscheuche, Sprenger, Einmachglas (als Gegenstand
// und aufgestellt, mit Arbeits- und Fertig-Anzeige), Marmelade und Eingelegtes.
// Aufgestellte Dinge ohne eigenes Objektbild zeigen ihr Gegenstandsbild (Kern).

import { kunst, objektKunst, P, R, E, L, mische, hell, dunkel, HOLZ } from '../../sprites.js';

function truhe(g) {
  R(g, 2, 6, 12, 8, '#9a6a3a'); R(g, 2, 3, 12, 4, '#b07a48'); R(g, 2, 3, 12, 1, '#c8925a');
  R(g, 2, 7, 12, 1, '#5a3a1a'); R(g, 3, 3, 1, 11, '#7a5028'); R(g, 12, 3, 1, 11, '#7a5028'); R(g, 7, 6, 2, 3, '#e8c050');
}
function sprenger(g, b) {
  const f = b.f || '#d98a4e';
  R(g, 4, 11, 8, 3, '#7a7a80'); R(g, 6, 5, 4, 7, f); R(g, 6, 5, 1, 7, hell(f, 0.4));
  R(g, 3, 7, 3, 1, f); R(g, 10, 7, 3, 1, f); R(g, 7, 3, 2, 2, f); P(g, 2, 7, '#8ad0f0'); P(g, 13, 7, '#8ad0f0'); P(g, 7, 2, '#8ad0f0');
}
function einmachglas(g) {
  R(g, 3, 4, 10, 11, '#9a6a3a'); R(g, 3, 6, 10, 1, '#5a3a1a'); R(g, 3, 12, 10, 1, '#5a3a1a');
  R(g, 5, 7, 6, 5, '#c0dde8'); R(g, 5, 7, 1, 5, '#e8f4f8');
  R(g, 4, 2, 8, 2, '#7a4e2a'); R(g, 4, 2, 8, 1, '#9a6a3a');
}

kunst({
  truhe,
  sprenger,
  einmachglas,
  qsprenger(g) {
    sprenger(g, { f: '#e4ebf2' });
    P(g, 8, 8, '#f2c94c'); P(g, 7, 9, '#f2c94c'); P(g, 3, 4, '#8ad0f0'); P(g, 12, 4, '#8ad0f0'); P(g, 3, 11, '#8ad0f0'); P(g, 12, 11, '#8ad0f0');
  },
  vogelscheuche(g) {
    L(g, 8, 15, 8, 5, HOLZ, 1); R(g, 2, 8, 12, 1, HOLZ);
    R(g, 5, 7, 6, 5, '#5a7aa8'); R(g, 5, 11, 6, 1, '#3a5a88');
    E(g, 8, 4.5, 2.6, 2.6, '#e8d08a'); P(g, 7, 4, '#2a2a2a'); P(g, 9, 4, '#2a2a2a');
    R(g, 5, 1, 6, 2, '#6a4a2a'); R(g, 4, 2, 8, 1, '#5a3a1a');
    for (const [x, y] of [[2, 9], [13, 9], [6, 12], [10, 12]]) P(g, x, y, '#e8d08a');
  },
  /** Glas mit Inhalt in der Farbe des Ausgangsstoffs (bild.f). */
  glas(g, b) {
    R(g, 4, 5, 8, 9, '#dbe7ee'); R(g, 5, 7, 6, 6, b.f); R(g, 5, 7, 1, 6, hell(b.f, 0.3));
    R(g, 3, 3, 10, 2, '#c8a050'); R(g, 3, 3, 10, 1, '#e8c870'); R(g, 6, 9, 4, 3, '#f2ead6');
  },
  glas2(g, b) {
    R(g, 4, 5, 8, 9, '#dbe7ee'); R(g, 5, 7, 6, 6, mische(b.f, '#c8c050', 0.35));
    for (const [x, y] of [[6, 8], [9, 9], [7, 11]]) R(g, x, y, 2, 1, dunkel(b.f, 0.2));
    R(g, 3, 3, 10, 2, '#4a7a3a'); R(g, 3, 3, 10, 1, '#6a9a5a');
  },
});

/** Aufgestelltes Einmachglas: Bläschen bei der Arbeit, rotes Glas obenauf, wenn fertig. */
objektKunst('einmachglas', {
  b: 16, h: 20,
  schluessel: (o) => (o.inhalt ? (o.fertig ? 'fertig' : 'arbeit') : 'leer'),
  malen(g, o) {
    g.translate(0, 4);
    einmachglas(g);
    if (o.inhalt && !o.fertig) { P(g, 7, 9, '#ffffff'); P(g, 9, 8, '#ffffff'); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (o.fertig) { R(g, 5, 0, 6, 5, '#e8c870'); R(g, 6, 1, 4, 3, '#c2283f'); }
  },
});
