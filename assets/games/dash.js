/**
 * Dash – ein Hüpfspiel nach Art von Geometry Dash.
 *
 * Der Würfel läuft von allein nach rechts; gesteuert wird nur gesprungen.
 * Jeder Stachel und jede Blockkante ist tödlich, die Strecke ist auswendig
 * lernbar – genau das macht kurze Wiederholungen reizvoll.
 *
 * Simulation und Darstellung sind getrennt: `neuerLauf` und `schritt` sind
 * reine Zustandsfunktionen mit festem Zeitschritt, `createGame` zeichnet nur.
 * Dadurch lassen sich die Strecken automatisch auf Lösbarkeit prüfen.
 */

/** Physik in Feldern (1 Feld = 1 Würfelbreite) und Sekunden. */
export const PHYSIK = {
  TEMPO: 10.4, // Felder pro Sekunde
  SCHWERKRAFT: 56,
  ABSPRUNG: 15.4, // ergibt 2,12 Felder Höhe und 5,7 Felder Weite
  DT: 1 / 120,
  BOX: 0.86, // Kantenlänge der Trefferbox des Würfels
  DREHUNG: Math.PI / 0.52, // Bogenmaß pro Sekunde in der Luft
};

/* ------------------------------------------------------------- Strecken -- */

// Die unterste Zeile liegt auf dem Boden, '^' ist ein Stachel, '#' ein Block.

const EBENE_1 = [
  '                ^           ^           ^           ^^        ' +
    '    ^         ^           ^^          ###         ^           ' +
    '^^          ^         ^           ^^        ##        ^       ' +
    '    ^         ^^          ^         ^           ^             ',
];

const EBENE_2 = [
  '              ^         ^^          ^           ^^^           ' +
    '^      ^      ^             ^^           ###        ^         ' +
    '  ^      ^            ^^^           ^           ^^          ##' +
    '#        ^          ^      ^            ^^^           ^       ' +
    '    ^^            ^      ^            ^^            ^       ',
];

const EBENE_3 = [
  '                                                              ' +
    '                                                              ' +
    '                ^                                             ' +
    '                                                              ' +
    '                                                              ' +
    '                          ',
  '              ^      ^      ^           ^^^             ^     ' +
    ' ^      ^      ^              ^^          ###         ^       ' +
    '    ^^          #           ^      ^            ^^^           ' +
    '###       ^           ^      ^      ^      ^            ^^    ' +
    '                  ^      ^            ^^^             ^      ^' +
    '      ^      ^            ',
];

/**
 * Wandelt die Zeichenzeilen in Listen von Hindernissen um. Zusätzlich werden
 * Übungspunkte gesucht: Spalten, um die herum nichts steht, damit der Würfel
 * dort gefahrlos neu starten kann.
 */
export function ladeStrecke(zeilen) {
  const breite = Math.max(...zeilen.map((z) => z.length));
  const hoehe = zeilen.length;
  const stacheln = [];
  const bloecke = [];
  const spalten = Array.from({ length: breite }, () => []);

  zeilen.forEach((zeile, index) => {
    const y = hoehe - 1 - index;
    for (let x = 0; x < zeile.length; x++) {
      const zeichen = zeile[x];
      if (zeichen !== '^' && zeichen !== '#') continue;
      const teil = { x, y, art: zeichen === '^' ? 'stachel' : 'block' };
      (zeichen === '^' ? stacheln : bloecke).push(teil);
      spalten[x].push(teil);
    }
  });

  const frei = (von, bis) => {
    for (let x = Math.max(0, von); x <= Math.min(breite - 1, bis); x++) {
      if (spalten[x].length) return false;
    }
    return true;
  };

  const punkte = [0];
  for (let x = 20; x < breite - 12; x++) {
    if (x - punkte[punkte.length - 1] < 26) continue;
    if (frei(x - 2, x + 5)) punkte.push(x);
  }

  return { breite, hoehe, stacheln, bloecke, spalten, punkte };
}

export const STRECKEN = [
  { id: 'aufwaermen', name: 'Aufwärmen', zeilen: EBENE_1 },
  { id: 'stolperfalle', name: 'Stolperfalle', zeilen: EBENE_2 },
  { id: 'dauerlauf', name: 'Dauerlauf', zeilen: EBENE_3 },
].map((s) => ({ ...s, strecke: ladeStrecke(s.zeilen) }));

/* ----------------------------------------------------------- Simulation -- */

export function neuerLauf(startX = 0) {
  return { x: startX, y: 0, vy: 0, boden: true, winkel: 0, ende: null };
}

/**
 * Rechnet genau einen festen Zeitschritt weiter. `halten` ist true, solange
 * die Sprungtaste gedrückt ist – wie im Vorbild springt der Würfel dann
 * automatisch weiter, sobald er wieder Boden berührt.
 *
 * Gibt 'tot', 'ziel' oder null zurück.
 */
export function schritt(lauf, strecke, halten) {
  if (lauf.ende) return lauf.ende;
  const P = PHYSIK;

  if (lauf.boden && halten) {
    lauf.vy = P.ABSPRUNG;
    lauf.boden = false;
  }

  lauf.x += P.TEMPO * P.DT;

  const vorherUnten = lauf.y;
  if (!lauf.boden) {
    lauf.vy -= P.SCHWERKRAFT * P.DT;
    lauf.y += lauf.vy * P.DT;
    lauf.winkel += P.DREHUNG * P.DT;
  }

  const rand = (1 - P.BOX) / 2;
  const links = lauf.x + rand;
  const rechts = lauf.x + 1 - rand;
  const unten = lauf.y;
  const oben = lauf.y + P.BOX;

  let stand = 0; // der Boden trägt immer
  const vonSpalte = Math.max(0, Math.floor(links) - 1);
  const bisSpalte = Math.min(strecke.breite - 1, Math.ceil(rechts));

  for (let sx = vonSpalte; sx <= bisSpalte; sx++) {
    for (const teil of strecke.spalten[sx]) {
      if (teil.art === 'stachel') {
        // Großzügige Trefferbox: nur die Spitzenmitte ist tödlich.
        if (
          rechts > teil.x + 0.3 &&
          links < teil.x + 0.7 &&
          oben > teil.y + 0.02 &&
          unten < teil.y + 0.62
        ) {
          lauf.ende = 'tot';
          return 'tot';
        }
        continue;
      }

      const dach = teil.y + 1;
      if (!(rechts > teil.x && links < teil.x + 1)) continue;
      if (vorherUnten >= dach - 1e-4 && lauf.vy <= 0) {
        // Der Würfel kam von oben oder steht schon auf dem Block.
        if (dach > stand) stand = dach;
        continue;
      }
      if (unten < dach && oben > teil.y) {
        lauf.ende = 'tot';
        return 'tot';
      }
    }
  }

  if (lauf.y <= stand) {
    lauf.y = stand;
    lauf.vy = 0;
    if (!lauf.boden) {
      lauf.boden = true;
      const viertel = Math.PI / 2;
      lauf.winkel = Math.round(lauf.winkel / viertel) * viertel;
    }
  } else {
    lauf.boden = false;
  }

  if (lauf.x >= strecke.breite) {
    lauf.ende = 'ziel';
    return 'ziel';
  }
  return null;
}

/* ----------------------------------------------------------------- Spiel -- */

const SICHT = 14; // sichtbare Felder in der Breite
const SEITEN = 2.5; // Breite zu Höhe – flach, weil kaum Höhe gebraucht wird
const BODEN_ANTEIL = 0.78; // Lage der Bodenlinie im Bild

export function createGame(ctx) {
  ctx.root.innerHTML = `
    <div class="toolbar">
      <div class="seg" id="strecken">
        ${STRECKEN.map(
          (s) => `<button type="button" data-strecke="${s.id}">${s.name}</button>`,
        ).join('')}
      </div>
      <button class="btn primary" data-act="neu">Neuer Versuch</button>
      <button class="btn" data-act="uebung" aria-pressed="false">Übungsmodus</button>
    </div>
    <div class="stats">
      <div class="stat"><div class="k">Versuch</div><div class="v" data-out="versuche">1</div></div>
      <div class="stat"><div class="k">Weiteste</div><div class="v" data-out="best">0 %</div></div>
      <div class="stat"><div class="k">Geschafft</div><div class="v" data-out="ziel">–</div></div>
    </div>
    <div class="dash-wrap">
      <div class="dash-bar"><i id="fortschritt"></i><span data-out="prozent">0 %</span></div>
      <canvas class="dash-canvas" id="cv" width="1000" height="500"></canvas>
      <div class="play-overlay" id="overlay" hidden></div>
    </div>
    <div class="keyhint">
      <kbd>Leertaste</kbd>, <kbd>↑</kbd> oder Klick springt – gedrückt halten springt weiter.
      Die Strecke ist immer dieselbe, sie lässt sich also auswendig lernen.
      Der Übungsmodus setzt nach einem Sturz am letzten Zwischenpunkt fort und zählt nicht in die Bestmarke.
    </div>`;

  const canvas = ctx.root.querySelector('#cv');
  const overlay = ctx.root.querySelector('#overlay');
  const balken = ctx.root.querySelector('#fortschritt');
  const uebungBtn = ctx.root.querySelector('[data-act="uebung"]');
  const g = canvas.getContext('2d');
  const out = {
    versuche: ctx.root.querySelector('[data-out="versuche"]'),
    best: ctx.root.querySelector('[data-out="best"]'),
    ziel: ctx.root.querySelector('[data-out="ziel"]'),
    prozent: ctx.root.querySelector('[data-out="prozent"]'),
  };

  let gewaehlt = ctx.store.get('dash:strecke', STRECKEN[0].id);
  if (!STRECKEN.some((s) => s.id === gewaehlt)) gewaehlt = STRECKEN[0].id;

  let level, lauf, phase, versuche, halten, uebung, punkt, rest, raf, zuletzt;
  // Ein sehr kurzer Tipp kann komplett zwischen zwei Bildern liegen. Deshalb
  // wird jeder Tastendruck gepuffert, bis ihn mindestens ein Rechenschritt
  // gesehen hat – sonst schluckt das Spiel gelegentlich einen Sprung.
  let angefordert = false;
  let splitter = [];
  let farben = leseFarben();

  function leseFarben() {
    const s = getComputedStyle(document.documentElement);
    const hol = (name, ersatz) => (s.getPropertyValue(name) || '').trim() || ersatz;
    return {
      akzent: hol('--accent', '#2f62e8'),
      schlecht: hol('--bad', '#d24a43'),
      text: hol('--text', '#141821'),
      rand: hol('--border', '#dfe4ec'),
      flaeche: hol('--surface', '#ffffff'),
      grund: hol('--surface-2', '#eef1f6'),
      tief: hol('--surface-3', '#e4e9f1'),
      stumm: hol('--muted', '#5c6676'),
    };
  }

  ctx.on(window, 'themechange', () => {
    farben = leseFarben();
    zeichne();
  });

  /* ----------------------------------------------------------- Auflösung -- */

  function passeAn() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(Math.max(280, canvas.clientWidth) * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = Math.round(px / SEITEN);
    }
    zeichne();
  }
  const beobachter = new ResizeObserver(passeAn);
  beobachter.observe(canvas);
  ctx.onDestroy(() => beobachter.disconnect());

  /* ------------------------------------------------------------ Zeichnen -- */

  function zeichne() {
    const B = canvas.width;
    const H = canvas.height;
    const skala = B / SICHT;
    const bodenY = H * BODEN_ANTEIL;
    const kamera = (lauf ? lauf.x : 0) - SICHT * 0.3;
    const bx = (wx) => (wx - kamera) * skala;
    const by = (wy) => bodenY - wy * skala;

    g.fillStyle = farben.grund;
    g.fillRect(0, 0, B, H);

    // Ruhige Linien im Hintergrund, die den Vorlauf spürbar machen.
    g.strokeStyle = farben.rand;
    g.lineWidth = Math.max(1, B / 900);
    g.globalAlpha = 0.8;
    g.beginPath();
    for (let x = Math.floor(kamera) - 1; x < kamera + SICHT + 1; x += 2) {
      g.moveTo(bx(x), 0);
      g.lineTo(bx(x), bodenY);
    }
    for (let y = 1; y * skala < bodenY; y++) {
      g.moveTo(0, by(y));
      g.lineTo(B, by(y));
    }
    g.stroke();
    g.globalAlpha = 1;

    // Boden.
    g.fillStyle = farben.tief;
    g.fillRect(0, bodenY, B, H - bodenY);
    g.strokeStyle = farben.akzent;
    g.lineWidth = Math.max(2, B / 340);
    g.beginPath();
    g.moveTo(0, bodenY);
    g.lineTo(B, bodenY);
    g.stroke();

    // Hindernisse, nur die sichtbaren Spalten.
    const von = Math.max(0, Math.floor(kamera) - 1);
    const bis = Math.min(level.strecke.breite - 1, Math.ceil(kamera + SICHT) + 1);
    for (let sx = von; sx <= bis; sx++) {
      for (const teil of level.strecke.spalten[sx]) {
        if (teil.art === 'stachel') {
          g.fillStyle = farben.schlecht;
          g.beginPath();
          g.moveTo(bx(teil.x), by(teil.y));
          g.lineTo(bx(teil.x + 0.5), by(teil.y + 1));
          g.lineTo(bx(teil.x + 1), by(teil.y));
          g.closePath();
          g.fill();
        } else {
          const x = bx(teil.x);
          const y = by(teil.y + 1);
          g.fillStyle = farben.text;
          g.fillRect(x, y, skala, skala);
          g.fillStyle = farben.akzent;
          g.fillRect(x, y, skala, Math.max(2, skala * 0.11));
        }
      }
    }

    // Ziellinie.
    if (kamera + SICHT > level.strecke.breite - 1) {
      const zx = bx(level.strecke.breite);
      g.strokeStyle = farben.akzent;
      g.lineWidth = Math.max(2, B / 300);
      g.setLineDash([skala * 0.25, skala * 0.25]);
      g.beginPath();
      g.moveTo(zx, 0);
      g.lineTo(zx, bodenY);
      g.stroke();
      g.setLineDash([]);
    }

    // Würfel.
    if (lauf && !lauf.ende) {
      const mx = bx(lauf.x + 0.5);
      const my = by(lauf.y + 0.5);
      const k = skala * 0.5;
      g.save();
      g.translate(mx, my);
      g.rotate(lauf.winkel);
      g.fillStyle = farben.akzent;
      g.beginPath();
      g.roundRect(-k, -k, k * 2, k * 2, skala * 0.16);
      g.fill();
      g.fillStyle = farben.flaeche;
      g.beginPath();
      g.roundRect(-k * 0.42, -k * 0.42, k * 0.84, k * 0.84, skala * 0.08);
      g.fill();
      g.restore();
    }

    // Splitter nach einem Sturz.
    for (const s of splitter) {
      g.globalAlpha = Math.max(0, s.leben);
      g.fillStyle = farben.akzent;
      const k = skala * 0.16;
      g.fillRect(bx(s.x) - k / 2, by(s.y) - k / 2, k, k);
    }
    g.globalAlpha = 1;
  }

  /* ---------------------------------------------------------- Spielablauf -- */

  function prozent(x) {
    return Math.max(0, Math.min(100, Math.round((x / level.strecke.breite) * 100)));
  }

  function zeigeFortschritt() {
    const p = lauf ? prozent(lauf.x) : 0;
    balken.style.width = p + '%';
    out.prozent.textContent = p + ' %';
  }

  function zeigeStatus() {
    out.versuche.textContent = versuche;
    out.best.textContent = (ctx.store.best('dash', gewaehlt) || 0) + ' %';
    const geschafft = ctx.store.get('dash:geschafft', []);
    out.ziel.textContent = geschafft.includes(gewaehlt) ? '✓' : '–';
  }

  function schleife(jetzt) {
    raf = requestAnimationFrame(schleife);
    if (zuletzt == null) zuletzt = jetzt;
    let delta = (jetzt - zuletzt) / 1000;
    zuletzt = jetzt;
    if (delta > 0.25) delta = 0.25; // nach einem Tab-Wechsel nichts nachholen

    for (const s of splitter) {
      s.x += s.vx * delta;
      s.y += s.vy * delta;
      s.vy -= 26 * delta;
      s.leben -= delta * 1.6;
    }
    if (splitter.length) splitter = splitter.filter((s) => s.leben > 0);

    if (phase === 'laeuft') {
      rest += delta;
      const springen = halten || angefordert;
      while (rest >= PHYSIK.DT && phase === 'laeuft') {
        rest -= PHYSIK.DT;
        const ereignis = schritt(lauf, level.strecke, springen);
        if (ereignis === 'tot') sturz();
        else if (ereignis === 'ziel') geschafft();
      }
      if (uebung) merkeZwischenpunkt();
      angefordert = false;
      zeigeFortschritt();
    }
    zeichne();
  }

  /** Im Übungsmodus den zuletzt sicher passierten Zwischenpunkt merken. */
  function merkeZwischenpunkt() {
    const punkte = level.strecke.punkte;
    for (let i = punkte.length - 1; i >= 0; i--) {
      if (punkte[i] <= lauf.x - 1) {
        punkt = punkte[i];
        return;
      }
    }
  }

  function sturz() {
    phase = 'tot';
    splitter = Array.from({ length: 16 }, () => ({
      x: lauf.x + 0.5,
      y: lauf.y + 0.5,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * 12 + 2,
      leben: 1,
    }));

    const p = prozent(lauf.x);
    if (!uebung) {
      ctx.store.score('dash', gewaehlt, p);
      zeigeStatus();
    }
    zeigeOverlay(
      uebung ? 'Nochmal ab dem Zwischenpunkt' : `Gescheitert bei ${p} %`,
      uebung
        ? 'Im Übungsmodus geht es am letzten Zwischenpunkt weiter.'
        : 'Leertaste oder Klick startet sofort neu.',
      'Weiter',
      neuerVersuch,
    );
  }

  function geschafft() {
    phase = 'ziel';
    if (!uebung) {
      ctx.store.score('dash', gewaehlt, 100, { won: true });
      const liste = ctx.store.get('dash:geschafft', []);
      if (!liste.includes(gewaehlt)) ctx.store.set('dash:geschafft', [...liste, gewaehlt]);
    }
    zeigeStatus();
    zeigeFortschritt();
    zeigeOverlay(
      uebung ? 'Strecke im Übungsmodus durch' : 'Strecke geschafft!',
      uebung
        ? 'Jetzt ohne Zwischenpunkte – dafür zählt sie.'
        : `${versuche} ${versuche === 1 ? 'Versuch' : 'Versuche'} gebraucht.`,
      'Nochmal',
      () => {
        versuche = 0;
        punkt = 0;
        neuerVersuch();
      },
    );
  }

  function neuerVersuch() {
    versuche += 1;
    lauf = neuerLauf(uebung ? punkt : 0);
    if (!uebung) punkt = 0;
    rest = 0;
    splitter = [];
    phase = 'laeuft';
    versteckeOverlay();
    zeigeStatus();
    zeigeFortschritt();
  }

  function zuruecksetzen() {
    level = STRECKEN.find((s) => s.id === gewaehlt);
    versuche = 0;
    punkt = 0;
    halten = false;
    angefordert = false;
    rest = 0;
    splitter = [];
    lauf = neuerLauf(0);
    phase = 'bereit';
    ctx.store.play('dash');
    zeigeStatus();
    zeigeFortschritt();
    zeigeOverlay(
      level.name,
      'Springen mit Leertaste oder Klick. Gedrückt halten springt weiter.',
      'Los',
      neuerVersuch,
    );
  }

  /* -------------------------------------------------------------- Overlay -- */

  function zeigeOverlay(titel, text, knopf, aktion) {
    overlay.hidden = false;
    overlay.innerHTML = `<div class="big">${titel}</div><div class="sub">${text}</div>`;
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.textContent = knopf;
    btn.addEventListener('click', aktion);
    overlay.appendChild(btn);
    btn.focus({ preventScroll: true });
  }

  function versteckeOverlay() {
    overlay.hidden = true;
    overlay.innerHTML = '';
  }

  /* ------------------------------------------------------------ Steuerung -- */

  const SPRUNGTASTEN = new Set([' ', 'Spacebar', 'ArrowUp', 'w', 'W']);

  function druecken() {
    if (phase === 'pause') return;
    if (phase === 'ziel') {
      versuche = 0;
      punkt = 0;
    }
    // Wer die Taste über den Sturz hinweg gedrückt hält, springt im neuen
    // Versuch sofort weiter – sonst ginge der Halt beim Neustart verloren.
    if (phase !== 'laeuft') neuerVersuch();
    halten = true;
    angefordert = true;
  }

  ctx.on(window, 'keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!SPRUNGTASTEN.has(e.key)) return;
    e.preventDefault();
    if (e.repeat) return;
    druecken();
  });

  ctx.on(window, 'keyup', (e) => {
    if (SPRUNGTASTEN.has(e.key)) halten = false;
  });

  ctx.on(canvas, 'pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture?.(e.pointerId);
    druecken();
  });
  ctx.on(canvas, 'pointerup', () => {
    halten = false;
  });
  ctx.on(canvas, 'pointercancel', () => {
    halten = false;
  });

  ctx.on(document, 'visibilitychange', () => {
    if (!document.hidden) return;
    halten = false;
    if (phase !== 'laeuft') return;
    phase = 'pause';
    zeigeOverlay('Pause', 'Der Lauf wartet auf dich.', 'Weiter', () => {
      phase = 'laeuft';
      rest = 0;
      versteckeOverlay();
    });
  });

  ctx.on(ctx.root.querySelector('#strecken'), 'click', (e) => {
    const btn = e.target.closest('[data-strecke]');
    if (!btn) return;
    gewaehlt = btn.dataset.strecke;
    ctx.store.set('dash:strecke', gewaehlt);
    for (const b of ctx.root.querySelectorAll('[data-strecke]')) {
      b.setAttribute('aria-pressed', String(b === btn));
    }
    zuruecksetzen();
  });

  ctx.on(ctx.root.querySelector('[data-act="neu"]'), 'click', () => {
    punkt = 0;
    neuerVersuch();
  });

  ctx.on(uebungBtn, 'click', () => {
    uebung = !uebung;
    uebungBtn.setAttribute('aria-pressed', String(uebung));
    uebungBtn.classList.toggle('on', uebung);
    punkt = 0;
    zuruecksetzen();
  });

  for (const b of ctx.root.querySelectorAll('[data-strecke]')) {
    b.setAttribute('aria-pressed', String(b.dataset.strecke === gewaehlt));
  }

  uebung = false;
  raf = requestAnimationFrame(schleife);
  ctx.onDestroy(() => cancelAnimationFrame(raf));

  zuruecksetzen();
}
