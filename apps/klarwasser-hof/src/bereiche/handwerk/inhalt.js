// Bereich „handwerk": Bastelrezepte, Aufstellbares (Truhe, Vogelscheuche, Sprenger,
// Einmachglas) und was es auf der Karte tut, Handwerkswaren aus dem Einmachglas.

import { ITEMS, item, kategorie, rezept, objektTyp } from '../../daten.js';
import * as L from '../../logik.js';
import { ton, fenster, ergebnisZeigen } from '../../spiel.js';

kategorie('artisan', 'Handwerksware');
kategorie('platz', 'Aufstellbar');

// ─── Handwerkswaren: Wert und Energie hängen vom Ausgangsstoff ab (slot.von) ─

const ausObst = {
  wert: (slot) => (slot.von && ITEMS[slot.von] ? ITEMS[slot.von].preis * 2 + 50 : 0),
  energie: (slot) => (slot.von && ITEMS[slot.von] ? Math.round((ITEMS[slot.von].energie || 20) * 2) : 0),
};
item('marmelade', { name: 'Marmelade', kat: 'artisan', bild: { art: 'glas', f: '#c2283f' }, ...ausObst, text: 'Aus dem Einmachglas. Doppelter Fruchtwert plus 50.' });
item('eingelegt', { name: 'Eingelegtes', kat: 'artisan', bild: { art: 'glas2', f: '#6aa84f' }, ...ausObst, text: 'Aus dem Einmachglas. Doppelter Gemüsewert plus 50.' });

// ─── Aufstellbares ──────────────────────────────────────────────────────────

const platz = (id, name, text) => item(id, { name, kat: 'platz', bild: { art: id }, aufstellbar: true, text });
platz('truhe', 'Truhe', 'Bewahrt 24 Stapel auf. Leer mit der Axt wieder einsammeln.');
platz('vogelscheuche', 'Vogelscheuche', 'Hält Krähen in 8 Feldern Umkreis fern.');
platz('sprenger', 'Sprenger', 'Gießt jeden Morgen die vier angrenzenden Beete.');
platz('qsprenger', 'Qualitätssprenger', 'Gießt jeden Morgen alle acht Beete rundherum.');
platz('einmachglas', 'Einmachglas', 'Macht über Nacht aus Obst Marmelade und aus Gemüse Eingelegtes.');

/** Gemeinsame Felder für Aufgestelltes: blockiert, mit Axt oder Spitzhacke wieder einsammeln. */
const aufgestellt = { blockiert: true, axt: L.aufheben, spitzhacke: L.aufheben };

objektTyp('truhe', {
  ...aufgestellt,
  anlegen(o) { o.inv = Array(24).fill(null); },
  nichtLeer: (o) => (o.inv.some(Boolean) ? 'Die Truhe ist nicht leer.' : null),
  interagieren({ o }) { ton('truhe'); fenster('truhe', { truhe: o }); },
  hinweis: 'Truhe öffnen',
});

objektTyp('vogelscheuche', { ...aufgestellt, kraehenSchutz: 8 });

function sprengen(nachbarn) {
  return ({ ort, x, y }) => {
    for (const [dx, dy] of nachbarn) {
      const f = ort.welt.felder[L.k(x + dx, y + dy)];
      if (f) f.nass = true;
    }
  };
}
const KREUZ = [[0, -1], [-1, 0], [1, 0], [0, 1]];
const RING = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
objektTyp('sprenger', { ...aufgestellt, nacht: sprengen(KREUZ) });
objektTyp('qsprenger', { ...aufgestellt, nacht: sprengen(RING) });

// ─── Einmachglas ────────────────────────────────────────────────────────────

export function glasBenutzen(s, ort, x, y, idx) {
  const o = ort.welt.objekte[L.k(x, y)];
  const erg = L.neuesErgebnis();
  if (o.fertig) {
    if (L.platzFuer(s, { ...o.inhalt, n: 1 }) < 1) return { grund: 'Dein Rucksack ist voll.', items: [] };
    L.geben(s, ort, x, y, { id: o.inhalt.id, von: o.inhalt.von, n: 1 }, erg);
    o.inhalt = null;
    o.fertig = false;
    erg.ok = true;
    return erg;
  }
  if (o.inhalt) return { grund: `${ITEMS[o.inhalt.von].name} wird eingemacht. Morgen früh ist es fertig.`, items: [] };
  const slot = idx != null ? s.spieler.inv[idx] : null;
  const it = slot && ITEMS[slot.id];
  if (!it || !['ernte', 'sammel'].includes(it.kat) || !(it.frucht || it.gemuese)) {
    return { grund: 'Halte Obst oder Gemüse in der Hand und benutze das Glas damit.', items: [] };
  }
  o.inhalt = { id: it.frucht ? 'marmelade' : 'eingelegt', von: slot.id };
  L.entfernenAusSlot(s, idx, 1);
  erg.ok = true;
  erg.text = `${it.name} eingelegt. Morgen früh ist es fertig.`;
  return erg;
}

function glas({ s, ort, x, y }) {
  const erg = glasBenutzen(s, ort, x, y, s.spieler.wahl);
  if (erg.ok) ton(erg.items.length ? 'pop' : 'glas');
  ergebnisZeigen(erg);
}

objektTyp('einmachglas', {
  ...aufgestellt,
  anlegen(o) { o.inhalt = null; o.fertig = false; },
  nichtLeer: (o) => (o.inhalt ? 'Im Einmachglas ist noch etwas.' : null),
  interagieren: glas,
  einlegen: glas,
  nacht({ o }) { if (o.inhalt && !o.fertig) o.fertig = true; },
  hinweis: ({ o }) => (o.fertig ? 'Glas leeren' : o.inhalt ? 'Wird eingemacht…' : 'Einmachen'),
});

// ─── Rezepte ────────────────────────────────────────────────────────────────

rezept('truhe', { zutaten: { holz: 50 } });
rezept('kupferbarren', { zutaten: { kupfererz: 5, kohle: 1 } });
rezept('eisenbarren', { zutaten: { eisenerz: 5, kohle: 1 } });
rezept('goldbarren', { zutaten: { golderz: 5, kohle: 1 } });
rezept('duenger', { menge: 2, zutaten: { saft: 2 }, stufe: ['landwirtschaft', 1] });
rezept('vogelscheuche', { zutaten: { holz: 50, kohle: 1, faser: 20 }, stufe: ['landwirtschaft', 1] });
rezept('sprenger', { zutaten: { kupferbarren: 1, eisenbarren: 1 }, stufe: ['landwirtschaft', 2] });
rezept('koeder', { menge: 5, zutaten: { faser: 3, schleim: 1 }, stufe: ['angeln', 2] });
rezept('einmachglas', { zutaten: { holz: 50, stein: 40, kohle: 8 }, stufe: ['landwirtschaft', 4] });
rezept('qsprenger', { zutaten: { eisenbarren: 1, goldbarren: 1, quarz: 1 }, stufe: ['landwirtschaft', 6] });

