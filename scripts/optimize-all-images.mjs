import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { MAX_EDGE, WEBP_QUALITY, resizeToMaxEdge, exceedsMaxEdge } from './image-constraints.mjs';
import { migrateMetadataKeys } from './bild-metadaten-schluessel.mjs';

const projectRoot = process.cwd();
const imgRoot = path.join(projectRoot, 'public', 'img');
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif']);
// Schon-WebP/AVIF werden nicht KONVERTIERT (wären nur schlechter), aber seit
// 2026-07-26 auf Übergröße geprüft: Admin-Uploads kommen browser-seitig bereits
// als WebP an und umgingen dadurch jede weitere Optimierung – so sind 18 Bilder
// mit 3000×4000 ins Repo gelangt.
const recheckExtensions = new Set(['.webp', '.avif']);
const maxWidth = MAX_EDGE;
const webpQuality = WEBP_QUALITY;

// Rekursiv alle Bilddateien finden die noch kein WebP-Pendant haben
const findConvertibleImages = (dir) => {
  const results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findConvertibleImages(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!allowedExtensions.has(ext)) {
      continue;
    }

    const parsed = path.parse(fullPath);
    const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

    if (fs.existsSync(webpPath)) {
      continue;
    }

    results.push(fullPath);
  }

  return results;
};

// Rekursiv alle SCHON optimierten Bilder (webp/avif) finden, die über dem
// Kantendeckel liegen. Zweiter, unabhängiger Durchgang: hier wird nicht
// konvertiert und nichts gelöscht, nur an Ort und Stelle herunterrechnet.
const findOversizedImages = (dir) => {
  const results = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results.push(...findOversizedImages(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!recheckExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    results.push(fullPath);
  }

  return results;
};

// Ein bereits optimiertes Bild an Ort und Stelle auf den Kantendeckel bringen.
// Rückgabe null = war schon klein genug oder nicht lesbar (dann nichts anfassen).
const shrinkInPlace = async (filePath) => {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || !metadata.height) return null;
  if (!exceedsMaxEdge(metadata.width, metadata.height, maxWidth)) return null;

  const ext = path.extname(filePath).toLowerCase();
  const originalSize = fs.statSync(filePath).size;

  // Über eine temporäre Datei, weil sharp nicht in die eigene Quelle schreiben
  // kann. Format beibehalten – ein AVIF soll AVIF bleiben.
  const tmpPath = `${filePath}.tmp`;
  const pipeline = sharp(filePath).resize(resizeToMaxEdge(maxWidth));
  await (ext === '.avif'
    ? pipeline.avif({ quality: webpQuality })
    : pipeline.webp({ quality: webpQuality })
  ).toFile(tmpPath);

  // Nur übernehmen, wenn es wirklich kleiner wurde – sonst lieber das Original
  // behalten, als ein neu encodiertes Bild mit Qualitätsverlust und ohne Gewinn.
  const newSize = fs.statSync(tmpPath).size;
  if (newSize >= originalSize) {
    fs.unlinkSync(tmpPath);
    return null;
  }

  fs.renameSync(tmpPath, filePath);

  return {
    file: path.relative(projectRoot, filePath),
    from: `${metadata.width}x${metadata.height}`,
    savedKB: Math.round((originalSize - newSize) / 1024),
  };
};

// Einzelnes Bild zu WebP konvertieren, Original löschen
const convertImage = async (filePath) => {
  const parsed = path.parse(filePath);
  const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

  const image = sharp(filePath);
  const metadata = await image.metadata();

  if (!metadata.width) {
    return null;
  }

  // Deckelt die LÄNGERE Kante – nicht nur die Breite (siehe image-constraints.mjs).
  await image
    .resize(resizeToMaxEdge(maxWidth))
    .webp({ quality: webpQuality })
    .toFile(webpPath);

  const originalSize = fs.statSync(filePath).size;
  const optimizedSize = fs.statSync(webpPath).size;
  const savedKB = Math.round((originalSize - optimizedSize) / 1024);

  // Original aus git entfernen und vom Filesystem löschen
  try {
    execSync(`git rm --cached "${path.relative(projectRoot, filePath)}"`, {
      cwd: projectRoot,
      stdio: 'pipe',
    });
  } catch {
    // Datei war nicht in git index, ignorieren
  }
  fs.unlinkSync(filePath);

  return {
    original: path.relative(projectRoot, filePath),
    optimized: path.relative(projectRoot, webpPath),
    savedKB,
  };
};

// ── Durchgang 1: Nicht-WebP konvertieren ─────────────────────────────────────

const images = findConvertibleImages(imgRoot);
const results = [];

if (images.length === 0) {
  console.log('optimize-all-images: Alle Bilder bereits als WebP vorhanden.');
} else {
  console.log(`optimize-all-images: ${images.length} Bilder gefunden zum Konvertieren.`);

  for (const filePath of images) {
    try {
      const result = await convertImage(filePath);
      if (result) {
        results.push(result);
        console.log(`  ✓ ${result.original} → ${result.optimized} (${result.savedKB} KB gespart)`);
      }
    } catch (err) {
      console.error(`  ✗ Fehler bei ${path.relative(projectRoot, filePath)}:`, err.message);
    }
  }
}

// ── Durchgang 2: vorhandene Übergrößen – NUR auf ausdrückliche Anforderung ────
//
// Dieser Durchgang schreibt bestehende Dateien NEU (verlustbehaftet). Er darf
// deshalb NICHT automatisch im pre-push-Hook laufen: der committet sein Ergebnis
// ungefragt, und die Originale existieren nur im Repo. Ein versehentlicher Lauf
// wäre eine Massen-Neucodierung ohne Backup – und würde .git zusätzlich
// aufblähen, weil Git jeden alten Blob behält.
//
// Neu hinzukommende Übergrößen fängt der pre-commit-Hook ab
// (optimize-staged-images.mjs), Admin-Uploads deckelt imageWebp.ts browser-seitig.
// Dieser Durchgang ist für die einmalige Sanierung des Altbestands gedacht:
//
//   node scripts/optimize-all-images.mjs --shrink-existing
//
const shrinkExisting = process.argv.includes('--shrink-existing');
const shrunk = [];

if (shrinkExisting) {
  const candidates = findOversizedImages(imgRoot);
  console.log(`optimize-all-images: prüfe ${candidates.length} vorhandene Bilder auf Übergröße...`);

  for (const filePath of candidates) {
    try {
      const result = await shrinkInPlace(filePath);
      if (result) {
        shrunk.push(result);
        console.log(`  ↓ ${result.file} (${result.from}, ${result.savedKB} KB gespart)`);
      }
    } catch (err) {
      console.error(`  ✗ Fehler bei ${path.relative(projectRoot, filePath)}:`, err.message);
    }
  }

  console.log(`optimize-all-images: ${shrunk.length} Bilder herunterskaliert.`);
}

// ── Ergebnis stagen ──────────────────────────────────────────────────────────

if (results.length === 0 && shrunk.length === 0) {
  console.log('optimize-all-images: Nichts zu tun.');
  process.exit(0);
}

const totalSaved =
  results.reduce((sum, r) => sum + r.savedKB, 0) + shrunk.reduce((sum, r) => sum + r.savedKB, 0);
console.log(
  `optimize-all-images: ${results.length} konvertiert, ${shrunk.length} verkleinert, ${totalSaved} KB gespart.`
);

// Metadaten mitziehen – MUSS vor `sync:slides` laufen: danach gehört der
// Schlüssel wieder zu einer existierenden Datei und der Sync lässt ihn stehen,
// statt ihn als Karteileiche wegzuräumen. Warum überhaupt: siehe Modul.
const migrated = migrateMetadataKeys(projectRoot, results, (file) => {
  spawnSync('git', ['add', '--', file], { cwd: projectRoot });
});
if (migrated > 0) {
  console.log(`optimize-all-images: ${migrated} Metadaten-Einträge auf den neuen Dateinamen gezogen.`);
}

// Alle neuen WebP-Dateien und gelöschten Originale stagen
execSync('git add public/img/', { cwd: projectRoot });

// Slides-Metadaten aktualisieren falls Slides betroffen
const slidesAffected =
  results.some((r) => r.original.startsWith('public/img/slides/')) ||
  shrunk.some((r) => r.file.startsWith('public/img/slides/'));
if (slidesAffected) {
  console.log('optimize-all-images: Slides betroffen, aktualisiere slides.meta.json...');
  execSync('npm run sync:slides', { cwd: projectRoot, stdio: 'inherit' });
  execSync('git add public/img/slides/slides.meta.json', { cwd: projectRoot });
}
