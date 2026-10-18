// Geräusche und Musik, alles mit WebAudio erzeugt. Startet erst nach der ersten Eingabe.

let ac = null;
let haupt = null;
let musikBus = null;
let rauschPuffer = null;
let geraeusche = true;
let musikAn = true;
let stimmung = null;
let takt = 0;
let uhr = null;

export function tonStarten() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    haupt = ac.createGain();
    haupt.gain.value = 0.45;
    haupt.connect(ac.destination);
    musikBus = ac.createGain();
    musikBus.gain.value = musikAn ? 0.6 : 0;
    musikBus.connect(haupt);
    rauschPuffer = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = rauschPuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    uhr = setInterval(musikSchritt, 420);
  } catch {
    ac = null;
  }
}

export function einstellen({ ton, musik }) {
  if (ton !== undefined) geraeusche = ton;
  if (musik !== undefined) {
    musikAn = musik;
    if (musikBus) musikBus.gain.value = musik ? 0.6 : 0;
  }
}
export const einstellungen = () => ({ ton: geraeusche, musik: musikAn });

function ton1(freq, dauer, typ = 'square', vol = 0.2, freq2 = null, start = 0, ziel = haupt) {
  const t = ac.currentTime + start;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = typ;
  o.frequency.setValueAtTime(freq, t);
  if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, t + dauer);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  o.connect(g);
  g.connect(ziel);
  o.start(t);
  o.stop(t + dauer + 0.03);
}

function rauschen(dauer, vol = 0.2, freq = 1000, typ = 'lowpass', start = 0) {
  const t = ac.currentTime + start;
  const q = ac.createBufferSource();
  q.buffer = rauschPuffer;
  const f = ac.createBiquadFilter();
  f.type = typ;
  f.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  q.connect(f);
  f.connect(g);
  g.connect(haupt);
  q.start(t, Math.random() * 0.5);
  q.stop(t + dauer + 0.03);
}

const folge = (freqs, abstand, typ = 'square', vol = 0.1, dauer = 0.14) => freqs.forEach((f, i) => ton1(f, dauer, typ, vol, null, i * abstand));

export function ton(name) {
  if (!ac || !geraeusche) return;
  switch (name) {
    case 'hacken': rauschen(0.12, 0.35, 600); ton1(110, 0.1, 'triangle', 0.25, 70); break;
    case 'giessen': rauschen(0.35, 0.16, 2500, 'bandpass'); break;
    case 'wasser': rauschen(0.4, 0.22, 1200, 'bandpass'); ton1(300, 0.2, 'sine', 0.08, 600); break;
    case 'axt': ton1(190, 0.12, 'triangle', 0.35, 90); rauschen(0.08, 0.25, 1800); break;
    case 'stein': ton1(900, 0.06, 'square', 0.1, 500); rauschen(0.1, 0.25, 3000, 'highpass'); break;
    case 'abprall': ton1(1400, 0.08, 'square', 0.1, 1200); break;
    case 'baumfall': rauschen(0.7, 0.32, 380); ton1(80, 0.55, 'triangle', 0.28, 40); break;
    case 'schwung': case 'sense': rauschen(0.12, 0.12, 4000, 'highpass'); break;
    case 'saat': ton1(500, 0.06, 'sine', 0.12, 700); break;
    case 'ernte': case 'pflueck': ton1(660, 0.08, 'triangle', 0.2, 990); ton1(990, 0.1, 'triangle', 0.14, null, 0.06); break;
    case 'pop': ton1(800, 0.07, 'sine', 0.16, 1200); break;
    case 'geld': ton1(1320, 0.08, 'square', 0.08); ton1(1760, 0.16, 'square', 0.08, null, 0.07); break;
    case 'menue': ton1(700, 0.04, 'square', 0.05); break;
    case 'tuer': rauschen(0.15, 0.18, 800); ton1(160, 0.12, 'triangle', 0.14); break;
    case 'truhe': ton1(300, 0.08, 'triangle', 0.15, 200); break;
    case 'biss': ton1(1500, 0.12, 'sine', 0.25); ton1(2000, 0.12, 'sine', 0.2, null, 0.1); break;
    case 'wurf': rauschen(0.25, 0.12, 3000, 'highpass'); break;
    case 'platsch': rauschen(0.22, 0.28, 900); break;
    case 'haken': ton1(400, 0.1, 'square', 0.1, 800); break;
    case 'fang': folge([523, 659, 784, 1046], 0.08); break;
    case 'entkommen': ton1(400, 0.3, 'triangle', 0.15, 150); break;
    case 'stufe': folge([523, 659, 784, 1046, 1318], 0.09, 'square', 0.09, 0.2); break;
    case 'treffer': ton1(220, 0.08, 'square', 0.18, 110); rauschen(0.06, 0.2, 2000); break;
    case 'au': ton1(300, 0.22, 'sawtooth', 0.14, 120); break;
    case 'besiegt': rauschen(0.2, 0.25, 700); ton1(500, 0.15, 'sine', 0.12, 200); break;
    case 'leiter': folge([400, 300, 220], 0.07, 'triangle', 0.14, 0.07); break;
    case 'essen': for (let i = 0; i < 3; i++) rauschen(0.06, 0.2, 1500, 'bandpass', i * 0.12); break;
    case 'gack': ton1(900, 0.06, 'square', 0.07, 1300); ton1(700, 0.08, 'square', 0.07, null, 0.08); break;
    case 'laden': ton1(880, 0.06, 'sine', 0.12); break;
    case 'donner': rauschen(1.6, 0.4, 180); break;
    case 'fanfare': folge([392, 523, 659, 784, 1046], 0.1, 'square', 0.1, 0.25); break;
    case 'glas': ton1(1200, 0.1, 'sine', 0.12); break;
    case 'dumpf': ton1(120, 0.08, 'triangle', 0.14); break;
    case 'schlafen': folge([523, 392, 330, 262], 0.18, 'sine', 0.12, 0.4); break;
    default: break;
  }
}

// ─── Musik ──────────────────────────────────────────────────────────────────
// Leise, sich selbst schreibende Melodie in einer Tonleiter je Stimmung.

const LEITERN = {
  fruehling: [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3],
  sommer: [293.7, 329.6, 370.0, 440.0, 493.9, 587.3, 659.3],
  herbst: [220.0, 261.6, 293.7, 329.6, 392.0, 440.0, 523.3],
  winter: [246.9, 293.7, 329.6, 370.0, 440.0, 493.9, 587.3],
  nacht: [196.0, 233.1, 261.6, 293.7, 349.2, 392.0],
  mine: [146.8, 174.6, 196.0, 220.0, 261.6, 293.7],
  innen: [261.6, 329.6, 392.0, 440.0, 523.3],
};
let letzteNote = 3;

export function musikStimmung(name) { stimmung = name; }

function musikSchritt() {
  if (!ac || !musikAn || !stimmung || ac.state !== 'running') return;
  const leiter = LEITERN[stimmung] || LEITERN.fruehling;
  takt++;
  const langsam = stimmung === 'nacht' || stimmung === 'mine';
  if (takt % 8 === 0) ton1(leiter[0] / 2, 2.2, 'sine', 0.07, null, 0, musikBus);
  if (takt % 8 === 4) ton1(leiter[Math.min(4, leiter.length - 1)] / 2, 2.0, 'sine', 0.05, null, 0, musikBus);
  if (Math.random() < (langsam ? 0.35 : 0.55)) {
    letzteNote = Math.max(0, Math.min(leiter.length - 1, letzteNote + Math.floor(Math.random() * 5) - 2));
    ton1(leiter[letzteNote], langsam ? 1.4 : 0.9, 'triangle', 0.045, null, 0, musikBus);
  }
}

export function tonStoppen() {
  if (uhr) clearInterval(uhr);
}
