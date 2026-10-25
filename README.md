# Pausenspiele

Ein kleiner Spiele-Hub für die Arbeitspause: sechs Spiele, die in 5 bis 20 Minuten
durchgespielt sind und sich jederzeit stehen lassen lassen – plus die **Blockwelt**,
eine freie 3D-Welt zum Bauen und Erkunden. Alles läuft rein im
Browser – kein Build, kein Server, kein Konto, keine Netzwerkzugriffe.

| Spiel | Dauer | Kurz gesagt |
| --- | --- | --- |
| **2048** | 5–10 Min | Zahlen zusammenschieben, mit Rückgängig-Funktion und Wischgesten. |
| **Minensucher** | 3–15 Min | Drei Größen, erster Klick trifft nie eine Mine, Chord-Klick auf Zahlen. |
| **Sudoku** | 10–20 Min | Selbst erzeugte Rätsel mit garantiert eindeutiger Lösung, Notizen, Tipp, Prüfung. |
| **Wortjagd** | 3–8 Min | Deutsches Wörterraten: fünf Buchstaben, sechs Versuche, 557 Wörter. |
| **Snake** | 2–5 Min | Der Klassiker, wahlweise mit tödlichen oder offenen Wänden. |
| **Dash** | 5–15 Min | Hüpfspiel nach Art von Geometry Dash: drei Strecken, ein Knopf, sofortiger Neustart. |
| **Blockwelt** | frei | Unendliche 3D-Blockwelt mit Werkzeugen, Handwerk, Wasser, Fackeln, Tieren und Zombies; Kreativ- und Überlebensmodus. |

## Starten

Die Seite ist statisch, braucht aber einen HTTP-Server: Die Spiele werden als
ES-Module nachgeladen, und die blockiert der Browser über `file://`. Ein
Doppelklick auf `index.html` zeigt deshalb nur eine leere Seite.

```bash
git clone https://github.com/leohoffmannschule-collab/games_for_work.git
cd games_for_work
python3 -m http.server 8000
# danach http://localhost:8000 aufrufen
```

`npx serve` oder jeder andere statische Server tut es genauso. Zum Veröffentlichen
reicht jeder Webspace, der Dateien ausliefert – etwa GitHub Pages: unter
*Settings → Pages* als Quelle „Deploy from a branch" wählen, Branch und Ordner `/`
setzen, fertig. Es muss nichts gebaut werden.

## Aufbau

```
index.html              Seitengerüst (Kopfzeile, Container)
assets/
  app.js                Hub, Router (#/<spiel>), Theme-Umschalter, Spiel-Kontext
  store.js              localStorage-Wrapper für Bestwerte und Statistik
  style.css             Design-System und alle Spiel-Styles
  games/
    g2048.js            2048
    minen.js            Minensucher
    sudoku.js           Sudoku inkl. Generator und Solver
    wortjagd.js         Wörterraten
    woerter.js          Wörterliste (557 Wörter mit fünf Buchstaben)
    snake.js            Snake
    dash.js             Dash inkl. Physik, Strecken und Zeichenroutine
    blockwelt.js        Blockwelt: Oberfläche, Inventar, Eingaben, Spielschleife
    blockwelt/          Kern der Blockwelt (siehe unten)
build.mjs               erzeugt dist/index.html für Hosts ohne <head>/<body>
tools/
  strecken-pruefen.mjs  prüft die Dash-Strecken auf Lösbarkeit und Fairness
  blockwelt-pruefen.mjs prüft Welt, Physik, Abbauzeiten, Wasser, Licht, Hunger und Wesen
```

Der Hub ist eine kleine Single-Page-App: ein Klick setzt den Hash, der Router lädt
das passende Modul per dynamischem `import()`. Jedes Spielmodul exportiert genau
eine Funktion:

```js
export function createGame(ctx) { /* … */ }
```

`ctx` liefert den Wurzel-Container, den Speicher und Helfer wie `ctx.on(...)` und
`ctx.interval(...)`, die beim Verlassen des Spiels automatisch aufgeräumt werden.
Ein neues Spiel hinzufügen heißt also: Modul unter `assets/games/` anlegen und
einen Eintrag in der `GAMES`-Liste in `assets/app.js` ergänzen.

## Gut zu wissen

- **Bedienung**: alles ist per Tastatur und per Touch spielbar. `Esc` führt aus
  jedem Spiel zurück zur Übersicht.
- **Hell/Dunkel**: folgt der Systemeinstellung, lässt sich oben rechts umschalten.
- **Daten**: Bestzeiten und Punktestände liegen ausschließlich im `localStorage`
  dieses Browsers. Ist der Speicher gesperrt, läuft alles weiter – nur ohne Bestenliste.
- **Sudoku**: Der Generator baut erst ein volles Gitter und entfernt dann
  symmetrische Paare, solange die Lösung eindeutig bleibt. Jedes Rätsel ist damit
  ohne Raten lösbar.
- **Dash**: Kein Ton – das Spiel funktioniert bewusst auch bei stummem Rechner.
  Die Strecken stehen als Zeichenzeilen in `assets/games/dash.js` (`^` Stachel,
  `#` Block, unterste Zeile auf dem Boden) und lassen sich dort direkt ändern.

## Blockwelt

Ein eigener 3D-Sandkasten mit eigenem WebGL2-Renderer – ohne Bibliotheken, ohne
Bilddateien (alle Texturen, Symbole und Wesen werden beim Start gezeichnet). Er läuft
mit Maus und Tastatur oder per Touch am Handy und braucht WebGL 2.

- **Welt**: unendlich, aus einer Zahl (Seed) erzeugt – Meere, Strände, Wiesen mit hohem
  Gras und Blumen, Wälder, Wüsten, schneebedeckte Gipfel, Höhlen mit Kohle- und
  Eisenerz. Nur Änderungen werden im `localStorage` gespeichert, alles andere erzeugt der
  Seed bei Bedarf neu.
- **Werkzeuge und Handwerk**: Spitzhacke, Axt, Schaufel und Schwert aus Holz, Stein und
  Eisen. Werkbank für Werkzeuge, Ofen zum Schmelzen von Erz, Sand und Fleisch (mit Kohle,
  Holz oder Brettern als Brennstoff). Werkzeuge nutzen sich ab.
- **Wasser**: fließt aus Quellen bis zu 7 Blöcke weit, sucht sich Gefälle, fällt in
  Löcher und spült Fackeln und Pflanzen weg. Mit dem Eimer lässt es sich schöpfen und
  ausgießen. Sand fällt, Fackeln und Blumen brauchen Halt.
- **Licht**: Himmelslicht sickert in Höhlen und Häuser, Fackeln und Lampen leuchten
  15 Blöcke weit, weiche Schatten an jeder Ecke.
- **Tiere und Zombies**: Schweine, Kühe und Schafe laufen umher und fliehen bei Treffern;
  nachts und in dunklen Höhlen kommen Zombies, die in der Sonne verbrennen. Der Schalter
  „Monster“ schaltet sie ab.
- **Überleben**: Herzen, Hunger, Sättigung und Luft unter Wasser; Essen über die rechte
  Maustaste (oder Tippen) mit dem Essen in der Hand. Kreativmodus: unbegrenzt Blöcke,
  Fliegen (zweimal Leertaste), sofortiges Abbauen.
- **Tag und Nacht**: 20 Minuten pro Tag, Sonne, Mond, Sterne.
- **Handy**: Links wischen = gehen (ganz nach vorn = sprinten), rechts wischen = umschauen,
  kurz tippen = setzen, essen oder angreifen, halten = abbauen. Knöpfe für Sprung, Ducken,
  Fliegen, Inventar und Pause; beim Spielen füllt das Spiel den ganzen Bildschirm.
- **Steuerung am Rechner**: `WASD`, Leertaste, `Strg` (oder `W` doppelt) sprinten, `Shift`
  schleichen (bleibt an Kanten stehen), linke Taste abbauen und angreifen, rechte setzen,
  essen, Eimer benutzen und Werkbank/Ofen öffnen, `E` Inventar, `F3` Debug-Werte.

### Reverse Engineering – was damit gemeint ist

Nachgebaut wird das **Verhalten**, nicht der Code. Alle Regeln stammen aus den
öffentlich dokumentierten Werten des Vorbilds:

| Bereich | Übernommene Regeln |
| --- | --- |
| Bewegung | 20 Ticks/s, Schwerkraft 0,08, Luftwiderstand 0,98, Sprung 0,42, Reibung 0,6 × 0,91, Gehen 0,1, Sprint 0,13 |
| Abbauen | Härte je Block, Tempo/Härte/30 (bzw. /100 ohne passendes Werkzeug), Werkzeugstufen 2/4/6, unter Wasser und in der Luft ÷5 |
| Werkzeuge | Haltbarkeit 59/131/250, Schaden Hand 1 bis Eisenschwert 6, Abnutzung 1 bzw. 2 je Einsatz |
| Wasser | Stufen 0–7, Ausbreitung alle 5 Ticks, Gefällesuche 4 Blöcke, unendliche Quelle, Strömung 0,014 |
| Licht | Stufen 0–15, Fackel 14, Lampe 15, −1 je Block, Lichtkurve f/(4−3f), Nacht auf Stufe 4 |
| Hunger | Erschöpfung (Sprint 0,1/m, Sprung 0,05/0,2, Abbau 0,005, Angriff 0,1), Heilung ab 18, Luft 15 s |
| Wesen | Tempo Schwein 0,25, Kuh 0,2, Schaf/Zombie 0,23; Zombie 20 Leben, 3 Schaden, Reichweite (2·Breite)² + Breite |
| Kampf | Rückstoß 0,4, 10 Ticks Unverwundbarkeit, kritischer Treffer im Fallen ×1,5 |

`node tools/blockwelt-pruefen.mjs` rechnet daraus die bekannten Messwerte nach, etwa
4,317 m/s gehen, 5,612 m/s sprinten, 1,252 Blöcke Sprunghöhe, 7,5 s für Stein mit der
Hand, 1,15 s mit der Holzspitzhacke, 7 Blöcke Wasserfluss und 2,28 m/s für Zombies. Code,
Welt, Texturen und Namen sind eigen; es werden weder Originaldateien noch Originalassets
verwendet oder mitgeliefert.

Bewusste Abweichungen: Beute landet direkt im Inventar statt als Gegenstand am Boden,
Schmelzen geht sofort, nach dem Tod bleibt das Inventar erhalten, und Rezepte werden aus
einer Liste gewählt statt im 3×3-Raster gelegt.

Aufbau unter `assets/games/blockwelt/`:

```
noise.js     Zufall und Perlin-Rauschen (deterministisch)
blocks.js    Blockarten, Härte, Werkzeugbedarf (reine Daten)
items.js     Gegenstände, Werkzeuge, Essen, Abbauzeiten, Rezepte, Inventar
world.js     Chunks (16×64×16), Gelände, Erze, Pflanzen, Halt, Strahlentest, Speichern
fluids.js    Fließendes Wasser
region.js    Himmels- und Blocklicht (Breitensuche über den Chunk plus 15 Blöcke Rand)
mesher.js    Chunk -> Dreiecke: Würfel, Pflanzen, Fackeln, Wasser; weiche Beleuchtung
entities.js  Gemeinsame Physik, Tiere und Zombies, Spawnen, Kampf
player.js    Spieler: Bewegung, Hunger, Luft, Heilung
models.js    Würfelmodelle und Animation der Wesen
render.js    WebGL2: Gelände, Wesen, Wasser, Himmel, Risse, Blockumriss
atlas.js     Prozedural gezeichnete Texturen, Symbole und Anzeigen
```

Noch nicht enthalten: Gegenstände am Boden, Truhen, Betten, Lava, Redstone, Mehrspieler.

## Strecken prüfen

Nach jeder Änderung an den Dash-Strecken:

```bash
node tools/strecken-pruefen.mjs
```

Weil pro Zeitschritt nur „springen oder nicht" zur Wahl steht, lassen sich alle
erreichbaren Zustände vollständig aufzählen. Das Skript prüft damit zweierlei:
ob die Strecke überhaupt zu schaffen ist, und wie viel Zeitspielraum der engste
Pflichtsprung lässt. Unter 60 ms gilt als unfair und lässt den Lauf scheitern –
eine Strecke mit einem unmöglichen Sprung sieht im Quelltext genauso harmlos aus
wie eine faire.

## Formatierung

```bash
npx prettier --write "assets/**/*.js" index.html assets/style.css build.mjs
```
