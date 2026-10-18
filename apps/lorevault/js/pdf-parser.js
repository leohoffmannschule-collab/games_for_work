/* ============================================================
   LoreVault – pdf-parser.js
   Lädt ein PDF via PDF.js, extrahiert Text + Schriftgröße
   und teilt es in Kapitel auf.
   ============================================================ */

// PDF.js Worker – lazy initialisiert beim ersten Aufruf
function initPdfJs() {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error(
      'PDF.js nicht geladen – bitte zuerst <strong>download-deps.bat</strong> ausfuehren, ' +
      'damit <code>vendor/pdfjs/pdf.min.js</code> vorhanden ist.'
    );
  }
  // Worker-Pfad setzen – relativ zur aktuellen Seite
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
}

/**
 * Lädt ein PDF aus dem books/-Ordner und gibt alle Seiten
 * als Array von { pageNum, items: [{str, fontSize, bold, x, y}] } zurück.
 */
async function loadPdfPages(filename) {
  initPdfJs();
  const url = 'books/' + filename;
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent({ includeMarkedContent: false });

    const items = content.items
      .filter(i => i.str && i.str.trim() !== '')
      .map(i => {
        const tf = i.transform;
        const fontSize = Math.abs(tf[0]) || Math.abs(tf[3]) || 12;
        const bold = (i.fontName || '').toLowerCase().includes('bold');
        return {
          str: i.str,
          fontSize: Math.round(fontSize * 10) / 10,
          bold,
          x: Math.round(tf[4]),
          y: Math.round(tf[5])
        };
      });

    pages.push({ pageNum: p, items });
  }

  return { pdf, pages, numPages: pdf.numPages };
}

/**
 * Erkennt Kapitel-Überschriften anhand von drei Modi:
 *   'auto'         – Schriftgröße + Fettschrift + Standard-Keywords + kurze Zeile (Score-System)
 *   'custom'       – wie auto, aber mit eigenen Keywords statt Standard-Liste
 *   'keyword-only' – sucht AUSSCHLIESSLICH nach Zeilen die mit den eigenen Keywords beginnen,
 *                    ignoriert Schriftgröße und Formatierung komplett
 */
function detectChapters(pages, customKeywords, mode) {
  mode = mode || 'auto';

  /* ── MODUS: keyword-only ── */
  if (mode === 'keyword-only') {
    const keywords = (customKeywords || []).map(k => k.trim().toLowerCase()).filter(Boolean);
    if (keywords.length === 0) return [];

    const chapters = [];
    const seen = new Set();

    for (const page of pages) {
      // Zeilen rekonstruieren
      const lines = [];
      for (const item of page.items) {
        const existing = lines.find(l => Math.abs(l.y - item.y) < 4);
        if (existing) {
          existing.text += ' ' + item.str;
        } else {
          lines.push({ y: item.y, text: item.str });
        }
      }

      for (const line of lines) {
        const text = line.text.trim();
        if (!text || text.length > 200) continue;
        const lower = text.toLowerCase();

        const matched = keywords.some(kw => lower.startsWith(kw));
        if (matched && !seen.has(lower)) {
          seen.add(lower);
          chapters.push({ title: text, startPage: page.pageNum });
        }
      }
    }

    // Fallback wenn nichts gefunden
    if (chapters.length === 0) {
      const step = Math.min(10, Math.max(1, Math.floor(pages.length / 10)));
      for (let p = 1; p <= pages.length; p += step) {
        chapters.push({ title: 'Abschnitt ' + Math.ceil(p / step), startPage: p });
      }
    }
    return chapters;
  }

  /* ── MODUS: auto / custom (Score-System) ── */
  const defaultKeywords = ['kapitel', 'chapter', 'teil', 'part', 'abschnitt',
                           'section', 'buch', 'book', 'epilog', 'epilogue',
                           'prolog', 'prologue', 'einleitung', 'introduction',
                           'nachwort', 'anhang', 'appendix'];

  const keywords = customKeywords && customKeywords.length
    ? customKeywords.map(k => k.trim().toLowerCase()).filter(Boolean)
    : defaultKeywords;

  const allSizes = [];
  for (const page of pages) {
    for (const item of page.items) {
      if (item.fontSize > 0) allSizes.push(item.fontSize);
    }
  }
  allSizes.sort((a, b) => a - b);
  const medianSize = allSizes[Math.floor(allSizes.length / 2)] || 12;
  const headingThreshold = medianSize * 1.25;

  const chapters = [];
  const seen = new Set();

  for (const page of pages) {
    const lines = [];
    for (const item of page.items) {
      const existing = lines.find(l => Math.abs(l.y - item.y) < 4);
      if (existing) {
        existing.text += ' ' + item.str;
        existing.maxSize = Math.max(existing.maxSize, item.fontSize);
        existing.bold = existing.bold || item.bold;
      } else {
        lines.push({ y: item.y, text: item.str, maxSize: item.fontSize, bold: item.bold });
      }
    }

    for (const line of lines) {
      const text = line.text.trim();
      if (!text || text.length > 120) continue;

      const lower = text.toLowerCase();
      const isKeyword  = keywords.some(kw => lower.startsWith(kw));
      const isLargeFont = line.maxSize >= headingThreshold;
      const isBold      = line.bold;
      const isShortLine = text.length < 80;

      const score =
        (isKeyword   ? 3 : 0) +
        (isLargeFont ? 2 : 0) +
        (isBold      ? 1 : 0) +
        (isShortLine ? 1 : 0);

      if (score >= 3 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        chapters.push({ title: text, startPage: page.pageNum });
      }
    }
  }

  // Fallback: je 10 Seiten ein Kapitel
  if (chapters.length === 0) {
    const total = pages.length;
    const step = Math.min(10, Math.max(1, Math.floor(total / 10)));
    for (let p = 1; p <= total; p += step) {
      chapters.push({ title: 'Abschnitt ' + Math.ceil(p / step), startPage: p });
    }
  }

  return chapters;
}

/**
 * Gibt den Volltext einer Seite als String zurück.
 */
function pageToText(page) {
  const lines = [];
  for (const item of page.items) {
    const existing = lines.find(l => Math.abs(l.y - item.y) < 4);
    if (existing) { existing.text += ' ' + item.str; }
    else { lines.push({ y: item.y, text: item.str }); }
  }
  lines.sort((a, b) => b.y - a.y);
  return lines.map(l => l.text.trim()).filter(Boolean).join('\n');
}

/**
 * Gibt den Volltext aller Seiten eines Kapitels zurück.
 */
function getChapterText(pages, chapterIndex, chapters) {
  const start = chapters[chapterIndex].startPage;
  const end   = chapterIndex + 1 < chapters.length
    ? chapters[chapterIndex + 1].startPage - 1
    : pages[pages.length - 1].pageNum;

  const chapterPages = pages.filter(p => p.pageNum >= start && p.pageNum <= end);
  return chapterPages.map(p => pageToText(p)).join('\n\n');
}

window.PdfParser = { loadPdfPages, detectChapters, getChapterText, pageToText };