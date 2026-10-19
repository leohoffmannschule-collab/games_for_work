// Bereich „pflanzen": Saatgut und Ernte, Wildpflanzen und Strandfunde, Dünger, Säen aus der
// Hand, Saatgut im Laden, Krähen über Nacht.

import { ITEMS, OBJEKT_TYPEN, JZ_NAME, PFLANZEN, item, kategorie, pflanze, spezialWare, itemBenutzen } from '../../daten.js';
import { karteHolen } from '../../karten.js';
import { system } from '../../system.js';
import * as L from '../../logik.js';
import { ton, meldung, staub } from '../../spiel.js';
import { waehle } from '../../zufall.js';

kategorie('saat', 'Saatgut');
kategorie('ernte', 'Ernte');
kategorie('sammel', 'Sammelfund');
kategorie('duenger', 'Dünger');

// ─── Feldfrüchte ────────────────────────────────────────────────────────────

/** Feldfrucht samt Ernte- und Saat-Gegenstand. */
function frucht(id, { name, saatName, kauf, tage, nach = 0, jz, preis, menge = 1, wuchs, bild, energie, obst = false, extra = 0 }) {
  pflanze(id, { saat: `${id}_saat`, ernte: id, tage, nach, jz, menge, wuchs, extra, farbe: bild.f });
  item(id, {
    name, kat: 'ernte', preis, bild, energie, frucht: obst, gemuese: !obst,
    text: `${jz.map((j) => JZ_NAME[j]).join(' & ')}-Ernte.`,
  });
  item(`${id}_saat`, {
    name: saatName, kat: 'saat', preis: Math.floor(kauf / 2), bild: { art: 'saat', f: bild.f }, kauf, pflanze: id,
    text: `${JZ_NAME[jz[0]]}${jz[1] ? ' & ' + JZ_NAME[jz[1]] : ''}. Reift in ${tage} Tagen${nach ? `, trägt danach alle ${nach} Tage` : ''}.`,
  });
}

// id, Name, Saat, Kaufpreis, Tage, Nachwuchs, Jahreszeiten, Verkauf, Menge, Wuchsform, Bild, Extra
const FRUECHTE = [
  ['pastinake', 'Pastinake', 'Pastinakensamen', 20, 4, 0, ['fruehling'], 35, 1, 'wurzel', { art: 'wurzel', f: '#efe0a0', f2: '#6aa84f' }, { energie: 25 }],
  ['bohne', 'Grüne Bohne', 'Bohnenkerne', 60, 10, 3, ['fruehling'], 40, 1, 'rank', { art: 'schote', f: '#5fae3c' }, { energie: 25 }],
  ['blumenkohl', 'Blumenkohl', 'Blumenkohlsamen', 80, 12, 0, ['fruehling'], 175, 1, 'kohl', { art: 'blumenkohl', f: '#f4f0e0', f2: '#5c9a45' }, { energie: 75 }],
  ['kartoffel', 'Kartoffel', 'Saatkartoffeln', 50, 6, 0, ['fruehling'], 80, 1, 'knolle', { art: 'knolle', f: '#c99a5b' }, { energie: 25, extra: 0.25 }],
  ['gruenkohl', 'Grünkohl', 'Grünkohlsamen', 70, 6, 0, ['fruehling'], 110, 1, 'kohl', { art: 'blattkohl', f: '#3f8a4a' }, { energie: 50 }],
  ['tulpe', 'Tulpe', 'Tulpenzwiebeln', 20, 6, 0, ['fruehling'], 30, 1, 'blume', { art: 'tulpe', f: '#e0475b' }, { energie: 18 }],
  ['melone', 'Melone', 'Melonensamen', 80, 12, 0, ['sommer'], 250, 1, 'gross', { art: 'melone', f: '#6fb648', f2: '#e8506a' }, { energie: 113, obst: true }],
  ['tomate', 'Tomate', 'Tomatensamen', 50, 11, 4, ['sommer'], 60, 1, 'rank', { art: 'tomate', f: '#e2412f' }, { energie: 20 }],
  ['blaubeere', 'Blaubeere', 'Blaubeersamen', 80, 13, 4, ['sommer'], 50, 3, 'busch', { art: 'beeren', f: '#4a63c9' }, { energie: 25, obst: true }],
  ['peperoni', 'Peperoni', 'Peperonisamen', 40, 5, 3, ['sommer'], 40, 1, 'busch', { art: 'peperoni', f: '#d8342a' }, { energie: 13, obst: true }],
  ['radieschen', 'Radieschen', 'Radieschensamen', 40, 6, 0, ['sommer'], 90, 1, 'wurzel', { art: 'rundwurzel', f: '#e04a72', f2: '#6aa84f' }, { energie: 45 }],
  ['mais', 'Mais', 'Maiskörner', 150, 14, 4, ['sommer', 'herbst'], 50, 1, 'hoch', { art: 'kolben', f: '#f2cf45' }, { energie: 25 }],
  ['weizen', 'Weizen', 'Weizensamen', 10, 4, 0, ['sommer', 'herbst'], 25, 1, 'aehre', { art: 'aehre', f: '#d9b45a' }, {}],
  ['kuerbis', 'Kürbis', 'Kürbiskerne', 100, 13, 0, ['herbst'], 320, 1, 'gross', { art: 'kuerbis', f: '#e5872a' }, {}],
  ['aubergine', 'Aubergine', 'Auberginensamen', 20, 5, 5, ['herbst'], 60, 1, 'busch', { art: 'aubergine', f: '#6b3a8f' }, { energie: 20 }],
  ['preiselbeere', 'Preiselbeere', 'Preiselbeersamen', 240, 7, 5, ['herbst'], 75, 2, 'busch', { art: 'beeren', f: '#c2283f' }, { energie: 38, obst: true }],
  ['rotebete', 'Rote Bete', 'Rote-Bete-Samen', 30, 6, 0, ['herbst'], 70, 1, 'wurzel', { art: 'rundwurzel', f: '#8e2a4a', f2: '#5c9a45' }, { energie: 30 }],
  ['pakchoi', 'Pak Choi', 'Pak-Choi-Samen', 50, 4, 0, ['herbst'], 80, 1, 'kohl', { art: 'pakchoi', f: '#8fcf6a', f2: '#eef5dc' }, { energie: 25 }],
];
for (const [id, name, saatName, kauf, tage, nach, jz, preis, menge, wuchs, bild, extra] of FRUECHTE) {
  frucht(id, { name, saatName, kauf, tage, nach, jz, preis, menge, wuchs, bild, ...extra });
}

// ─── Wildpflanzen und Strandfunde ───────────────────────────────────────────
// fundort: Art der Sammelzone (Karte: sammel[].art). saisonal: false bleibt beim Jahreszeitwechsel liegen.

function wild(id, name, preis, bild, extra = {}) { item(id, { name, kat: 'sammel', preis, bild, fundort: 'wald', ...extra }); }
const strand = { fundort: 'strand', strand: true, saisonal: false };
wild('meerrettich', 'Wilder Meerrettich', 50, { art: 'wurzel', f: '#e6dcc2', f2: '#7ba05b' }, { energie: 13, jz: ['fruehling'], gemuese: true });
wild('narzisse', 'Narzisse', 30, { art: 'bluete', f: '#f5d83a', f2: '#fbf3c4' }, { jz: ['fruehling'] });
wild('lauch', 'Lauch', 60, { art: 'lauch' }, { energie: 40, jz: ['fruehling'], gemuese: true });
wild('loewenzahn', 'Löwenzahn', 40, { art: 'bluete', f: '#f2c12e', f2: '#f7d64a' }, { energie: 25, jz: ['fruehling'] });
wild('gewuerzbeere', 'Gewürzbeere', 80, { art: 'beeren', f: '#d8402e' }, { energie: 63, jz: ['sommer'], frucht: true });
wild('wildtraube', 'Wildtraube', 80, { art: 'traube', f: '#7b4fae' }, { energie: 38, jz: ['sommer'], frucht: true });
wild('platterbse', 'Platterbse', 50, { art: 'bluete', f: '#e58fc8', f2: '#f7d0ea' }, { jz: ['sommer'] });
wild('brombeere', 'Brombeere', 20, { art: 'beeren', f: '#3b2a4f' }, { energie: 25, jz: ['herbst'], frucht: true });
wild('haselnuss', 'Haselnuss', 90, { art: 'nuss', f: '#a8743f' }, { energie: 30, jz: ['herbst'] });
wild('pilz', 'Wiesenchampignon', 40, { art: 'pilz', f: '#eadfce' }, { energie: 38, jz: ['herbst'] });
wild('pfifferling', 'Pfifferling', 160, { art: 'pilz', f: '#e8a13a' }, { energie: 75, jz: ['herbst'] });
wild('wildpflaume', 'Wilde Pflaume', 80, { art: 'pflaume', f: '#6b3d8f' }, { energie: 25, jz: ['herbst'], frucht: true });
wild('winterwurzel', 'Winterwurzel', 70, { art: 'knolle', f: '#a8865a' }, { energie: 25, jz: ['winter'], gemuese: true });
wild('kristallfrucht', 'Kristallfrucht', 150, { art: 'kristall', f: '#9fe0f0' }, { energie: 63, jz: ['winter'], frucht: true });
wild('krokus', 'Krokus', 60, { art: 'tulpe', f: '#a77ad8' }, { jz: ['winter'] });
wild('stechpalme', 'Stechpalme', 80, { art: 'stechpalme' }, { jz: ['winter'] });
wild('muschel', 'Venusmuschel', 50, { art: 'muschel', f: '#d8c8b0' }, { ...strand });
wild('herzmuschel', 'Herzmuschel', 50, { art: 'herzmuschel', f: '#e8b8a0' }, { ...strand });
wild('koralle', 'Koralle', 80, { art: 'koralle', f: '#f07a6a' }, { ...strand });
wild('seeigel', 'Seeigel', 160, { art: 'seeigel', f: '#6a3a7a' }, { ...strand, selten: true });
wild('nautilus', 'Nautilusschale', 120, { art: 'nautilus', f: '#f0e0d0', f2: '#c06a40' }, { ...strand, jz: ['winter'] });

item('duenger', { name: 'Dünger', kat: 'duenger', preis: 5, bild: { art: 'sack', f: '#8a6a4a' }, text: 'Vor der Aussaat aufs Beet streuen. Bessere Ernte-Qualität.' });

// ─── Säen und Düngen aus der Hand ───────────────────────────────────────────

itemBenutzen((c) => c.it.kat === 'saat', (c) => {
  const r = L.saeen(c.s, c.ort, c.x, c.y, c.idx);
  if (r.ok) { ton('saat'); staub(c.x, c.y, '#6a4a2a'); } else if (r.grund) meldung(r.grund);
});
itemBenutzen((c) => c.it.kat === 'duenger', (c) => {
  const r = L.duengen(c.s, c.ort, c.x, c.y, c.idx);
  if (r.ok) { ton('saat'); staub(c.x, c.y, '#9aa8b8'); } else if (r.grund) meldung(r.grund);
});

// ─── Saatgut der Jahreszeit im Laden ────────────────────────────────────────

spezialWare('saatgut', {
  angebote(s) {
    const jz = L.jahreszeit(s);
    return Object.values(PFLANZEN).filter((p) => p.jz.includes(jz) && ITEMS[p.saat]?.kauf).map((p) => ({ id: p.saat, preis: ITEMS[p.saat].kauf }));
  },
});

// ─── Krähen ─────────────────────────────────────────────────────────────────

/** Ab 16 Pflanzen holt sich nachts manchmal eine Krähe eine ungeschützte (Objekte mit kraehenSchutz). */
function kraehen(s, bericht, r) {
  if (L.jahreszeit(s) === 'winter') return;
  for (const [id, w] of Object.entries(s.welt)) {
    const def = karteHolen(id, s);
    if (!def?.aussen || !def.farmbar) continue;
    const pflanzen = Object.entries(w.felder).filter(([, f]) => f.pflanze && !f.pflanze.tot);
    if (pflanzen.length < 16 || r() >= 0.4) continue;
    const scheuchen = Object.entries(w.objekte)
      .filter(([, o]) => OBJEKT_TYPEN[o.t]?.kraehenSchutz)
      .map(([kk, o]) => [...L.ausK(kk), OBJEKT_TYPEN[o.t].kraehenSchutz]);
    const offen = pflanzen.filter(([kk]) => {
      const [x, y] = L.ausK(kk);
      return !scheuchen.some(([sx, sy, rad]) => (sx - x) ** 2 + (sy - y) ** 2 <= rad * rad);
    });
    if (!offen.length) continue;
    const [, f] = waehle(r, offen);
    bericht.meldungen.push(`Eine Krähe hat in der Nacht eine Pflanze gefressen (${ITEMS[f.pflanze.id].name}). Eine Vogelscheuche hält sie fern.`);
    f.pflanze = null;
  }
}

system({
  name: 'pflanzen',
  neuesSpiel(s) { L.hinzufuegen(s, { id: 'pastinake_saat', n: 15 }); },
  tagEnde(s, bericht, r) { kraehen(s, bericht, r); },
});
