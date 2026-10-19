// Sammeldatei: lädt die Inhalte aller Bereiche in fester Reihenfolge, danach die Fertig-Phase.
// DOM-frei, wird auch in Node geladen (Tests). Neue Bereiche hier nicht eintragen – jeder
// Bereich hat schon seinen Ordner; die Reihenfolge bestimmt auch die Reihenfolge der Hooks.

import './basis/inhalt.js';
import './hof/inhalt.js';
import './dorf/inhalt.js';
import './wildnis/inhalt.js';
import './pflanzen/inhalt.js';
import './angeln/inhalt.js';
import './mine/inhalt.js';
import './handwerk/inhalt.js';
import './tiere/inhalt.js';
import './npcs/inhalt.js';
import './npcs2/inhalt.js';
import './feste/inhalt.js';
import './gemeinschaft/inhalt.js';
import { fertig } from '../daten.js';

fertig();
