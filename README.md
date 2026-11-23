# Vice Coast – Street Racing & Open World

Ein vollständiges 3D-Renn- und Open-World-Spiel in **einer einzigen HTML-Datei** (`index.html`).
Alle Texturen, Fahrzeuge, Gebäude, Landschaften und Geräusche werden beim Start prozedural
erzeugt – es gibt keine Bild-, Modell- oder Audiodateien.

## Starten

1. `index.html` in einem aktuellen Desktop-Browser öffnen (Chrome, Edge, Firefox oder Safari 16+).
   Ein Doppelklick auf die Datei genügt, alternativ über einen beliebigen lokalen Webserver.
2. Beim ersten Start braucht der Browser eine Internetverbindung: three.js (r170) wird über das
   CDN von jsDelivr geladen. Danach übernimmt der Browser-Cache.
3. Voraussetzung ist WebGL 2 und eine einigermaßen aktuelle Grafikkarte. Bei niedrigen
   Bildraten in den Einstellungen die Grafikqualität senken; die dynamische Auflösung hält die
   Bildrate zusätzlich stabil.

Der Spielstand (Geld, Tuning, Lackierung, Fahrzeugzustand, freigeschaltete Strecken, Rekorde,
Position in der Welt) wird automatisch im `localStorage` des Browsers gespeichert.

## Spielmodi

- **Free Roam „Vice Coast“** – offene Welt von rund 4 × 4 km mit zusammenhängendem Straßennetz:
  sechsspurige Ring-Autobahn mit Brücke, Downtown-Raster mit Ampelkreuzungen, Hochstraße,
  Tunnel, Kreisverkehre und Landstraßen. Vier Distrikte:
  - *Ocean Beach & Promenade*: Küstenstraße, Sandstrand, türkisfarbenes Meer, Palmen, beleuchtete Art-déco-Hotels
  - *Downtown Skyline*: Hochhäuser mit Fenster-Parallax, Werbetafeln, Unterführungen, enge Gassen
  - *Industrial Docks & Airport*: Container, Lagerhallen, Kräne, Stuntrampen, lange Landebahn für Topspeed-Fahrten
  - *Canyon & Highway-Ring*: Außenring durch Wüste, Tafelberge und Gebirge
  - Dutzende KI-Fahrzeuge (Sportwagen, Limousinen, SUVs, Taxis, Transporter), die ebenfalls Dellen bekommen
  - Blitzer mit Rekord-Prämien, Stuntrampen mit Zeitlupe und Bonus, Straßenrennen-Treffpunkte, Werkstätten
  - Fünf Fahndungsstufen: Streifen, PIT-Manöver, Straßensperren mit Nagelbändern, SWAT-Fahrzeuge und
    ein Hubschrauber mit Suchscheinwerfer. Außer Sicht der Polizei (Sichtkegel auf der Minimap) blinken
    die Sterne – wer lange genug unentdeckt bleibt, kassiert eine Flucht-Prämie. Festgefahren oder
    Totalschaden: **BUSTED**, Geldstrafe und Neustart vor der Polizeiwache.
- **Rennen** – fünf Strecken mit je drei KI-Gegnern, Checkpoints, Rundenzeiten und Preisgeld:
  *Ocean Drive*, *Everglades Highway* (Nebel, Brücken), *Alpine Pass* (Sonnenaufgang, Serpentinen),
  *Canyon Dust* (tiefe Abendsonne) und *Downtown Midnight* (nasse Nachtstadt mit Gegenverkehr).
  Ein Sieg schaltet die nächste Strecke frei; alternativ lässt sie sich kaufen.
- **Werkstatt** – frei drehbare Kamera um den Wagen auf einer beleuchteten Drehscheibe: Reparatur,
  Lackierungen (Metallic, Matt, Perlmutt), Felgen, Heckspoiler und Frontsplitter, Unterboden-Neon,
  Luftfahrwerk sowie Leistungs-Upgrades in fünf Stufen (Motor, Turbo, Reifen & Fahrwerk, Nitro,
  Auspuff) mit Live-Leistungsbalken.

## Steuerung

| Taste | Funktion |
| --- | --- |
| W / ↑ | Gas |
| S / ↓ | Bremse / Rückwärts |
| A / D, ← / → | Lenken |
| Leertaste | Handbremse / Drift |
| Shift | Nitro |
| T | Zeitlupen-Fokus (Energie lädt sich wieder auf, Driften lädt schneller) |
| C | Kamera: Verfolger · Motorhaube · Cockpit |
| B | Blick nach hinten |
| R | Auto aufrichten / zurück auf die Straße |
| E | Werkstatt betreten · Straßenrennen starten |
| H | Hupe |
| Q / F | Manuell herunter- / hochschalten |
| L | Licht an/aus |
| M | Ton an/aus |
| Esc | Pause |

Gamepads (Standard-Layout) werden unterstützt: RT Gas, LT Bremse, linker Stick Lenken,
A Handbremse, X Nitro, Y Kamera, B Fokus, LB Interaktion, Back Zurücksetzen, Start Pause.

## Technik

- **Rendering**: three.js r170, ACES-Filmic-Tonemapping, weiche Schatten (PCFSoftShadowMap),
  physikalischer Himmel (`Sky`) mit Tageszeit, Wolken, Sternen und Mond, exponentieller Höhennebel
  mit Sonnenstreuung, Umgebungsreflexionen über PMREM und eine dynamische CubeCamera für den Lack
  des Spielerwagens. Post-Processing: RenderPass, SSAO (Kontaktschatten), UnrealBloom,
  Geschwindigkeits-Vignette, Zeitlupen- und Schadenseffekte.
- **Wetter & Tageszeit**: goldenes Nachmittagslicht, pink-orange Sonnenuntergänge, Nächte mit
  Straßenlaternen, erleuchteten Fenstern und Neonreklamen; Regen mit Partikeln, nassem, spiegelndem
  Asphalt, Pfützen und weniger Grip; Gewitter mit Blitz und Donner.
- **Texturen**: alle Oberflächen als Canvas-PBR-Sätze (Albedo, Normal, Roughness, AO) in bis zu
  2048 px, erzeugt aus Rauschfunktionen.
- **Fahrzeuge**: Karosserie als Loft-Geometrie mit echten Spaltmaßen (Türen, Haube, Kofferraum),
  tiefen Radhäusern, Felgen mit sichtbaren Bremssätteln und Scheiben, Diffusor, Endrohren und
  modelliertem Innenraum mit Sitzen, Armaturenbrett, leuchtendem Tacho und drehendem Lenkrad.
  Lack als `MeshPhysicalMaterial` mit Klarlack.
- **Fahrphysik**: Starrkörper mit vier unabhängigen Feder-Dämpfer-Einheiten (Eintauchen, Nicken,
  Wanken), kombiniertes Reifenmodell mit Schräglauf und Schlupf, Antriebsstrang mit Turbo,
  Getriebe und Sperrdifferenzial, Aerodynamik, Driften, Burnouts, bleibende Reifenspuren,
  Reifenqualm und glühende Bremsscheiben. Der Lenkeinschlag richtet sich nach der Haftgrenze
  (voller Tastatur-Einschlag nutzt bei jedem Tempo die maximale Seitenführung), ein
  Drift-Stabilisator hält Handbremsen-Drifts kontrollierbar (beides Teil der abschaltbaren Fahrhilfen).
- **Gebäude**: Fassaden-Shader mit Interior Mapping, Fensterrahmen, Sprossen, Fensterbänken,
  Geschossbändern, Eckpilastern, Ladenzonen mit Leuchtblenden und Verwitterung; Glastürme mit
  unterschiedlich spiegelnden Scheiben; dazu instanzierte Attiken, Gesimse, Balkonbänder mit
  Glasbrüstungen, Dachtechnik und Wassertanks.
- **Schaden**: Vertex-Dellen proportional zur Aufprallenergie, Lackkratzer, Spinnennetz-Risse in
  Scheiben, flackernde Scheinwerfer, abfallende Teile (Motorhaube, Stoßfänger, Spoiler, Spiegel),
  Motorrauch unter 40 % Zustand, Totalschaden mit Zeitlupen-Crashkamera und brennendem Motor.
- **Ton**: komplette Synthese mit der Web Audio API – mehrschichtiger V8-Motor nach Drehzahl und
  Last, Ansauggeräusch, Turbo-Abblasventil, Fehlzündungen, Reifenquietschen, Crash-, Glas- und
  Schleifgeräusche, Regen, Fahrtwind, Hupen, Blitzer und Polizeisirenen mit Doppler-Effekt.
- **Leistung**: Chunk-System mit Sichtweite, Frustum Culling und LOD-Stufen, InstancedMesh für
  Palmen, Bäume, Laternen, Leitplanken und Gebäude, zusammengeführte statische Geometrie und
  dynamische Auflösung.

## Aufbau des Codes

`index.html` enthält das Stylesheet, die Bedienoberfläche und ein ES-Modul mit klar getrennten
Abschnitten (siehe Kommentarkopf im Skript): Kern und Speicherstand, Texturen, Materialien und
Shader, Renderer, Atmosphäre, Welt-Grundlagen, Requisiten, Open World, Rennstrecken,
Fahrzeugmodell, Fahrphysik, Schaden und Effekte, Verkehr, Polizei, Rennen, Sound, Kameras, HUD,
Werkstatt sowie die Spiel-Hauptklasse.

Alle Marken-, Orts- und Fahrzeugnamen im Spiel sind frei erfunden.
