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
| **Blockwelt** | frei | Unendliche 3D-Blockwelt mit Höhlen, Meeren, Tag und Nacht; Kreativ- und Überlebensmodus. |

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
    blockwelt.js        Blockwelt: Oberfläche, Eingaben, Spielschleife
    blockwelt/          Kern der Blockwelt (siehe unten)
build.mjs               erzeugt dist/index.html für Hosts ohne <head>/<body>
tools/
  strecken-pruefen.mjs  prüft die Dash-Strecken auf Lösbarkeit und Fairness
  blockwelt-pruefen.mjs prüft Weltgenerierung, Strahlentest und Physik der Blockwelt
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
Bilddateien (alle Texturen werden beim Start gezeichnet). Er braucht Maus und
Tastatur und ein Gerät mit WebGL 2.

- **Welt**: unendlich, aus einer Zahl (Seed) erzeugt – Meere, Strände, Wiesen, Wälder,
  Wüsten, schneebedeckte Gipfel, Höhlen und Bäume. Nur deine Änderungen werden im
  `localStorage` gespeichert, alles andere erzeugt der Seed bei Bedarf neu.
- **Kreativ**: unbegrenzt Blöcke, Fliegen (zweimal Leertaste), sofortiges Abbauen,
  Baustein-Auswahl mit `E`, Mittelklick nimmt einen Block auf.
- **Überleben**: Abbauen dauert je nach Härte, Blöcke landen in der Leiste, Sturzschaden,
  Herzen, Herstellen von Brettern, Glas, Ziegeln und Lampen über `E`.
- **Tag und Nacht**: 20 Minuten pro Tag, Sonne, Mond, Sterne, dunkle Höhlen.
- **Steuerung**: `WASD`, Leertaste, `Strg` (oder `W` doppelt) sprinten, `Shift` schleichen
  (bleibt an Kanten stehen), linke Taste abbauen, rechte setzen, `F3` zeigt Debug-Werte.

### Reverse Engineering – was damit gemeint ist

Nachgebaut wird das **Verhalten**, nicht der Code: Die Bewegungsphysik nutzt die
öffentlich dokumentierten Konstanten des Vorbilds (20 Ticks pro Sekunde, Schwerkraft
0,08, Luftwiderstand 0,98, Sprungimpuls 0,42, Bodenreibung 0,6 × 0,91, Gehtempo 0,1,
Sprint 0,13, Sturzschaden ab 3 Blöcken, Blockhärten). `node tools/blockwelt-pruefen.mjs`
rechnet daraus die bekannten Messwerte nach: 4,317 m/s gehen, 5,612 m/s sprinten,
1,252 Blöcke Sprunghöhe. Code, Welt, Texturen und Namen sind eigen; es werden weder
Originaldateien noch Originalassets verwendet oder mitgeliefert.

Aufbau unter `assets/games/blockwelt/`:

```
noise.js    Zufall und Perlin-Rauschen (deterministisch)
blocks.js   Blockarten, Härte, Rezepte (reine Daten)
world.js    Chunks (16×64×16), Gelände, Höhlen, Bäume, Strahlentest, Speichern
player.js   Bewegung und Kollision im festen 20-Hz-Takt
mesher.js   Chunk -> Dreiecke, nur sichtbare Flächen, Ambient Occlusion, Himmelslicht
render.js   WebGL2: Gelände, Wasser, Himmel, Sonne/Mond/Sterne, Blockumriss
atlas.js    Prozedural gezeichneter Texturatlas und Block-Symbole
```

Noch nicht enthalten: Wasserfluss, Mobs, Werkzeuge, Fackellicht, Redstone, Touch-Bedienung.

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
