// Bereich „angeln" – Pixelkunst und Zeichner: Angel, Fische, Köder, Lenes Fischstand und die
// Anzeige beim Angeln (Rute, Schnur, Pose, Kraftbalken, Anbiss, Fang über dem Kopf, Drill).

import { kunst, dekoKunst, itemBild, P, R, E, L, POLY, kugel, hell, dunkel } from '../../sprites.js';
import { zeichner } from '../../render.js';
import { S } from '../../spiel.js';
import * as Logik from '../../logik.js';

kunst({
  angel(g) {
    L(g, 2, 14, 13, 2, '#d8c070', 1); L(g, 3, 14, 13, 3, '#a8903a', 1);
    for (const [x, y] of [[5, 11], [8, 8], [11, 5]]) P(g, x, y, '#7a6a2a');
    R(g, 2, 12, 2, 3, '#7a4a2a');
    L(g, 13, 3, 13, 9, '#e8eef4', 1); E(g, 13, 11, 1.6, 1.6, '#e04040'); P(g, 13, 10, '#ffffff');
  },
  koeder(g) {
    R(g, 3, 8, 10, 6, '#9aa0a8'); R(g, 3, 8, 10, 1, '#c8ccd2'); R(g, 3, 13, 10, 1, '#6a7078');
    L(g, 4, 7, 7, 5, '#e88a9a', 1); L(g, 7, 5, 9, 7, '#e88a9a', 1); L(g, 9, 7, 12, 4, '#d87a8a', 1);
  },
  /** Fisch nach bild.form: flach, aal, tinte, kugel, hoch, lang, klein, wels, sonst normal. */
  fisch(g, b) {
    const f = b.f;
    const bauch = b.f2;
    const auge = (x, y) => { P(g, x, y, '#ffffff'); P(g, x, y + 1, '#141414'); };
    switch (b.form) {
      case 'flach':
        POLY(g, [[2, 8], [8, 3], [13, 8], [8, 13]], f); POLY(g, [[2, 8], [13, 8], [8, 13]], dunkel(f, 0.12));
        POLY(g, [[12, 8], [15, 5], [15, 11]], dunkel(f, 0.25)); auge(6, 6); auge(8, 5);
        break;
      case 'aal': {
        const pts = [[2, 10], [5, 7], [8, 9], [11, 6], [14, 8]];
        for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], f, 3);
        for (let i = 0; i + 1 < pts.length; i++) L(g, pts[i][0], pts[i][1] + 1, pts[i + 1][0], pts[i + 1][1] + 1, bauch, 1);
        auge(2, 8);
        break;
      }
      case 'tinte':
        E(g, 8, 5, 3.6, 4.6, f); E(g, 7, 4, 1.2, 2.2, hell(f, 0.4));
        for (const x of [5, 7, 9, 11]) L(g, x, 9, x + Math.round(Math.sin(x) * 1.5), 15, dunkel(f, 0.15), 1);
        P(g, 6, 7, '#141414'); P(g, 10, 7, '#141414');
        break;
      case 'kugel':
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          P(g, Math.round(8 + Math.cos(a) * 6.5), Math.round(8 + Math.sin(a) * 6.5), dunkel(f, 0.3));
        }
        kugel(g, 8, 8, 5.4, 5.4, f); E(g, 8, 10.5, 4, 2.4, bauch); auge(5, 6); P(g, 2, 8, f);
        break;
      default: {
        const ry = b.form === 'hoch' ? 4.4 : b.form === 'lang' ? 2.4 : b.form === 'klein' ? 2.4 : 3.3;
        const rx = b.form === 'lang' ? 6.4 : b.form === 'klein' ? 4.2 : 5.2;
        const cx = 7;
        POLY(g, [[cx + rx - 1, 8], [15, 8 - ry - 0.5], [14, 8], [15, 8 + ry + 0.5]], dunkel(f, 0.2));
        POLY(g, [[cx - 2, 8 - ry + 0.5], [cx + 2, 8 - ry - 2], [cx + 3, 8 - ry + 1]], dunkel(f, 0.25));
        E(g, cx, 8, rx, ry, f); E(g, cx, 8 + ry * 0.45, rx - 1, ry * 0.55, bauch);
        L(g, cx - rx + 2, 8 - 1, cx + rx - 2, 8 - 1, hell(f, 0.25), 1);
        auge(cx - rx + 2, 7);
        if (b.form === 'wels') { L(g, cx - rx + 1, 9, 1, 12, '#3a3a30', 1); L(g, cx - rx + 1, 9, 1, 10, '#3a3a30', 1); }
      }
    }
  },
});

/** Lenes Fischstand am Strand. */
dekoKunst('stand', (g) => {
  R(g, 1, 5, 14, 10, '#9a7a4a'); R(g, 1, 5, 14, 1, '#b8945a'); R(g, 2, 6, 12, 4, '#cfe8f2');
  for (const [x, f] of [[3, '#7aa8c8'], [7, '#c86a5a'], [10, '#a89a5a']]) { R(g, x, 7, 3, 2, f); P(g, x + 3, 7, f); }
  R(g, 1, 10, 14, 1, '#6a5030');
});

// ─── Anzeige beim Angeln ────────────────────────────────────────────────────

/** Gefangener Fisch über dem Kopf (gleich nach der Spielerin gezeichnet). */
zeichner({
  name: 'fang', ebene: 'welt', reihe: 95,
  sammeln() {
    if (S.demo || S.angeln?.phase !== 'fang') return null;
    const sp = S.sp;
    const bild = itemBild({ id: S.angeln.id });
    return [{ y: sp.y, f: (g) => g.drawImage(bild, Math.round(sp.x - 8), Math.round(sp.y - 42)) }];
  },
});

/** Rute, Schnur und Pose; Kraftbalken beim Auswerfen; „!" beim Anbiss. */
zeichner({
  name: 'angeln', ebene: 'ueber', reihe: 20,
  zeichnen(g) {
    const a = S.angeln;
    if (!a || S.demo) return;
    const sp = S.sp;
    const [dx] = Logik.RICHTUNG[sp.blick];
    const spitzeX = sp.x + (dx || 0.3) * 14;
    const spitzeY = sp.y - 26;
    g.strokeStyle = '#c8a050';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(sp.x + (dx || 0.3) * 4, sp.y - 12);
    g.lineTo(spitzeX, spitzeY);
    g.stroke();
    if (a.phase === 'laden') {
      g.fillStyle = '#1a1018'; g.fillRect(sp.x - 14, sp.y - 34, 4, 22);
      const h = 20 * a.kraft;
      g.fillStyle = a.kraft > 0.8 ? '#7cc25a' : a.kraft > 0.4 ? '#e8c24a' : '#e8604a';
      g.fillRect(sp.x - 13, sp.y - 13 - h, 2, h);
      return;
    }
    if (a.phase === 'fang' || a.bx == null) return;
    let bx = a.bx;
    let by = a.by;
    if (a.phase === 'wurf') {
      const p = Math.min(1, a.t / 0.45);
      bx = spitzeX + (a.bx - spitzeX) * p;
      by = spitzeY + (a.by - spitzeY) * p - Math.sin(p * Math.PI) * 18;
    } else if (a.phase === 'warten') by += Math.sin(S.t * 3) * 0.6;
    else if (a.phase === 'biss' || a.phase === 'drill') by += Math.sin(S.t * 30) * 1.2 + 1;
    g.strokeStyle = 'rgba(240,240,250,0.8)';
    g.lineWidth = 0.5;
    g.beginPath();
    g.moveTo(spitzeX, spitzeY);
    g.quadraticCurveTo((spitzeX + bx) / 2, Math.max(spitzeY, by) + 6, bx, by);
    g.stroke();
    g.fillStyle = '#e04040'; g.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 2);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(bx) - 1, Math.round(by) - 3, 3, 1);
    if (a.phase === 'biss') {
      g.fillStyle = '#fbf6e8'; g.fillRect(sp.x - 3, sp.y - 40, 7, 10);
      g.fillStyle = '#d83a3a'; g.fillRect(sp.x, sp.y - 38, 1, 5); g.fillRect(sp.x, sp.y - 32, 1, 1);
    }
  },
});

/** Drill: grüner Balken über dem zappelnden Fisch, rechts der Fortschritt. */
zeichner({
  name: 'drill', ebene: 'bildschirm', reihe: 20,
  zeichnen(g, { W, H, dpr, zoom: z }) {
    const a = S.angeln;
    if (!a || a.phase !== 'drill') return;
    const d = a.drill;
    const u = dpr * Math.max(1, Math.min(1.6, H / dpr / 520));
    const pw = 54 * u;
    const ph = 230 * u;
    const klemme = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const px = klemme((S.sp.x - S.kamera.x) * z + 36 * u, 8 * u, W - pw - 8 * u);
    const py = klemme((S.sp.y - S.kamera.y) * z - ph * 0.75, 8 * u, H - ph - 8 * u);
    g.fillStyle = '#4a2e1c';
    g.fillRect(px - 4 * u, py - 4 * u, pw + 8 * u, ph + 8 * u);
    g.fillStyle = '#d9b25f';
    g.fillRect(px - 2 * u, py - 2 * u, pw + 4 * u, ph + 4 * u);
    g.fillStyle = '#4a2e1c';
    g.fillRect(px, py, pw, ph);
    const sx = px + 6 * u;
    const sw = 30 * u;
    const sy = py + 8 * u;
    const sh = ph - 16 * u;
    const gr = g.createLinearGradient(0, sy, 0, sy + sh);
    gr.addColorStop(0, '#3f8ac2');
    gr.addColorStop(1, '#1f4a72');
    g.fillStyle = gr;
    g.fillRect(sx, sy, sw, sh);
    const zy = sy + sh - (d.p + d.zone) * sh;
    const drin = d.fp >= d.p && d.fp <= d.p + d.zone;
    g.fillStyle = drin ? 'rgba(130,230,110,0.85)' : 'rgba(110,200,100,0.6)';
    g.fillRect(sx + 2 * u, zy, sw - 4 * u, d.zone * sh);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillRect(sx + 2 * u, zy, sw - 4 * u, 2 * u);
    const fisch = itemBild({ id: d.fisch });
    const fy = sy + sh - d.fp * sh;
    g.imageSmoothingEnabled = false;
    g.drawImage(fisch, sx + sw / 2 - 12 * u, fy - 12 * u, 24 * u, 24 * u);
    const bx = px + 40 * u;
    g.fillStyle = '#1a1018';
    g.fillRect(bx, sy, 8 * u, sh);
    g.fillStyle = d.fort > 0.66 ? '#7cc25a' : d.fort > 0.33 ? '#e8c24a' : '#e8604a';
    g.fillRect(bx + u, sy + sh - d.fort * sh, 6 * u, d.fort * sh);
  },
});
