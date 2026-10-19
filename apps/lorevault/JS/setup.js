/* ============================================================
   LoreVault – setup.js
   Einziges Skript von setup.html: Betriebssystem-Reiter und
   Befehle per Klick kopieren. Bewusst ein klassisches Skript
   (kein Modul), damit die Anleitung auch über file:// läuft.
   ============================================================ */

// OS-Tabs
document.querySelectorAll('.os-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.os-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.os-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('os-' + tab.dataset.os).classList.add('active');
  });
});

// Auto-Detect OS
const ua = navigator.userAgent.toLowerCase();
let os = 'win';
if (ua.includes('mac')) os = 'mac';
else if (ua.includes('linux')) os = 'lin';
document.querySelector(`[data-os="${os}"]`)?.click();

// Code kopieren
function copyCode(el) {
  const code = el.querySelector('span:first-child').textContent.trim();
  navigator.clipboard.writeText(code).then(() => {
    el.classList.add('copied');
    el.querySelector('.copy-hint').innerHTML = '<i class="bi bi-check-lg"></i> kopiert!';
    setTimeout(() => {
      el.classList.remove('copied');
      el.querySelector('.copy-hint').innerHTML = '<i class="bi bi-clipboard"></i> kopieren';
    }, 2000);
  });
}
document.querySelectorAll('.code-block').forEach(block => {
  block.addEventListener('click', () => copyCode(block));
});
