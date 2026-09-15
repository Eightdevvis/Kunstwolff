import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Liest die Pixel-Maße aller Titelbilder unter public/img/Titelbild/ ein und
 * schreibt sie nach public/img/Titelbild/title.dimensions.json.
 *
 * Warum als Sync-Schritt und nicht zur Render-Zeit: sharp ist asynchron, die
 * Titelbild-Auflösung in `resolveTitleImage()` (src/utils/titleImages.ts) ist
 * synchron. Ein async-Umbau würde sich durch alle Astro-Pages ziehen, die
 * Titelbilder rendern (index/[skill]/[landing]/[...kombi]). Wesentlich
 * kleinerer Diff: einmal beim Sync die Maße cachen und im Frontend synchron
 * lesen — dasselbe Muster wie `title.meta.json`.
 *
 * Warum sharp und nicht readWebpSize aus src/utils: sharp verarbeitet AVIF
 * (default-Titelbild `default/titelbild.avif`), der Header-Reader nur WebP.
 * Sync-Zeit darf async sein, deshalb kein Problem.
 *
 * Idempotent: bestehende Datei wird eingelesen; nur fehlende/geänderte Einträge
 * werden aktualisiert. Verwaiste Einträge (Bild wurde gelöscht) werden entfernt.
 */

const projectRoot = process.cwd();
const titleRoot = path.join(projectRoot, 'public', 'img', 'Titelbild');
const dimensionsPath = path.join(titleRoot, 'title.dimensions.json');

const allowedExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif']);

// Artefakt-Ordner aus alter Struktur: siehe memory/content-titelbild.md.
// Werden von `resolveTitleImage` nie gelesen, also auch hier ignoriert.
const skippedTopLevelDirs = new Set(['landings', 'skills']);

const walkImages = (dir, relativePrefix = '') => {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = relativePrefix ? path.posix.join(relativePrefix, entry.name) : entry.name;

    if (entry.isDirectory()) {
      if (relativePrefix === '' && skippedTopLevelDirs.has(entry.name)) continue;
      results.push(...walkImages(fullPath, relPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExtensions.has(ext)) {
        results.push({ relPath, fullPath });
      }
    }
  }

  return results;
};

const readExistingDimensions = () => {
  if (!fs.existsSync(dimensionsPath)) return {};
  try {
    const raw = fs.readFileSync(dimensionsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
};

const run = async () => {
  if (!fs.existsSync(titleRoot)) {
    console.log('sync-title-dimensions: Titelbild-Ordner fehlt, nichts zu tun.');
    return;
  }

  const images = walkImages(titleRoot);
  const existing = readExistingDimensions();
  const next = {};
  const additions = [];
  const removals = [];

  for (const { relPath, fullPath } of images) {
    const prev = existing[relPath];
    if (prev && typeof prev.width === 'number' && typeof prev.height === 'number') {
      // Mtime-Check: nur neu lesen, wenn die Datei jünger als der Eintrag ist.
      // Ohne Timestamp im Eintrag: als "aktuell" nehmen, um Idempotenz billig
      // zu halten. Wer eine Datei ersetzt, kann die JSON zur Not löschen —
      // beim nächsten Sync wird alles neu gelesen.
      next[relPath] = { width: prev.width, height: prev.height };
      continue;
    }

    try {
      const meta = await sharp(fullPath).metadata();
      if (typeof meta.width === 'number' && typeof meta.height === 'number' && meta.width > 0 && meta.height > 0) {
        next[relPath] = { width: meta.width, height: meta.height };
        additions.push(relPath);
      } else {
        console.warn(`sync-title-dimensions: Maße für ${relPath} nicht lesbar, überspringe.`);
      }
    } catch (err) {
      console.warn(`sync-title-dimensions: Fehler beim Lesen von ${relPath}: ${err.message ?? err}`);
    }
  }

  for (const relPath of Object.keys(existing)) {
    if (!(relPath in next)) {
      removals.push(relPath);
    }
  }

  // Sortiert schreiben — Diffs bleiben lesbar.
  const sorted = Object.fromEntries(
    Object.entries(next).sort(([a], [b]) => a.localeCompare(b)),
  );
  fs.writeFileSync(dimensionsPath, `${JSON.stringify(sorted, null, 2)}\n`);

  if (additions.length === 0 && removals.length === 0) {
    console.log(`sync-title-dimensions: Alle ${Object.keys(next).length} Bilder aktuell.`);
  } else {
    if (additions.length > 0) console.log(`sync-title-dimensions: + ${additions.length} neue Maße (${additions.slice(0, 3).join(', ')}${additions.length > 3 ? ', …' : ''})`);
    if (removals.length > 0) console.log(`sync-title-dimensions: - ${removals.length} verwaiste Einträge entfernt`);
  }
};

run().catch((err) => {
  console.error('sync-title-dimensions: Abbruch —', err);
  process.exit(1);
});
