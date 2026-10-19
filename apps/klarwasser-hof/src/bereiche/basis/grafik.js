// Bereich „basis" – Pixelkunst: Werkzeuge und Grundrohstoffe, Bäume, Steine, Äste, Unkraut,
// liegende Funde, fallende Bäume und die Deko, die viele Karten teilen (Bäume, Büsche, Felsen,
// Laternen, Schilder, Kisten, Fenster, Bilder, Kamine, Topfpflanzen, Tische).

import {
  kunst, objektKunst, dekoKunst, itemBild, gecacht, leinwand, umriss, P, R, E, L, POLY, kugel, hell, dunkel,
  HOLZ_D, BLATT, BLATT_D, BLATT_H, LAUB,
} from '../../sprites.js';
import { zeichner } from '../../render.js';
import { S } from '../../spiel.js';
import { T } from '../../daten.js';
import { hash } from '../../zufall.js';

// ─── Gegenstände ────────────────────────────────────────────────────────────

kunst({
  hacke(g, b, m) {
    L(g, 3, 13, 10, 6, '#b07a48', 1); L(g, 4, 13, 11, 6, HOLZ_D, 1);
    R(g, 8, 3, 6, 2, m); R(g, 12, 5, 2, 4, m); R(g, 8, 3, 5, 1, hell(m, 0.4)); R(g, 13, 5, 1, 4, dunkel(m, 0.25));
  },
  giesskanne(g, b, m) {
    R(g, 3, 7, 8, 7, m); R(g, 3, 13, 8, 1, dunkel(m, 0.3)); R(g, 4, 8, 1, 4, hell(m, 0.45)); R(g, 3, 6, 8, 1, hell(m, 0.2));
    L(g, 10, 10, 13, 6, m, 2); R(g, 13, 4, 2, 3, dunkel(m, 0.15));
    R(g, 5, 3, 4, 1, dunkel(m, 0.3)); P(g, 4, 4, dunkel(m, 0.3)); P(g, 9, 4, dunkel(m, 0.3)); P(g, 4, 5, dunkel(m, 0.3)); P(g, 9, 5, dunkel(m, 0.3));
  },
  axt(g, b, m) {
    L(g, 4, 14, 10, 4, '#b07a48', 1); L(g, 5, 14, 11, 4, HOLZ_D, 1);
    R(g, 8, 3, 3, 4, dunkel(m, 0.15)); R(g, 11, 2, 3, 7, m); R(g, 13, 2, 1, 7, hell(m, 0.5));
  },
  spitzhacke(g, b, m) {
    R(g, 7, 5, 2, 10, '#b07a48'); R(g, 8, 5, 1, 10, HOLZ_D);
    const pts = [[1, 8], [2, 6], [4, 5], [8, 4], [12, 5], [14, 6], [15, 8]];
    for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, 2);
    L(g, 3, 5, 12, 4, hell(m, 0.45), 1);
  },
  sense(g, b, m) {
    L(g, 3, 14, 10, 3, '#b07a48', 2);
    const pts = [[10, 2], [7, 1], [4, 2], [2, 4], [1, 7]];
    for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], m, 2);
    L(g, 9, 1, 4, 1, hell(m, 0.5), 1);
  },
  holz(g) {
    R(g, 2, 6, 12, 6, '#8a5a32'); R(g, 2, 6, 11, 1, '#a8784a'); R(g, 2, 11, 12, 1, '#6a4024');
    for (const x of [4, 7, 10]) P(g, x, 8, '#6a4024');
    E(g, 13, 9, 2, 3, '#d8b07a'); E(g, 13, 9, 1, 1.6, '#b08a5a');
  },
  hartholz(g) {
    R(g, 2, 5, 12, 7, '#6a3e22'); R(g, 2, 5, 11, 1, '#8a5a32'); R(g, 2, 11, 12, 1, '#4a2814');
    for (const x of [4, 6, 9]) P(g, x, 8, '#4a2814');
    E(g, 13, 8.5, 2, 3.5, '#b88a5a'); E(g, 13, 8.5, 1, 2, '#8a6038');
  },
  stein(g) {
    kugel(g, 6, 10, 4.2, 3.6, '#9a948c'); kugel(g, 10, 9, 4.2, 4, '#aaa49a');
    P(g, 9, 10, '#7a746c'); P(g, 5, 11, '#7a746c');
  },
  faser(g) {
    L(g, 4, 14, 6, 2, '#7aa84a', 1); L(g, 7, 14, 8, 2, '#8ab85a', 1); L(g, 10, 14, 11, 3, '#6a983a', 1); L(g, 12, 14, 13, 5, '#7aa84a', 1);
    R(g, 5, 9, 8, 2, '#c8b070');
  },
  saft(g) {
    E(g, 8, 10, 4, 4.5, '#d89a3a'); POLY(g, [[8, 2], [4.5, 8], [11.5, 8]], '#d89a3a');
    E(g, 6.5, 9, 1.2, 2, '#f2c870'); E(g, 9.5, 12, 1.6, 1, '#b8782a');
  },
  kohle(g) {
    kugel(g, 6, 10, 4.2, 3.6, '#2e2e36'); kugel(g, 10, 9, 4.2, 4, '#3c3c48');
    P(g, 9, 7, '#7a8aaa'); P(g, 5, 9, '#6a7a9a');
  },
  treibholz(g) {
    L(g, 2, 12, 13, 5, '#a8a090', 3); L(g, 3, 11, 12, 5, '#c8c0b0', 1); P(g, 7, 8, '#6a6458'); L(g, 10, 7, 12, 10, '#a8a090', 1);
  },
  seetang(g) {
    for (const [x0, f] of [[4, '#3a8a5a'], [8, '#2f7a4a'], [11, '#4a9a6a']]) {
      for (let y = 2; y < 15; y++) P(g, x0 + Math.round(Math.sin(y * 0.8 + x0) * 1.5), y, f);
      for (let y = 3; y < 14; y++) P(g, x0 + 1 + Math.round(Math.sin(y * 0.8 + x0) * 1.5), y, f);
    }
  },
  stiefel(g) {
    R(g, 4, 2, 6, 9, '#6a4a2a'); R(g, 4, 10, 9, 4, '#6a4a2a'); R(g, 4, 13, 10, 1, '#3a2a1a');
    R(g, 4, 2, 6, 1, '#8a6a4a'); P(g, 7, 6, '#3a2a1a'); P(g, 11, 11, '#3a2a1a');
  },
});

// ─── Bäume ──────────────────────────────────────────────────────────────────

/** Baum 32×44 (eiche, kiefer); der Stamm steht unten mittig auf seinem Feld. */
function baumBild(art, jz) {
  return gecacht(`baum:${art}:${jz}`, () => {
    const [c, g] = leinwand(32, 44);
    R(g, 13, 30, 6, 14, '#7a5232'); R(g, 17, 30, 2, 14, '#5a3a22'); R(g, 14, 30, 1, 14, '#9a6e44');
    P(g, 12, 43, '#7a5232'); P(g, 19, 43, '#7a5232');
    if (art === 'kiefer') {
      const gruen = jz === 'herbst' ? ['#2a5a3a', '#3a6e48', '#4a8458'] : ['#24603e', '#2f7a4c', '#46945e'];
      for (const [y, w] of [[30, 13], [21, 11], [12, 8]]) {
        POLY(g, [[16, y - 13], [16 - w, y + 1], [16 + w, y + 1]], gruen[0]);
        POLY(g, [[16, y - 12], [16 - w + 2, y], [16 + w - 4, y]], gruen[1]);
        L(g, 16, y - 11, 16 - w + 4, y - 1, gruen[2], 1);
        if (jz === 'winter') { L(g, 16, y - 12, 16 - w + 2, y, '#f4f8fb', 1); L(g, 16, y - 12, 16 + w - 3, y - 1, '#e4ecf2', 1); }
      }
    } else if (jz === 'winter') {
      const ast = '#6a4a30';
      L(g, 16, 30, 16, 8, ast, 2); L(g, 16, 22, 7, 12, ast, 2); L(g, 16, 18, 25, 9, ast, 2);
      L(g, 10, 15, 6, 6, ast, 1); L(g, 22, 12, 27, 5, ast, 1); L(g, 16, 12, 13, 4, ast, 1); L(g, 16, 12, 20, 3, ast, 1);
      for (const [x, y] of [[7, 11], [25, 8], [13, 4], [20, 3], [16, 8], [6, 6], [27, 5]]) { P(g, x, y - 1, '#ffffff'); P(g, x + 1, y - 1, '#f0f4f8'); }
    } else {
      const p = LAUB[jz];
      E(g, 16, 17, 14, 13, p.d); E(g, 9, 20, 7, 6, p.d); E(g, 23, 20, 7, 6, p.d);
      E(g, 16, 15, 12.5, 11, p.b); E(g, 9.5, 19, 6, 5, p.b); E(g, 22.5, 19, 6, 5, p.b);
      E(g, 12, 10, 5, 4, p.h); E(g, 21, 13, 3, 2.5, p.h);
      for (let i = 0; i < 18; i++) P(g, 4 + Math.floor(hash(i, 3, art.length) * 24), 4 + Math.floor(hash(i, 7, 2) * 22), i % 2 ? p.d : p.h);
      if (p.bluete) for (let i = 0; i < 10; i++) P(g, 5 + Math.floor(hash(i, 11, 1) * 22), 4 + Math.floor(hash(i, 13, 1) * 20), p.bluete);
    }
    return umriss(c);
  });
}

const BAUM_DARSTELLUNG = { tiefe: 0, schatten: [7, 2.5, -2], durchsichtig: [30, 40] };

/** Fallende Bäume (S.fallend, von der Axt angestoßen). */
zeichner({
  name: 'fallend', ebene: 'welt', reihe: 45,
  sammeln(ort, v) {
    const teile = [];
    for (const f of S.fallend) {
      const bx = f.x * T + 8;
      const by = (f.y + 1) * T;
      if (!v.imBild(bx - 48, by - 48, 96, 56)) continue;
      const bild = baumBild(f.art, v.jz);
      teile.push({ y: by, f: (g) => {
        const w = Math.min(1, f.t / 0.75);
        g.save();
        g.globalAlpha = f.t > 0.75 ? Math.max(0, 1 - (f.t - 0.75) / 0.35) : 1;
        g.translate(bx, by - 4);
        g.rotate(f.richtung * w * w * 1.45);
        g.drawImage(bild, -16, -40);
        g.restore();
      } });
    }
    return teile;
  },
});

// ─── Objekte auf der Karte ──────────────────────────────────────────────────

objektKunst({
  baum: { bild: (o, k) => baumBild(o.art || 'eiche', k.jz), ...BAUM_DARSTELLUNG },
  stumpf: {
    malen(g) {
      R(g, 4, 8, 8, 6, '#7a5232'); R(g, 10, 8, 2, 6, '#5a3a22'); E(g, 8, 8, 4, 2, '#c8a070'); E(g, 8, 8, 2, 1, '#a8804e');
      P(g, 3, 13, '#7a5232'); P(g, 12, 13, '#7a5232');
    },
  },
  grossstumpf: {
    malen(g) {
      R(g, 2, 6, 12, 9, '#6a4428'); R(g, 11, 6, 3, 9, '#4e3018'); E(g, 8, 6, 6, 2.5, '#c09464'); E(g, 8, 6, 3.5, 1.4, '#9a7046'); E(g, 8, 6, 1.2, 0.6, '#c09464');
      P(g, 1, 14, '#6a4428'); P(g, 14, 14, '#6a4428'); P(g, 5, 15, '#6a4428');
    },
  },
  ast: {
    schluessel: (o) => o.v || 0,
    malen(g, o) {
      if (o.v) { L(g, 3, 9, 13, 12, '#7a5232', 2); L(g, 8, 10, 7, 6, '#7a5232', 1); }
      else { L(g, 3, 12, 13, 9, '#7a5232', 2); L(g, 9, 10, 11, 6, '#7a5232', 1); P(g, 11, 5, BLATT); }
    },
  },
  stein: {
    schluessel: (o) => o.v || 0,
    malen(g, o) {
      const f = ['#9a948c', '#a39a8a', '#8f8a84'][o.v || 0];
      kugel(g, 8, 10, 5.5, 4.2, f); P(g, 10, 11, dunkel(f, 0.3)); P(g, 6, 12, dunkel(f, 0.3));
    },
  },
  fels: {
    malen(g) {
      kugel(g, 8, 9, 7.4, 6.6, '#8a847a'); L(g, 6, 5, 8, 9, '#6a645a', 1); L(g, 8, 9, 11, 10, '#6a645a', 1);
    },
  },
  unkraut: {
    schluessel: (o, k) => `${o.v || 0}:${k.jz}`,
    malen(g, o, { jz }) {
      const f = { fruehling: ['#4f9a3a', '#7cc25a'], sommer: ['#3f8a32', '#62a84a'], herbst: ['#9a7a2a', '#c09a3a'], winter: ['#8a7a5a', '#c8c0b0'] }[jz];
      const v = o.v || 0;
      L(g, 8, 14, 3 + v, 6, f[0], 2); L(g, 8, 14, 6, 3, f[1], 2); L(g, 8, 14, 11 - v, 4, f[0], 2); L(g, 8, 14, 13, 8 + v, f[1], 2);
      if (v === 2 && jz !== 'winter') { P(g, 6, 2, '#f2f0e0'); P(g, 13, 7, '#f2f0e0'); }
    },
  },
  /** Liegender Fund: hüpft leicht, mit Schatten. */
  sammel: {
    bild: (o) => itemBild({ id: o.id }),
    tiefe: -4, schatten: [5, 2, -3], wackeln: false,
    versatz: (o, k) => [0, -2 + Math.sin(k.t * 2 + k.tx) * 0.6],
  },
});

// ─── Deko, die viele Karten teilen ──────────────────────────────────────────

dekoKunst({
  baum: { bild: (d, k) => baumBild(hash(d.x, d.y, 1) < 0.3 ? 'kiefer' : 'eiche', k.jz), ...BAUM_DARSTELLUNG },
  busch: {
    b: 16, h: 18,
    malen(g, d, { jz }) {
      if (jz === 'winter') { E(g, 8, 11, 7, 6, '#3a5a48'); E(g, 8, 8, 6, 3, '#f2f6fa'); return; }
      const p = LAUB[jz];
      E(g, 8, 11, 7.4, 6.4, p.d); E(g, 7.5, 10, 6.4, 5.4, p.b); E(g, 5.5, 8, 2.4, 1.8, p.h);
      if (jz === 'sommer') for (const [x, y] of [[4, 11], [10, 9], [8, 13], [12, 12]]) P(g, x, y, '#d8302a');
      if (jz === 'fruehling') for (const [x, y] of [[4, 9], [11, 8], [9, 13]]) P(g, x, y, '#f4f0e0');
    },
  },
  felsen(g) {
    kugel(g, 8, 10, 7, 5.6, '#8f8878'); P(g, 6, 8, '#b0a890'); L(g, 9, 9, 11, 12, '#6a6456', 1);
  },
  laterne: {
    b: 16, h: 32,
    malen(g, d, { jz, nacht }) {
      R(g, 7, 10, 2, 22, '#2e2e36'); R(g, 5, 30, 6, 2, '#2e2e36');
      R(g, 4, 3, 8, 8, '#2e2e36'); R(g, 5, 4, 6, 6, nacht ? '#ffe28a' : '#d8e4ea'); R(g, 3, 2, 10, 1, '#2e2e36'); P(g, 8, 1, '#2e2e36');
      if (jz === 'winter') R(g, 3, 1, 10, 1, '#ffffff');
    },
  },
  schild(g) {
    R(g, 7, 8, 2, 8, '#6a4426'); R(g, 2, 2, 12, 7, '#a87848'); R(g, 2, 2, 12, 1, '#c8925a');
    for (const y of [4, 6]) R(g, 4, y, 8, 1, '#6a4426');
  },
  kiste(g) {
    R(g, 2, 4, 12, 11, '#a8784a'); R(g, 2, 4, 12, 1, '#c8925a'); L(g, 3, 5, 13, 14, '#7a5230', 1); L(g, 13, 5, 3, 14, '#7a5230', 1);
    R(g, 2, 4, 1, 11, '#7a5230'); R(g, 13, 4, 1, 11, '#7a5230');
  },
  kamin: {
    b: 32, h: 32, umriss: false,
    malen(g) {
      R(g, 2, 2, 28, 30, '#8a7a6a'); for (let y = 4; y < 30; y += 4) for (let x = 2 + ((y / 4) % 2) * 3; x < 30; x += 6) R(g, x, y, 5, 3, '#9a8a78');
      R(g, 0, 0, 32, 4, '#6a5a4a'); R(g, 8, 14, 16, 18, '#1e1410');
      R(g, 10, 26, 12, 3, '#5a3a20');
      E(g, 16, 25, 5, 4, '#e86a2a'); E(g, 16, 24, 3, 3, '#f2c94c'); E(g, 16, 22, 1.4, 2, '#fff3b0');
    },
  },
  fenster: {
    umriss: false,
    malen(g, d, { nacht, innen }) {
      R(g, 2, 2, 12, 11, '#f0e8d8'); R(g, 3, 3, 10, 9, nacht ? '#22305a' : '#9ad0f0'); R(g, 7, 3, 2, 9, '#f0e8d8'); R(g, 3, 7, 10, 1, '#f0e8d8');
      if (!nacht) { P(g, 4, 4, '#ffffff'); P(g, 10, 9, '#d8f0ff'); } else { P(g, 5, 5, '#f8f0c0'); P(g, 11, 4, '#f8f0c0'); }
      R(g, 1, 2, 2, 11, innen === 'gasthaus' ? '#8a2a3a' : '#c84a3a'); R(g, 13, 2, 2, 11, innen === 'gasthaus' ? '#8a2a3a' : '#c84a3a');
    },
  },
  bild: {
    umriss: false,
    malen(g) {
      R(g, 2, 2, 12, 10, '#c8a050'); R(g, 3, 3, 10, 8, '#9ad0f0'); R(g, 3, 8, 10, 3, '#5fa84a'); E(g, 6, 8, 3, 2, '#3e7a34'); E(g, 11, 5, 1.4, 1.4, '#f2d24a');
    },
  },
  pflanze: {
    b: 16, h: 24,
    malen(g) {
      R(g, 4, 16, 8, 7, '#b8603a'); R(g, 4, 16, 8, 1, '#d8805a'); R(g, 5, 22, 6, 1, '#8a4a2a');
      E(g, 8, 11, 5, 5, BLATT_D); E(g, 6, 8, 3, 4, BLATT); E(g, 11, 9, 3, 3, BLATT_H); E(g, 8, 5, 2, 3, BLATT);
    },
  },
  tisch(g) {
    R(g, 1, 5, 14, 5, '#9a6a3a'); R(g, 1, 5, 14, 1, '#b8885a'); R(g, 2, 10, 2, 6, '#6a4426'); R(g, 12, 10, 2, 6, '#6a4426');
    R(g, 6, 1, 4, 4, '#5a7aa8'); P(g, 7, 0, '#e8506a'); P(g, 8, 0, '#f2d24a');
  },
});

