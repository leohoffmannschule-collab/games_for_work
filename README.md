# Pausenspiele

Ein kleiner Spiele-Hub für die Arbeitspause: fünf Spiele, die in 5 bis 20 Minuten
durchgespielt sind und sich jederzeit stehen lassen lassen. Alles läuft rein im
Browser – kein Build, kein Server, kein Konto, keine Netzwerkzugriffe.

| Spiel | Dauer | Kurz gesagt |
| --- | --- | --- |
| **2048** | 5–10 Min | Zahlen zusammenschieben, mit Rückgängig-Funktion und Wischgesten. |
| **Minensucher** | 3–15 Min | Drei Größen, erster Klick trifft nie eine Mine, Chord-Klick auf Zahlen. |
| **Sudoku** | 10–20 Min | Selbst erzeugte Rätsel mit garantiert eindeutiger Lösung, Notizen, Tipp, Prüfung. |
| **Wortjagd** | 3–8 Min | Deutsches Wörterraten: fünf Buchstaben, sechs Versuche, 557 Wörter. |
| **Snake** | 2–5 Min | Der Klassiker, wahlweise mit tödlichen oder offenen Wänden. |

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
build.mjs               erzeugt dist/index.html für Hosts ohne <head>/<body>
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

## Formatierung

```bash
npx prettier --write "assets/**/*.js" index.html assets/style.css build.mjs
```
