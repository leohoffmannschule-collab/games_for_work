// Bereich „tiere" – Oberfläche: das Bild von Küken und Hühnerstall im Laden.

import { tierBild } from '../../sprites.js';
import { wareBild, leinwandBild } from '../../ui.js';

wareBild('kueken', () => leinwandBild(tierBild('huhn', 0, true)));
wareBild('stall', () => leinwandBild(tierBild('huhn', 0, true)));
