/**
 * Winziger localStorage-Wrapper. Alles ist optional: wenn der Browser den
 * Speicher blockiert (privates Fenster, strenge Einstellungen), laeuft der Hub
 * einfach ohne Bestenliste weiter, statt zu crashen.
 */

const PREFIX = 'pausenspiele:';
const memory = new Map();
let usable = true;

try {
  const probe = PREFIX + '__probe';
  localStorage.setItem(probe, '1');
  localStorage.removeItem(probe);
} catch {
  usable = false;
}

function readRaw(key) {
  if (!usable) return memory.has(key) ? memory.get(key) : null;
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function writeRaw(key, value) {
  if (!usable) {
    memory.set(key, value);
    return;
  }
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {
    /* Speicher voll oder gesperrt – nicht schlimm. */
  }
}

export const store = {
  get(key, fallback = null) {
    const raw = readRaw(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    writeRaw(key, JSON.stringify(value));
    return value;
  },

  /** Liest die Statistik eines Spiels (pro Modus getrennte Bestwerte). */
  stats(gameId) {
    const s = store.get('stats:' + gameId, {});
    return { plays: 0, wins: 0, best: {}, last: 0, ...s };
  },

  /** Zaehlt eine gestartete Partie. */
  play(gameId) {
    const s = store.stats(gameId);
    s.plays += 1;
    s.last = Date.now();
    return store.set('stats:' + gameId, s);
  },

  /**
   * Traegt ein Ergebnis ein. `lowerIsBetter` fuer Zeiten, sonst hoehere Zahl gewinnt.
   * Gibt true zurueck, wenn es ein neuer Bestwert war.
   */
  score(gameId, mode, value, { lowerIsBetter = false, won = false } = {}) {
    const s = store.stats(gameId);
    if (won) s.wins += 1;
    s.last = Date.now();
    const old = s.best[mode];
    const isBetter = old == null || (lowerIsBetter ? value < old : value > old);
    if (isBetter) s.best[mode] = value;
    store.set('stats:' + gameId, s);
    return isBetter;
  },

  best(gameId, mode) {
    const b = store.stats(gameId).best;
    return mode == null ? b : b[mode];
  },
};

/** 83 -> "1:23" */
export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return m + ':' + String(s % 60).padStart(2, '0');
}
