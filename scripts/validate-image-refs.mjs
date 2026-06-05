/**
 * validate-image-refs.mjs
 *
 * Guard gegen tote Bildverweise. Hintergrund: Der pre-push-Hook konvertiert
 * Bilder zu .webp und LÖSCHT die Originale, aktualisiert aber keine Verweise.
 * Dadurch zeigen Referenzen in Code/Daten weiter auf gelöschte .jpg/.png →
 * 404 auf der Live-Seite. Dieses Script scannt alle literalen `/img/…`-Verweise
 * und prüft, ob die Zieldatei in `public/` existiert.
 *
 * Läuft als letzter Schritt von `npm run sync:content` (vor dev/build/commit).
 * Exit-Code 1 bei totem Verweis → bricht den Lauf ab.
 *
 * Grenzen: erkennt nur LITERALE Pfade (statische Strings). Dynamisch
 * zusammengebaute Pfade (String-Konkatenation) werden nicht geprüft.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(projectRoot, 'public');

// Dateitypen, in denen wir nach Verweisen suchen
const scanExts = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.json', '.md']);
const skipDirs = new Set(['node_modules', '.git', 'dist', '.astro']);
// Bild-Endungen, deren Existenz wir prüfen
const imgExtAlt = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif'];

// Verweis-Muster: /img/… bis zu einem String-/Whitespace-Begrenzer, endend auf Bild-Endung.
// Begrenzer ausgeschlossen: Anführungszeichen, Backtick, Whitespace, schließende Klammern.
const refRe = /\/img\/[^"'`\s)>\]}]+?\.(?:webp|jpe?g|png|gif|avif)/gi;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (scanExts.has(path.extname(e.name).toLowerCase())) acc.push(p);
  }
  return acc;
}

const files = [...walk(path.join(projectRoot, 'src')), ...walk(publicDir)];

const broken = []; // { file, ref, hint }
for (const file of files) {
  const txt = fs.readFileSync(file, 'utf-8');
  const seen = new Set();
  let m;
  while ((m = refRe.exec(txt))) {
    const ref = m[0];
    if (seen.has(ref)) continue;
    seen.add(ref);
    const abs = path.join(publicDir, ref);
    if (fs.existsSync(abs)) continue; // Ziel existiert → ok

    // Existiert eine Schwesterdatei mit anderer Endung? (klassischer jpg→webp-Fall)
    const base = abs.replace(/\.[^.]+$/, '');
    const sibling = imgExtAlt
      .map((ext) => base + ext)
      .find((p) => fs.existsSync(p));
    const rel = path.relative(projectRoot, file);
    const hint = sibling
      ? `→ existiert als .${sibling.split('.').pop()} (Endung im Verweis korrigieren)`
      : '→ keine Datei (auch keine andere Endung) gefunden';
    broken.push({ file: rel, ref, hint });
  }
}

if (broken.length === 0) {
  console.log(`validate-image-refs: ${files.length} Dateien gescannt – alle Bildverweise gültig ✓`);
  process.exit(0);
}

console.error(`\nvalidate-image-refs: ${broken.length} TOTE Bildverweise gefunden:\n`);
for (const b of broken) {
  console.error(`  ✗ ${b.file}`);
  console.error(`      ${b.ref}`);
  console.error(`      ${b.hint}`);
}
console.error(
  `\nUrsache meist: Bild wurde zu .webp konvertiert, Verweis zeigt noch auf alt.\n` +
    `Fix: Verweis auf die existierende Datei zeigen lassen (oft .jpg/.png → .webp).\n`
);
process.exit(1);
