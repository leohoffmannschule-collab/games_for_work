# Pausenspiele

Ein kleiner Hub für die Arbeitspause und für danach: sechs Spiele, die in 5 bis 20
Minuten durchgespielt sind und sich jederzeit stehen lassen lassen, dazu Kacheln für
die größeren Projekte – das Hofspiel **Klarwasser-Hof** und die eigenen Websites
**LoreVault** und **Abenteuer-Almanach**. Alles läuft rein im Browser – kein Build,
kein Konto.

| Spiel | Dauer | Kurz gesagt |
| --- | --- | --- |
| **2048** | 5–10 Min | Zahlen zusammenschieben, mit Rückgängig-Funktion und Wischgesten. |
| **Minensucher** | 3–15 Min | Drei Größen, erster Klick trifft nie eine Mine, Chord-Klick auf Zahlen. |
| **Sudoku** | 10–20 Min | Selbst erzeugte Rätsel mit garantiert eindeutiger Lösung, Notizen, Tipp, Prüfung. |
| **Wortjagd** | 3–8 Min | Deutsches Wörterraten: fünf Buchstaben, sechs Versuche, 557 Wörter. |
| **Snake** | 2–5 Min | Der Klassiker, wahlweise mit tödlichen oder offenen Wänden. |
| **Dash** | 5–15 Min | Hüpfspiel nach Art von Geometry Dash: drei Strecken, ein Knopf, sofortiger Neustart. |

Darunter, im Abschnitt „Spiele & Websites":

| Kachel | Woher | Wie sie sich öffnet |
| --- | --- | --- |
| **Klarwasser-Hof** | [the_price_of_clearwater](https://github.com/leohoffmannschule-collab/the_price_of_clearwater), Branch `claude/busy-lovelace-s50ri5` | im Hub, Kopie unter `apps/klarwasser-hof/` |
| **LoreVault** | [LoreVault](https://github.com/leohoffmannschule-collab/LoreVault) | im Hub, Kopie unter `apps/lorevault/` |
| **Abenteuer-Almanach** | [d-d_manager_repos](https://github.com/leohoffmannschule-collab/d-d_manager_repos) | neuer Tab auf `https://www.deinemudda.fun` |

Die Pausenspiele kommen ganz ohne Netz aus. Klarwasser-Hof lädt seine Schriften von
Google Fonts, der Almanach braucht ohnehin seinen eigenen Server.

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
  app.js                Hub, Router (#/<spiel>), Theme-Umschalter, Spiel-Kontext, App-Kacheln
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
apps/
  klarwasser-hof/       Kopie des Hofspiels (index.html, src/)
  lorevault/            Kopie von LoreVault; eigene PDFs gehören nach books/
  quellen.json          aus welchem Repo, Branch und Commit die Kopien stammen
build.mjs               erzeugt dist/index.html für Hosts ohne <head>/<body>
tools/
  apps-holen.mjs        erneuert die Kopien unter apps/ aus ihren Repos
  strecken-pruefen.mjs  prüft die Dash-Strecken auf Lösbarkeit und Fairness
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

## Spiele & Websites

Die größeren Projekte stehen in der `APPS`-Liste in `assets/app.js`. Ein Eintrag mit
`src` zeigt eine Seite unter `apps/` im Hub an: eine schmale Leiste mit „Übersicht"
und „Eigener Tab", darunter die App in einem Rahmen über die ganze Fensterbreite.
Ein Eintrag mit `url` öffnet die Adresse in einem neuen Tab – so beim
Abenteuer-Almanach, der einen eigenen Server mit Datenbank braucht und deshalb
nicht als Kopie im Hub liegen kann. Zieht er auf eine andere Adresse um, genügt es,
`url` und den Text in `headline` zu ändern.

Klarwasser-Hof und LoreVault liegen als Kopie unter `apps/`, damit jede Kachel ohne
zweiten Server und auch auf GitHub Pages funktioniert. Entwickelt wird weiter in den
eigenen Repos; den neuesten Stand holt

```bash
node tools/apps-holen.mjs              # beide
node tools/apps-holen.mjs lorevault    # nur eine
```

Danach die Änderungen unter `apps/` einchecken. Welcher Branch geholt wird, steht
oben im Skript. Ersetzt werden nur die Dateien der App – eigene PDFs unter
`apps/lorevault/books/` bleiben liegen und werden nicht eingecheckt.

Weil die Apps unter derselben Adresse laufen wie der Hub, kann die Kachel ihren
Spielstand lesen: Klarwasser-Hof zeigt Hof, Jahreszeit und Tag, LoreVault die Zahl
der Bücher. Der Hub liest dabei nur, er schreibt nie in die Daten der Apps.

## Gut zu wissen

- **Bedienung**: alles ist per Tastatur und per Touch spielbar. `Esc` führt aus
  jedem Pausenspiel zurück zur Übersicht. In Klarwasser-Hof und LoreVault gehört
  `Esc` der App (dort öffnet es etwa das Menü), zurück geht es über „Übersicht".
- **Hell/Dunkel**: folgt der Systemeinstellung, lässt sich oben rechts umschalten.
- **Daten**: Bestzeiten und Punktestände liegen ausschließlich im `localStorage`
  dieses Browsers. Ist der Speicher gesperrt, läuft alles weiter – nur ohne Bestenliste.
- **Sudoku**: Der Generator baut erst ein volles Gitter und entfernt dann
  symmetrische Paare, solange die Lösung eindeutig bleibt. Jedes Rätsel ist damit
  ohne Raten lösbar.
- **Dash**: Kein Ton – das Spiel funktioniert bewusst auch bei stummem Rechner.
  Die Strecken stehen als Zeichenzeilen in `assets/games/dash.js` (`^` Stachel,
  `#` Block, unterste Zeile auf dem Boden) und lassen sich dort direkt ändern.

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
npx prettier --write "assets/**/*.js" index.html assets/style.css build.mjs tools/apps-holen.mjs
```

`apps/` bleibt dabei bewusst außen vor – das sind Kopien, formatiert wird im
jeweiligen Repo.
