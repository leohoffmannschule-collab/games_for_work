// Bereich „basis": Werkzeuge und was sie tun, Grundrohstoffe, Müll, die Hindernisse auf der
// Karte (Bäume, Steine, Äste, Unkraut), liegende Sammelfunde, Aufstellen, Tipps.

import { ITEMS, item, kategorie, werkzeugArt, objektTyp, muell, tipp, itemBenutzen } from '../../daten.js';
import { system, mod } from '../../system.js';
import * as L from '../../logik.js';
import { S, ton, meldung, staub, spritzer, splitter, halme, blaetter } from '../../spiel.js';
import { ganz } from '../../zufall.js';
import { T } from '../../daten.js';

kategorie('werkzeug', 'Werkzeug');
kategorie('ressource', 'Rohstoff');
kategorie('muell', 'Fundstück');
kategorie('besonders', 'Besonderes');

// ─── Werkzeuge ──────────────────────────────────────────────────────────────

item('hacke', { name: 'Hacke', kat: 'werkzeug', bild: { art: 'hacke' }, werkzeug: 'hacke', aufruestbar: true, text: 'Lockert Gras zu einem Beet. Ab Kupfer gedrückt halten für mehr Fläche.' });
item('giesskanne', { name: 'Gießkanne', kat: 'werkzeug', bild: { art: 'giesskanne' }, werkzeug: 'giesskanne', aufruestbar: true, text: 'Gießt Beete. An Teich, Fluss oder Meer wieder füllen.' });
item('axt', { name: 'Axt', kat: 'werkzeug', bild: { art: 'axt' }, werkzeug: 'axt', aufruestbar: true, text: 'Fällt Bäume und zerhackt Äste und Stümpfe.' });
item('spitzhacke', { name: 'Spitzhacke', kat: 'werkzeug', bild: { art: 'spitzhacke' }, werkzeug: 'spitzhacke', aufruestbar: true, text: 'Zerschlägt Steine und Erz. Entfernt auch Beete und aufgestellte Dinge.' });
item('sense', { name: 'Sense', kat: 'werkzeug', bild: { art: 'sense' }, werkzeug: 'sense', text: 'Mäht Unkraut und verwelkte Pflanzen in einem Bogen.' });

werkzeugArt('hacke', {
  skill: 'landwirtschaft', aufladbar: true, upgradeText: 'Gedrückt halten lockert mehrere Felder.',
  felder: L.werkzeugFelder,
  wirkung({ s, ort, felder }) {
    const erg = L.hacken(s, ort, felder);
    if (erg.n) { ton('hacken'); for (const [x, y] of felder) if (ort.welt.felder[L.k(x, y)]) staub(x, y, '#8a5e3a'); } else ton('dumpf');
    return erg;
  },
});

werkzeugArt('giesskanne', {
  skill: 'landwirtschaft', aufladbar: true, upgradeText: 'Fasst mehr Wasser. Gedrückt halten gießt mehrere Beete.',
  felder: L.werkzeugFelder,
  wirkung({ s, ort, felder, zx, zy }) {
    const erg = L.giessen(s, ort, felder);
    if (erg.gefuellt) { ton('wasser'); meldung('Gießkanne gefüllt.'); spritzer(zx, zy, 10); }
    else if (erg.leer) { ton('dumpf'); meldung('Die Gießkanne ist leer. Fülle sie an Teich, Fluss oder Meer.'); }
    else { ton('giessen'); for (const [x, y] of felder) spritzer(x, y, 4); }
    return erg;
  },
});

werkzeugArt('axt', {
  skill: 'sammeln', wiederholbar: true, upgradeText: 'Schlägt kräftiger zu und schafft Härteres.',
  wirkung({ s, ort, zx, zy }) {
    const erg = L.axtHieb(s, ort, zx, zy);
    if (erg.treffer === 'holz') { ton('axt'); splitter(zx, zy, '#c8925a'); S.wackel[L.k(zx, zy)] = 0.25; }
    else if (erg.treffer === 'abprall') ton('abprall');
    else if (erg.treffer === 'unkraut') { ton('sense'); halme(zx, zy); }
    else if (erg.treffer === 'aufheben') ton('pop');
    else ton('schwung');
    if (erg.gefallen) {
      ton('baumfall');
      S.fallend.push({ x: zx, y: zy, art: erg.gefallen, t: 0, richtung: S.sp.x < zx * T + 8 ? 1 : -1 });
      blaetter(zx, zy);
    }
    return erg;
  },
});

werkzeugArt('spitzhacke', {
  skill: 'bergbau', wiederholbar: true, upgradeText: 'Schlägt kräftiger zu und schafft Härteres.',
  wirkung({ s, ort, zx, zy }) {
    const erg = L.spitzhackeHieb(s, ort, zx, zy);
    if (erg.treffer === 'stein') { ton('stein'); splitter(zx, zy, '#a8a29a'); S.wackel[L.k(zx, zy)] = 0.2; }
    else if (erg.treffer === 'abprall') ton('abprall');
    else if (erg.treffer === 'unkraut') { ton('sense'); halme(zx, zy); }
    else if (erg.treffer === 'aufheben') ton('pop');
    else if (erg.treffer === 'erde') { ton('hacken'); staub(zx, zy, '#7a8a5a'); }
    else ton('dumpf');
    if (erg.leiter) { ton('leiter'); meldung('Darunter: eine Leiter nach unten!'); }
    return erg;
  },
});

werkzeugArt('sense', {
  wiederholbar: true, dauer: 0.24, schwungTon: 'schwung', schaden: [1, 2],
  felder: L.senseFelder,
  wirkung({ s, ort, felder }) {
    const erg = L.senseSchnitt(s, ort, felder);
    if (erg.n) { ton('sense'); for (const [x, y] of felder) halme(x, y); }
    return erg;
  },
});

// ─── Grundrohstoffe und Müll ────────────────────────────────────────────────

item('holz', { name: 'Holz', kat: 'ressource', preis: 2, bild: { art: 'holz' }, text: 'Zum Basteln und Bauen.' });
item('hartholz', { name: 'Hartholz', kat: 'ressource', preis: 15, bild: { art: 'hartholz' }, text: 'Aus großen Baumstümpfen. Sehr fest.' });
item('stein', { name: 'Stein', kat: 'ressource', preis: 2, bild: { art: 'stein' }, text: 'Zum Basteln und Bauen.' });
item('faser', { name: 'Faser', kat: 'ressource', preis: 1, bild: { art: 'faser' }, text: 'Zähe Halme aus Unkraut.' });
item('saft', { name: 'Baumharz', kat: 'ressource', preis: 2, bild: { art: 'saft' }, text: 'Klebriger Saft aus gefällten Bäumen.' });
item('kohle', { name: 'Kohle', kat: 'ressource', preis: 15, bild: { art: 'kohle' }, text: 'Brennt heiß. Nötig für Barren.' });

item('treibholz', { name: 'Treibholz', kat: 'muell', preis: 1, bild: { art: 'treibholz' }, text: 'Vom Meer glattgeschliffen.' });
item('seetang', { name: 'Seetang', kat: 'muell', preis: 20, bild: { art: 'seetang' }, text: 'Glitschig.' });
item('stiefel', { name: 'Alter Stiefel', kat: 'muell', preis: 0, bild: { art: 'stiefel' }, text: 'Der andere ist sicher auch irgendwo da unten.' });
muell('teich', ['stiefel', 'treibholz']);
muell('fluss', ['stiefel', 'treibholz']);
muell('meer', ['seetang', 'treibholz', 'stiefel']);

// ─── Hindernisse auf der Karte ──────────────────────────────────────────────

objektTyp('baum', {
  blockiert: true,
  axt({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      L.geben(s, ort, x, y, { id: 'holz', n: ganz(r, 10, 14) }, erg);
      if (r() < 0.6) L.geben(s, ort, x, y, { id: 'saft', n: ganz(r, 1, 3) }, erg);
      L.xpGeben(s, 'sammeln', 12, erg);
      ort.welt.objekte[kk] = { t: 'stumpf', hp: 4, art: o.art };
      s.stats.baeume++;
      erg.gefallen = o.art || 'eiche';
    }
    return true;
  },
});

objektTyp('stumpf', {
  blockiert: true,
  axt({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: 'holz', n: ganz(r, 3, 5) }, erg);
      L.xpGeben(s, 'sammeln', 2, erg);
    }
    return true;
  },
});

objektTyp('ast', {
  blockiert: true,
  axt({ s, ort, x, y, kk, erg, r }) {
    delete ort.welt.objekte[kk];
    L.geben(s, ort, x, y, { id: 'holz', n: ganz(r, 1, 2) }, erg);
    erg.treffer = 'holz';
    return true;
  },
});

objektTyp('grossstumpf', {
  blockiert: true,
  axt({ s, ort, x, y, kk, o, erg, stufe, kraft }) {
    if (stufe < 1) {
      erg.grund = 'Dieser Stumpf ist zu zäh. Bruno kann deine Axt verbessern.';
      erg.treffer = 'abprall';
      return true;
    }
    o.hp -= kraft;
    erg.treffer = 'holz';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: 'hartholz', n: 2 }, erg);
      L.xpGeben(s, 'sammeln', 25, erg);
    }
    return true;
  },
});

objektTyp('stein', {
  blockiert: true,
  spitzhacke({ s, ort, x, y, kk, o, erg, r, kraft }) {
    o.hp -= kraft;
    erg.treffer = 'stein';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: 'stein', n: ganz(r, 1, 2) }, erg);
      if (r() < 0.04) L.geben(s, ort, x, y, { id: 'kohle', n: 1 }, erg);
      L.xpGeben(s, 'bergbau', 1, erg);
    }
    return true;
  },
});

objektTyp('fels', {
  blockiert: true,
  spitzhacke({ s, ort, x, y, kk, o, erg, r, stufe, kraft }) {
    if (stufe < 1) {
      erg.grund = 'Dieser Felsbrocken ist zu hart. Bruno kann deine Spitzhacke verbessern.';
      erg.treffer = 'abprall';
      return true;
    }
    o.hp -= kraft;
    erg.treffer = 'stein';
    if (o.hp <= 0) {
      delete ort.welt.objekte[kk];
      L.geben(s, ort, x, y, { id: 'stein', n: ganz(r, 10, 15) }, erg);
      if (r() < 0.5) L.geben(s, ort, x, y, { id: 'kupfererz', n: Math.max(1, Math.round(mod('erzMenge', ganz(r, 1, 3), { s, id: 'kupfererz' }))) }, erg);
      L.xpGeben(s, 'bergbau', 15, erg);
    }
    return true;
  },
});

function unkrautWeg({ s, ort, x, y, kk, erg, r }) {
  delete ort.welt.objekte[kk];
  if (r() < 0.5) L.geben(s, ort, x, y, { id: 'faser', n: 1 }, erg);
  erg.treffer = 'unkraut';
  return true;
}
objektTyp('unkraut', { blockiert: true, axt: unkrautWeg, spitzhacke: unkrautWeg, sense: unkrautWeg, waffe: unkrautWeg });

/** Ein liegender Gegenstand ({ t: 'sammel', id }): Wildfunde, Eier. Drüberlaufen hebt ihn auf. */
objektTyp('sammel', {
  aufnehmen: ({ s, ort, x, y }) => L.aufsammeln(s, ort, x, y),
  hinweis: ({ o }) => `${ITEMS[o.id].name} aufheben`,
});

// ─── Aufstellen aus der Hand ────────────────────────────────────────────────

itemBenutzen((c) => !!c.it.aufstellbar, (c) => {
  if (c.f.x === c.x && c.f.y === c.y) { meldung('Dort stehst du gerade selbst.'); return; }
  const r = L.aufstellen(c.s, c.ort, c.x, c.y, c.idx);
  if (r.ok) { ton('truhe'); staub(c.x, c.y, '#a8784a'); } else if (r.grund) meldung(r.grund);
});

// ─── Tipps (Fernseher) ──────────────────────────────────────────────────────

for (const t of [
  'Gegossene Beete sind dunkler. Nur was gegossen ist, wächst über Nacht.',
  'Regen gießt alle Beete. An Regentagen beißen außerdem besondere Fische.',
  'Am letzten Tag jeder Jahreszeit welkt alles, was im neuen Wetter nicht wachsen kann.',
  'Aus Unkraut wird Faser, aus gefällten Bäumen Harz. Beides braucht man zum Basteln.',
  'Mit Dünger im Beet gelingt öfter eine Silber- oder Goldernte.',
  'Wer jemandem ein Lieblingsgeschenk macht, gewinnt schnell Herzen. Am Geburtstag zählt es achtfach.',
  'Aus fünf Erz und einer Kohle bastelst du einen Barren. Bruno verbessert damit deine Werkzeuge.',
  'In der Mine liegt die Leiter nach unten unter einem der Steine.',
  'Alle fünf Ebenen merkt sich der Förderkorb am Mineneingang deinen Fortschritt.',
  'Krähen fressen ungeschützte Pflanzen. Eine Vogelscheuche schützt alles in acht Feldern Umkreis.',
  'Essen stellt Energie wieder her. Halte etwas Essbares in der Hand und drücke F.',
  'Mit Köder im Rucksack beißen die Fische doppelt so schnell.',
]) tipp(t);

// ─── Startausrüstung ────────────────────────────────────────────────────────

system({
  name: 'basis',
  neuesSpiel(s) {
    for (const id of ['hacke', 'giesskanne', 'axt', 'spitzhacke', 'sense']) L.hinzufuegen(s, { id, n: 1 });
  },
});
