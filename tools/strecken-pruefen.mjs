/**
 * Prüft die Dash-Strecken: Ist jede zu schaffen, und wie viel Zeitspielraum
 * lässt der engste Sprung?
 *
 * Die Strecken stehen als Zeichenzeilen in assets/games/dash.js. Wer dort
 * etwas ändert, sollte das hier laufen lassen – eine Strecke mit einem
 * unmöglichen oder unfair engen Sprung sieht im Quelltext genauso harmlos aus
 * wie eine faire.
 *
 * Verfahren: Da pro Zeitschritt nur „springen oder nicht" zur Wahl steht und
 * die Physik fest getaktet ist, lassen sich alle erreichbaren Zustände Schicht
 * für Schicht aufzählen. Ein Rücklauf markiert dann, aus welchen davon das Ziel
 * noch erreichbar ist. Damit steht für jeden Zeitschritt fest, ob ein Absprung
 * dort noch zum Ziel führt – und das ist genau das Zeitfenster.
 *
 *   node tools/strecken-pruefen.mjs
 */

import { STRECKEN, PHYSIK, neuerLauf, schritt } from '../assets/games/dash.js';

const MS = PHYSIK.DT * 1000;
const ENG = 60; // ab hier gilt ein Sprung als unfair knapp (in Millisekunden)

const schluessel = (l) => `${Math.round(l.y * 1e6)}|${Math.round(l.vy * 1e6)}|${l.boden ? 1 : 0}`;

/** Alle überlebensfähigen Zustände Schicht für Schicht. */
function vorwaerts(strecke) {
  const schichten = [];
  let aktuell = new Map([[schluessel(neuerLauf(0)), neuerLauf(0)]]);
  let zielFrame = -1;

  for (let frame = 0; aktuell.size; frame++) {
    schichten.push(aktuell);
    const naechste = new Map();
    for (const zustand of aktuell.values()) {
      for (const halten of [false, true]) {
        const kopie = { ...zustand };
        const e = schritt(kopie, strecke, halten);
        if (e === 'tot') continue;
        if (e === 'ziel') {
          if (zielFrame < 0) zielFrame = frame + 1;
          continue;
        }
        const k = schluessel(kopie);
        if (!naechste.has(k)) naechste.set(k, kopie);
      }
    }
    aktuell = naechste;
    if (frame > 20000) break;
  }
  return { schichten, zielFrame };
}

/** Rücklauf: aus welchen Zuständen ist das Ziel noch erreichbar? */
function rueckwaerts(strecke, schichten) {
  const gut = schichten.map(() => new Set());
  for (let frame = schichten.length - 1; frame >= 0; frame--) {
    for (const [k, zustand] of schichten[frame]) {
      for (const halten of [false, true]) {
        const kopie = { ...zustand };
        const e = schritt(kopie, strecke, halten);
        if (e === 'tot') continue;
        if (e === 'ziel') {
          gut[frame].add(k);
          break;
        }
        if (frame + 1 < schichten.length && gut[frame + 1].has(schluessel(kopie))) {
          gut[frame].add(k);
          break;
        }
      }
    }
  }
  return gut;
}

/**
 * Zeitfenster für Absprünge: zusammenhängende Zeitschritte, in denen ein
 * Sprung von festem Boden aus noch ins Ziel führt.
 */
function sprungfenster(strecke, schichten, gut) {
  const fenster = [];
  let offen = null;

  for (let frame = 0; frame < schichten.length; frame++) {
    let moeglich = false;
    for (const [k, zustand] of schichten[frame]) {
      if (!zustand.boden || !gut[frame].has(k)) continue;
      const kopie = { ...zustand };
      const e = schritt(kopie, strecke, true);
      if (e === 'ziel' || (e !== 'tot' && gut[frame + 1]?.has(schluessel(kopie)))) {
        moeglich = true;
        break;
      }
    }
    if (moeglich && !offen) offen = { von: frame };
    if (!moeglich && offen) {
      fenster.push({ ...offen, bis: frame - 1 });
      offen = null;
    }
  }
  if (offen) fenster.push({ ...offen, bis: schichten.length - 1 });
  return fenster;
}

/**
 * Zeitschritte, in denen der Würfel zwingend in der Luft sein muss – es gibt
 * dort keinen Zustand mehr, der auf Boden steht und noch ins Ziel führt.
 */
function mussFliegen(schichten, gut) {
  return schichten.map((schicht, frame) => {
    for (const [k, zustand] of schicht) {
      if (zustand.boden && gut[frame].has(k)) return false;
    }
    return true;
  });
}

/**
 * Nur die Fenster, die wirklich getroffen werden müssen: die unmittelbar vor
 * einem Abschnitt liegen, den der Würfel nur fliegend überquert. Alle anderen
 * Absprünge sind freiwillig und sagen nichts über die Schwierigkeit aus.
 */
function pflichtfenster(fenster, luft) {
  const pflicht = [];
  for (let frame = 1; frame < luft.length; frame++) {
    if (!luft[frame] || luft[frame - 1]) continue;
    const passend = fenster.find((f) => f.bis === frame - 1);
    if (passend) pflicht.push(passend);
  }
  return pflicht;
}

let fehler = 0;

for (const s of STRECKEN) {
  const dauer = (s.strecke.breite / PHYSIK.TEMPO).toFixed(1);
  const { schichten, zielFrame } = vorwaerts(s.strecke);

  if (zielFrame < 0) {
    fehler++;
    const weiteste = (schichten.length * PHYSIK.DT * PHYSIK.TEMPO) | 0;
    console.log(
      `FEHL ${s.name.padEnd(13)} nicht zu schaffen – Schluss spätestens bei Feld ${weiteste} von ${s.strecke.breite}`,
    );
    continue;
  }

  const gut = rueckwaerts(s.strecke, schichten);
  const luft = mussFliegen(schichten, gut);
  const pflicht = pflichtfenster(sprungfenster(s.strecke, schichten, gut), luft);
  const engstes = pflicht.reduce((a, f) => (f.bis - f.von < a.bis - a.von ? f : a));
  const breite = (engstes.bis - engstes.von + 1) * MS;
  const stelle = (engstes.von * PHYSIK.DT * PHYSIK.TEMPO) | 0;
  const knapp = breite < ENG;
  if (knapp) fehler++;

  console.log(
    `${knapp ? 'ENG ' : 'OK  '} ${s.name.padEnd(13)} ${String(s.strecke.breite).padStart(3)} Felder · ~${dauer}s · ` +
      `${pflicht.length} Pflichtsprünge · engstes Fenster ${breite.toFixed(0)} ms (bei Feld ${stelle})`,
  );
}

if (fehler) {
  console.log(`\nMindestens eine Strecke ist unmöglich oder enger als ${ENG} ms.`);
  process.exit(1);
}
console.log('\nAlle Strecken sind zu schaffen und fair getaktet.');
