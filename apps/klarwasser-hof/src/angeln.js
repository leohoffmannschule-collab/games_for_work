// Angeln: Auswerfen mit Kraftbalken, Warten, Anbiss, dann der Drill —
// den grünen Balken über dem zappelnden Fisch halten, bis die Leiste voll ist.

import { T } from './daten.js';
import { boden } from './karten.js';
import * as L from './logik.js';

const klemme = (v, a, b) => Math.max(a, Math.min(b, v));

export function angelnStart(S) {
  S.angeln = { phase: 'laden', t: 0, kraft: 0 };
}

export function angelnUpdate(S, dt, E, fx) {
  const a = S.angeln;
  a.t += dt;
  switch (a.phase) {
    case 'laden':
      a.kraft = (Math.sin(a.t * 3.2 - Math.PI / 2) + 1) / 2;
      if (!E.benutzen.gehalten) auswerfen(S, fx);
      break;
    case 'wurf':
      if (a.t >= 0.45) {
        a.phase = 'warten';
        a.t = 0;
        a.koeder = L.anzahl(S.s, 'koeder') > 0;
        a.biss = (1.6 + Math.random() * 5) * (a.koeder ? 0.5 : 1);
        fx.ton('platsch');
        fx.ringe(a.bx, a.by);
      }
      break;
    case 'warten':
      if (E.benutzen.gedrueckt || Math.hypot(E.richtung.x, E.richtung.y) > 0.2) { S.angeln = null; return; }
      if (a.t >= a.biss) {
        a.phase = 'biss';
        a.t = 0;
        fx.ton('biss');
        fx.ringe(a.bx, a.by);
        if (a.koeder) L.entfernen(S.s, 'koeder', 1);
      }
      break;
    case 'biss':
      if (E.benutzen.gedrueckt) haken(S, fx);
      else if (a.t > 0.95) { fx.meldung('Zu spät – der Fisch hat nur am Köder geknabbert.'); S.angeln = null; }
      break;
    case 'drill':
      drill(S, dt, E, fx);
      break;
    case 'fang':
      if (a.t > 1.5) S.angeln = null;
      break;
    default:
      S.angeln = null;
  }
}

function auswerfen(S, fx) {
  const a = S.angeln;
  const def = S.ort.def;
  const fx0 = Math.floor(S.sp.x / T);
  const fy0 = Math.floor((S.sp.y - 3) / T);
  const [dx, dy] = L.RICHTUNG[S.sp.blick];
  const weite = 1 + Math.round(a.kraft * 4);
  let ziel = null;
  for (let d = weite; d >= 1 && !ziel; d--) if (boden(def, fx0 + dx * d, fy0 + dy * d) === '~') ziel = { x: fx0 + dx * d, y: fy0 + dy * d };
  if (!ziel) {
    for (let d = weite + 1; d <= 5 && !ziel; d++) if (boden(def, fx0 + dx * d, fy0 + dy * d) === '~') ziel = { x: fx0 + dx * d, y: fy0 + dy * d };
  }
  if (!ziel || !def.wasser) {
    fx.meldung('Wirf die Angel ins Wasser. Stell dich ans Ufer und schau aufs Wasser.');
    S.angeln = null;
    return;
  }
  a.phase = 'wurf';
  a.t = 0;
  a.bx = ziel.x * T + 8;
  a.by = ziel.y * T + 9;
  a.wasser = def.wasser;
  fx.ton('wurf');
}

function haken(S, fx) {
  const a = S.angeln;
  const wahl = L.fischWaehlen(S.s, a.wasser);
  if (wahl.muell) { fang(S, fx, wahl.muell, false); return; }
  const f = wahl.fisch;
  const lvl = L.stufe(S.s, 'angeln');
  a.phase = 'drill';
  a.t = 0;
  a.drill = {
    fisch: f.id, d: f.fisch.d, v: f.fisch.v,
    zone: Math.min(0.42, 0.26 + lvl * 0.015),
    p: 0, pv: 0, fp: 0.25, fz: 0.5, fort: 0.3, perfekt: true, wechsel: 0.4,
  };
  fx.ton('haken');
}

function drill(S, dt, E, fx) {
  const d = S.angeln.drill;
  d.pv = klemme(d.pv + (E.benutzen.gehalten ? 2.6 : -2.3) * dt, -1.5, 1.5);
  d.p += d.pv * dt;
  if (d.p < 0) { d.p = 0; d.pv = -d.pv * 0.35; }
  if (d.p > 1 - d.zone) { d.p = 1 - d.zone; d.pv = 0; }

  d.wechsel -= dt;
  if (d.wechsel <= 0) {
    const ruhe = d.v === 'ruhig' ? 1.6 : d.v === 'flink' ? 0.6 : 1.0;
    d.wechsel = (0.4 + Math.random() * 1.2) * ruhe * (1.4 - d.d / 100);
    let ziel = Math.random();
    if (d.v === 'sinker') ziel = Math.random() * 0.6;
    if (d.v === 'flink' && Math.random() < 0.5) ziel = d.fp > 0.5 ? Math.random() * 0.3 : 0.7 + Math.random() * 0.3;
    d.fz = ziel;
  }
  const k = (d.v === 'flink' ? 3.4 : d.v === 'ruhig' ? 1.4 : 2.2) * (0.6 + d.d / 80);
  d.fp += (d.fz - d.fp) * Math.min(1, k * dt);
  d.fp = klemme(d.fp + (Math.random() - 0.5) * 0.012 * (d.d / 50), 0.03, 0.97);

  const drin = d.fp >= d.p && d.fp <= d.p + d.zone;
  if (drin) d.fort += 0.3 * dt;
  else { d.fort -= (0.2 + d.d / 500) * dt; d.perfekt = false; }
  if (d.fort >= 1) fang(S, fx, d.fisch, d.perfekt);
  else if (d.fort <= 0) { fx.meldung('Der Fisch ist entkommen!'); fx.ton('entkommen'); S.angeln = null; }
}

function fang(S, fx, id, perfekt) {
  const erg = L.fangGeben(S.s, S.ort, id, perfekt);
  S.angeln = { phase: 'fang', t: 0, id, q: erg.q || 0 };
  fx.ton('fang');
  fx.ergebnis(erg);
  if (perfekt) fx.meldung('Perfekt gefangen!');
}
