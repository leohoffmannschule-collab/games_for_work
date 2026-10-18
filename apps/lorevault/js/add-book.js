/* ============================================================
   LoreVault – add-book.js
   PDF analysieren, Kapitelvorschau, Buch speichern
   ============================================================ */

const STORAGE_KEY = 'lorevault_books';

function getBooks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function saveBooks(b) { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ── Cover-Tabs ── */
let activeCoverTab = 'file';
document.querySelectorAll('.cover-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cover-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.cover-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    activeCoverTab = btn.dataset.tab;
    document.getElementById('coverTab-' + activeCoverTab).classList.add('active');
    updateCoverPreview();
  });
});

function updateCoverPreview() {
  const preview = document.getElementById('coverPreview');
  if (activeCoverTab === 'file') {
    const file = document.getElementById('coverFile').files[0];
    if (file) {
      const r = new FileReader();
      r.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; };
      r.readAsDataURL(file);
    } else { preview.style.display = 'none'; }
  } else if (activeCoverTab === 'url') {
    const url = document.getElementById('coverUrl').value.trim();
    if (url) { preview.src = url; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }
  } else {
    preview.style.display = 'none';
  }
}
document.getElementById('coverFile').addEventListener('change', updateCoverPreview);
document.getElementById('coverUrl').addEventListener('input', updateCoverPreview);

/* ── Kapitel-Modus ── */
function getChapterMode() {
  const checked = document.querySelector('input[name="chapterMode"]:checked');
  return checked ? checked.value : 'auto';
}

function updateKeywordFieldVisibility() {
  const mode = getChapterMode();
  const wrap  = document.getElementById('customHeadingsWrap');
  const input = document.getElementById('headingKeywords');
  const needsKeywords = (mode === 'custom' || mode === 'keyword-only');
  wrap.style.display = needsKeywords ? 'block' : 'none';
  if (mode === 'keyword-only') {
    input.placeholder = 'z.B. Kapitel, Chapter, Teil  ← Pflichtfeld';
    input.style.borderColor = 'var(--accent-dim)';
  } else {
    input.placeholder = 'Kapitel, Chapter, Teil, Part, Abschnitt';
    input.style.borderColor = '';
  }
}

// Beim Laden sofort den richtigen Zustand setzen
document.addEventListener('DOMContentLoaded', updateKeywordFieldVisibility);

// Bei jedem Klick auf einen Radio-Button
document.querySelectorAll('input[name="chapterMode"]').forEach(radio => {
  radio.addEventListener('change', updateKeywordFieldVisibility);
});

/* ── State ── */
let detectedChapters = [];
let pdfPages         = [];
let analysisReady    = false;

/* ── PDF Analysieren ── */
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  if (typeof pdfjsLib === 'undefined') {
    setStatus('PDF.js nicht geladen – bitte zuerst download-deps.bat ausführen und Seite neu laden.', 'error');
    return;
  }

  const filename = document.getElementById('pdfFilename').value.trim();
  if (!filename) {
    setStatus('Bitte zuerst einen Dateinamen eingeben.', 'error');
    return;
  }

  const mode     = getChapterMode();
  const keywords = document.getElementById('headingKeywords').value
                     .split(',').map(k => k.trim()).filter(Boolean);

  if (mode === 'keyword-only' && keywords.length === 0) {
    setStatus('Bitte mindestens ein Schlüsselwort eingeben wenn „Nur Schlüsselwörter" gewählt ist.', 'error');
    document.getElementById('headingKeywords').focus();
    return;
  }

  const btn = document.getElementById('analyzeBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Analysiere…';
  setStatus('', '');
  clearChapterPreview();
  analysisReady = false;
  document.getElementById('saveBtn').disabled = true;

  try {
    const { pages, numPages } = await window.PdfParser.loadPdfPages(filename);
    pdfPages = pages;

    detectedChapters = window.PdfParser.detectChapters(pages, keywords, mode);

    setStatus('✓ ' + numPages + ' Seiten geladen – ' + detectedChapters.length + ' Kapitel erkannt.', 'success');
    renderChapterPreview(detectedChapters, numPages);
    analysisReady = true;
    document.getElementById('saveBtn').disabled = false;

  } catch (err) {
    console.error(err);
    setStatus('Fehler beim Laden: ' + (err.message || err) + ' – Liegt die Datei in books/?', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-search"></i> PDF analysieren & Kapitel-Vorschau';
});

function setStatus(msg, type) {
  const el = document.getElementById('analyzeStatus');
  el.innerHTML = msg;
  el.className = type;
}

function clearChapterPreview() {
  document.getElementById('chapterPreview').innerHTML = '';
}

function renderChapterPreview(chapters, totalPages) {
  const container = document.getElementById('chapterPreview');
  container.innerHTML = '';
  chapters.forEach((ch, i) => {
    const endPage   = i + 1 < chapters.length ? chapters[i+1].startPage - 1 : totalPages;
    const pageCount = endPage - ch.startPage + 1;
    const item      = document.createElement('div');
    item.className  = 'chapter-item';
    item.innerHTML  =
      '<span class="chapter-num">' + String(i+1).padStart(2,'0') + '</span>' +
      '<span class="chapter-name">' + escHtml(ch.title) + '</span>' +
      '<span class="chapter-pages">S. ' + ch.startPage + '–' + endPage + ' (' + pageCount + ')</span>';
    container.appendChild(item);
  });
}

/* ── Buch speichern ── */
document.getElementById('addBookForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!analysisReady) {
    setStatus('Bitte zuerst die PDF analysieren.', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px;"></div> Speichern…';

  let coverData = null;
  try {
    if (activeCoverTab === 'file') {
      const file = document.getElementById('coverFile').files[0];
      if (file) coverData = await fileToBase64(file);
    } else if (activeCoverTab === 'url') {
      const url = document.getElementById('coverUrl').value.trim();
      if (url) coverData = url;
    }
  } catch(err) { console.warn('Cover-Fehler:', err); }

  const genres = document.getElementById('bookGenre').value
    .split(',').map(g => g.trim()).filter(Boolean);

  const book = {
    id:          genId(),
    filename:    document.getElementById('pdfFilename').value.trim(),
    title:       document.getElementById('bookTitle').value.trim(),
    author:      document.getElementById('bookAuthor').value.trim(),
    description: document.getElementById('bookDesc').value.trim(),
    genres,
    cover:       coverData,
    chapters:    detectedChapters,
    addedAt:     new Date().toISOString()
  };

  const books = getBooks();
  books.push(book);
  saveBooks(books);
  window.location.href = 'book-detail.html?id=' + book.id;
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}