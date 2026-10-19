// Bereich „pflanzen" – Pixelkunst: Saatgut, Ernte, Wildpflanzen, Strandfunde, Dünger und die
// Wuchsformen auf dem Beet (Phase 2–4; Keimling und verwelkt zeichnet der Kern).
// Wuchsformen: wurzel, knolle, kohl, rank, busch, gross, hoch, aehre, blume. Eine Pflanze mit
// eigener Form registriert pflanzenKunst unter ihrer ID.

import {
  kunst, pflanzenKunst, P, R, E, L, POLY, kugel, mische, hell, dunkel, HOLZ_D, BLATT, BLATT_D, BLATT_H,
} from '../../sprites.js';

// ─── Gegenstände ────────────────────────────────────────────────────────────

kunst({
  saat(g, b) {
    R(g, 3, 2, 10, 12, '#ead9b0'); R(g, 3, 2, 10, 2, '#cdb684'); R(g, 3, 13, 10, 1, '#cdb684');
    E(g, 8, 8.5, 3, 3, b.f); E(g, 7, 7.5, 1, 1, hell(b.f, 0.5));
    for (const [x, y] of [[5, 12], [8, 12], [11, 12]]) P(g, x, y, '#7a5a3a');
  },
  wurzel(g, b) {
    L(g, 8, 6, 5, 1, b.f2 || BLATT, 2); L(g, 8, 6, 8, 0, BLATT_D, 2); L(g, 8, 6, 11, 1, b.f2 || BLATT, 2);
    POLY(g, [[5, 5], [11, 5], [10, 10], [8, 15], [7, 15], [6, 10]], b.f);
    L(g, 10, 6, 8, 14, dunkel(b.f, 0.2), 1); L(g, 6, 6, 7, 10, hell(b.f, 0.4), 1);
    P(g, 7, 9, dunkel(b.f, 0.35)); P(g, 9, 11, dunkel(b.f, 0.35));
  },
  rundwurzel(g, b) {
    L(g, 8, 6, 5, 1, b.f2 || BLATT, 2); L(g, 8, 6, 11, 1, b.f2 || BLATT, 2); L(g, 8, 6, 8, 2, BLATT_D, 1);
    kugel(g, 8, 10, 4.5, 4.2, b.f); L(g, 8, 14, 8, 15, dunkel(b.f, 0.3), 1);
  },
  knolle(g, b) {
    kugel(g, 8, 9, 5.8, 4.6, b.f);
    for (const [x, y] of [[6, 8], [10, 10], [8, 11], [11, 7]]) P(g, x, y, dunkel(b.f, 0.35));
  },
  blumenkohl(g, b) {
    E(g, 8, 11, 7, 3.6, b.f2); E(g, 8, 11.5, 6, 2.5, dunkel(b.f2, 0.2));
    kugel(g, 5.5, 7.5, 3, 3, b.f); kugel(g, 10.5, 7.5, 3, 3, b.f); kugel(g, 8, 5, 3, 3, b.f); kugel(g, 8, 9, 3.5, 2.6, b.f);
  },
  blattkohl(g, b) {
    R(g, 7, 11, 2, 4, '#b8d098');
    E(g, 4.5, 7, 3.2, 4.5, b.f); E(g, 11.5, 7, 3.2, 4.5, b.f); E(g, 8, 5.5, 3.5, 4.8, hell(b.f, 0.15));
    L(g, 8, 2, 8, 11, dunkel(b.f, 0.35), 1);
    for (const [x, y] of [[2, 5], [13, 5], [6, 1], [10, 1], [1, 8], [14, 8]]) P(g, x, y, b.f);
  },
  pakchoi(g, b) {
    R(g, 5, 8, 2, 7, b.f2); R(g, 9, 8, 2, 7, b.f2); R(g, 7, 9, 2, 6, hell(b.f2, 0.3));
    E(g, 5, 5, 3, 4, b.f); E(g, 11, 5, 3, 4, b.f); E(g, 8, 4, 3, 4, hell(b.f, 0.15));
  },
  schote(g, b) {
    L(g, 3, 12, 12, 3, b.f, 3); L(g, 3, 11, 11, 3, hell(b.f, 0.35), 1);
    for (const [x, y] of [[5, 10], [8, 7], [10, 5]]) P(g, x, y, hell(b.f, 0.5));
    L(g, 12, 3, 14, 1, BLATT_D, 1);
  },
  peperoni(g, b) {
    L(g, 4, 13, 9, 6, b.f, 3); L(g, 9, 6, 10, 4, b.f, 2); L(g, 5, 11, 8, 7, hell(b.f, 0.4), 1);
    R(g, 10, 2, 2, 3, '#4a8a3a'); P(g, 12, 2, '#4a8a3a');
  },
  tomate(g, b) {
    kugel(g, 8, 9, 5.5, 4.8, b.f);
    R(g, 6, 5, 5, 1, '#3f8f34'); P(g, 8, 4, '#3f8f34'); P(g, 7, 6, '#3f8f34'); P(g, 9, 6, '#3f8f34'); P(g, 8, 3, '#2f6f24');
  },
  melone(g, b) {
    kugel(g, 8, 9, 6.8, 5.3, b.f);
    for (const x of [4, 7, 10, 13]) for (let y = 5; y < 14; y++) {
      if (((x + 0.5 - 8) / 6.3) ** 2 + ((y + 0.5 - 9) / 4.8) ** 2 < 1) P(g, x + ((y >> 1) & 1), y, dunkel(b.f, 0.35));
    }
    E(g, 5, 6, 1.5, 1, hell(b.f, 0.45));
  },
  kuerbis(g, b) {
    kugel(g, 4.8, 10, 3.6, 4.5, dunkel(b.f, 0.08)); kugel(g, 11.2, 10, 3.6, 4.5, dunkel(b.f, 0.08)); kugel(g, 8, 10, 3.6, 5, b.f);
    R(g, 7, 3, 2, 3, '#6a5a2a'); P(g, 9, 3, '#4a8a3a'); P(g, 10, 4, '#4a8a3a');
  },
  aubergine(g, b) {
    kugel(g, 8, 10, 4.6, 5.5, b.f);
    R(g, 5, 4, 6, 2, '#4a8a3a'); P(g, 8, 2, '#3a7a2a'); P(g, 8, 3, '#3a7a2a'); P(g, 5, 6, '#4a8a3a'); P(g, 10, 6, '#4a8a3a');
  },
  beeren(g, b) {
    for (const [x, y] of [[5, 10], [10.5, 9.5], [7.5, 6], [8, 12.5]]) kugel(g, x, y, 2.6, 2.6, b.f);
    P(g, 7, 3, BLATT); P(g, 8, 3, BLATT); P(g, 8, 2, BLATT_D);
  },
  traube(g, b) {
    L(g, 8, 1, 8, 4, HOLZ_D, 1); E(g, 10.5, 2.5, 2, 1.4, BLATT);
    for (const [x, y] of [[5, 6], [8, 6], [11, 6], [6.5, 9], [9.5, 9], [8, 12]]) kugel(g, x, y, 2, 2, b.f);
  },
  kolben(g, b) {
    POLY(g, [[3, 15], [6, 4], [8, 14]], BLATT); POLY(g, [[13, 15], [10, 4], [8, 14]], BLATT_D);
    E(g, 8, 8, 3, 6, b.f);
    for (let y = 3; y < 14; y += 2) for (let x = 6; x < 11; x += 2) P(g, x + ((y >> 1) & 1), y, dunkel(b.f, 0.2));
    E(g, 7, 6, 1, 2, hell(b.f, 0.4));
  },
  aehre(g, b) {
    L(g, 5, 15, 6, 5, '#b89048', 1); L(g, 8, 15, 8, 3, '#b89048', 1); L(g, 11, 15, 10, 5, '#b89048', 1);
    for (const [x, y] of [[6, 4], [8, 2], [10, 4]]) { E(g, x, y + 1, 1.6, 3, b.f); P(g, x - 1, y, hell(b.f, 0.4)); }
  },
  tulpe(g, b) {
    L(g, 8, 15, 8, 7, BLATT_D, 1); E(g, 5.5, 12, 1.6, 3, BLATT); E(g, 10.5, 12, 1.6, 3, BLATT);
    E(g, 8, 5, 3.3, 3.3, b.f); P(g, 5, 2, b.f); P(g, 8, 1, b.f); P(g, 11, 2, b.f); R(g, 6, 3, 1, 3, hell(b.f, 0.35));
  },
  bluete(g, b) {
    L(g, 8, 15, 8, 8, BLATT_D, 1); E(g, 10, 12, 2, 1.2, BLATT);
    for (const [x, y] of [[5, 5], [11, 5], [8, 2], [8, 8], [6, 3], [10, 3], [6, 7], [10, 7]]) E(g, x, y, 1.6, 1.6, b.f2);
    kugel(g, 8, 5, 2.2, 2.2, b.f);
  },
  lauch(g) {
    R(g, 6, 6, 4, 9, '#f0f0d8'); R(g, 6, 6, 4, 3, '#c8e0a0'); R(g, 9, 6, 1, 9, '#d8d8c0');
    L(g, 7, 6, 4, 1, BLATT, 2); L(g, 9, 6, 12, 1, BLATT_D, 2);
    for (const x of [6, 8, 9]) P(g, x, 15, '#c8b890');
  },
  nuss(g, b) {
    kugel(g, 8, 10, 4.6, 4.2, b.f); E(g, 8, 6, 4, 2.4, '#8a7a4a'); R(g, 7, 2, 2, 3, '#6a5a3a');
    for (const x of [5, 7, 9, 11]) P(g, x, 8, '#6a5a2a');
  },
  pilz(g, b) {
    E(g, 8, 9, 6.5, 5.5, b.f);
    g.clearRect(0, 9, 16, 7);
    R(g, 6, 9, 4, 6, '#f0e8d8'); R(g, 9, 9, 1, 6, '#d8ccb8');
    R(g, 2, 8, 12, 1, dunkel(b.f, 0.3));
    E(g, 6, 5.5, 2, 1.2, hell(b.f, 0.45));
  },
  pflaume(g, b) {
    kugel(g, 8, 9.5, 5, 5, b.f); E(g, 6, 7, 1.6, 2, mische(b.f, '#c8b8e8', 0.5));
    L(g, 8, 4, 9, 2, HOLZ_D, 1); E(g, 11, 2.5, 2, 1.2, BLATT);
  },
  stechpalme(g) {
    E(g, 5, 10, 4, 2.4, '#2a6a3a'); E(g, 11, 10, 4, 2.4, '#2f7a42');
    for (const [x, y] of [[1, 9], [3, 12], [6, 13], [9, 7], [13, 12], [15, 9]]) P(g, x, y, '#2a6a3a');
    kugel(g, 6.5, 6.5, 1.7, 1.7, '#d02030'); kugel(g, 9.5, 6, 1.7, 1.7, '#d02030'); kugel(g, 8, 8.5, 1.7, 1.7, '#d02030');
  },
  muschel(g, b) {
    E(g, 8, 11, 6.5, 6, b.f);
    g.clearRect(0, 12, 16, 4);
    for (const x of [3, 5, 8, 11, 13]) L(g, 8, 12, x, 6, dunkel(b.f, 0.18), 1);
    R(g, 5, 12, 6, 2, dunkel(b.f, 0.3));
  },
  herzmuschel(g, b) {
    kugel(g, 8, 9, 5.5, 5, b.f);
    for (const x of [5, 7, 9, 11]) L(g, x, 5, x, 13, dunkel(b.f, 0.2), 1);
    R(g, 6, 2, 4, 2, dunkel(b.f, 0.2));
  },
  koralle(g, b) {
    L(g, 8, 15, 8, 8, b.f, 2); L(g, 8, 10, 4, 5, b.f, 2); L(g, 8, 9, 12, 4, b.f, 2);
    L(g, 5, 7, 3, 2, hell(b.f, 0.2), 1); L(g, 11, 6, 13, 2, hell(b.f, 0.2), 1); L(g, 8, 8, 8, 3, b.f, 1);
  },
  seeigel(g, b) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      L(g, 8, 9, Math.round(8 + Math.cos(a) * 7), Math.round(9 + Math.sin(a) * 6), dunkel(b.f, 0.25), 1);
    }
    kugel(g, 8, 9, 4, 4, b.f);
  },
  nautilus(g, b) {
    kugel(g, 8, 8, 6.5, 6.5, b.f);
    for (let i = 0; i < 5; i++) L(g, 8, 8, 8 + Math.round(Math.cos(i * 1.1 + 0.5) * 6), 8 + Math.round(Math.sin(i * 1.1 + 0.5) * 6), b.f2, 1);
    E(g, 8.5, 8.5, 2.2, 2.2, dunkel(b.f, 0.35)); E(g, 9, 9, 1, 1, dunkel(b.f, 0.6));
  },
  /** Sack (Dünger). */
  sack(g, b) {
    E(g, 8, 10.5, 5.5, 4.5, b.f); R(g, 6, 3, 4, 4, b.f); R(g, 5, 5, 6, 1, '#5a3a1a');
    E(g, 6.5, 9, 1.3, 2, hell(b.f, 0.3)); for (const [x, y] of [[8, 11], [10, 9], [6, 12]]) P(g, x, y, '#4a8a3a');
  },
});

// ─── Wuchsformen auf dem Beet (Phase 2–4) ───────────────────────────────────
// k: { p, id, phase, f (Erntefarbe), fuss (y der Erde), gross (ab Phase 3) }

function blattRosette(g, { p, id, phase, f, fuss, gross }) {
  const h = gross ? 7 : 5;
  for (const [dx, f2] of [[-4, BLATT], [4, BLATT], [-2, BLATT_H], [2, BLATT_D], [0, BLATT_H]]) L(g, 8, fuss, 8 + dx, fuss - h - Math.abs(dx % 3), f2, 2);
  if (phase === 4) {
    if (p.wuchs === 'wurzel') { E(g, 8, fuss - 1, 3, 2, f); P(g, 7, fuss - 2, hell(f, 0.4)); }
    else if (p.wuchs === 'knolle') { for (const [x, y] of [[5, fuss - 9], [10, fuss - 8], [8, fuss - 10]]) { P(g, x, y, '#f4f0f8'); P(g, x + 1, y, '#c8a8e8'); } }
    else if (id === 'gruenkohl') { E(g, 8, fuss - 5, 5, 4.5, f); E(g, 7, fuss - 7, 2.5, 2, hell(f, 0.2)); }
    else { kugel(g, 8, fuss - 5, 4.5, 3.6, f); }
  }
}

pflanzenKunst({
  wurzel: blattRosette,
  knolle: blattRosette,
  kohl: blattRosette,
  rank(g, { id, phase, f, fuss, gross }) {
    R(g, 7, fuss - 18, 2, 18, '#a8784a');
    const h = gross ? 17 : 11;
    for (let y = 0; y < h; y += 3) { E(g, 6, fuss - y - 2, 2.2, 1.4, BLATT); E(g, 10, fuss - y - 3, 2.2, 1.4, BLATT_D); }
    if (phase === 4) for (const [x, y] of [[5, fuss - 8], [11, fuss - 11], [6, fuss - 14], [10, fuss - 5]]) {
      if (id === 'bohne') L(g, x, y, x, y + 4, f, 2); else kugel(g, x, y, 1.8, 1.8, f);
    }
  },
  busch(g, { id, phase, f, fuss, gross }) {
    const r = gross ? 6 : 4;
    E(g, 8, fuss - r, r + 0.5, r, BLATT_D); E(g, 7.5, fuss - r - 1, r - 0.5, r - 1, BLATT); E(g, 6, fuss - r - 2.5, 1.8, 1.2, BLATT_H);
    if (phase === 4) {
      const pos = [[5, fuss - 9], [10, fuss - 10], [8, fuss - 6], [11, fuss - 5], [4, fuss - 5]];
      for (const [x, y] of pos) {
        if (id === 'peperoni') L(g, x, y, x, y + 3, f, 2);
        else if (id === 'aubergine') kugel(g, x, y + 1, 1.8, 2.6, f);
        else kugel(g, x, y, 1.5, 1.5, f);
      }
    }
  },
  gross(g, { id, phase, f, fuss, gross }) {
    L(g, 2, fuss - 1, 14, fuss - 2, BLATT_D, 1);
    for (const x of [3, 8, 13]) E(g, x, fuss - 3, 2.6, 2, x === 8 ? BLATT_H : BLATT);
    if (phase === 4) {
      if (id === 'melone') { kugel(g, 8, fuss - 4, 6, 4.6, f); for (const x of [5, 8, 11]) L(g, x, fuss - 8, x, fuss - 1, dunkel(f, 0.35), 1); }
      else { kugel(g, 5.5, fuss - 4, 3.5, 4, dunkel(f, 0.08)); kugel(g, 10.5, fuss - 4, 3.5, 4, dunkel(f, 0.08)); kugel(g, 8, fuss - 4, 3.6, 4.4, f); R(g, 7, fuss - 10, 2, 2, '#6a5a2a'); }
    } else if (gross) E(g, 8, fuss - 5, 3, 3, BLATT);
  },
  hoch(g, { phase, f, fuss, gross }) {
    const h = gross ? 20 : 12;
    R(g, 7, fuss - h, 2, h, '#6a9a3a');
    for (let y = 3; y < h; y += 4) { L(g, 8, fuss - y, 3, fuss - y - 3, BLATT, 1); L(g, 8, fuss - y - 1, 13, fuss - y - 4, BLATT_D, 1); }
    if (phase === 4) {
      E(g, 10.5, fuss - 10, 1.8, 3.5, f); E(g, 5.5, fuss - 14, 1.8, 3.5, f);
      L(g, 10, fuss - 13, 12, fuss - 14, BLATT, 1); P(g, 8, fuss - h - 1, '#e8d88a'); P(g, 7, fuss - h - 2, '#e8d88a'); P(g, 9, fuss - h - 2, '#e8d88a');
    }
  },
  aehre(g, { phase, fuss, gross }) {
    const h = gross ? 14 : 9;
    const farbe = phase === 4 ? '#d4b048' : BLATT;
    for (const x of [4, 6, 8, 10, 12]) L(g, 8, fuss, x, fuss - h + Math.abs(x - 8) / 2, farbe, 1);
    if (phase === 4) for (const x of [4, 6, 8, 10, 12]) E(g, x, fuss - h + Math.abs(x - 8) / 2 - 1, 1.2, 2.4, '#e8c860');
  },
  blume(g, { phase, f, fuss, gross }) {
    const h = gross ? 10 : 6;
    L(g, 8, fuss, 8, fuss - h, BLATT_D, 1); E(g, 6, fuss - 3, 1.6, 3, BLATT); E(g, 10, fuss - 4, 1.6, 3, BLATT_H);
    if (phase === 4) { E(g, 8, fuss - h - 2, 3, 3, f); P(g, 5, fuss - h - 4, f); P(g, 8, fuss - h - 5, f); P(g, 11, fuss - h - 4, f); P(g, 7, fuss - h - 3, hell(f, 0.4)); }
    else if (gross) E(g, 8, fuss - h - 1, 1.5, 2, BLATT_H);
  },
});
