
import { spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { MAX_EDGE, WEBP_QUALITY, resizeToMaxEdge } from './image-constraints.mjs';
import { migrateMetadataKeys } from './bild-metadaten-schluessel.mjs';

const projectRoot = process.cwd();

// Ordner die auf neue Bilder geprüft werden
const watchedFolders = [
  path.join('public', 'img', 'slides'),
  path.join('public', 'img', 'Titelbild'),
];

// Erlaubte Bildformate (kein .gif – animated GIFs verlieren Animation bei WebP-Konvertierung)
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png']);

// Schon optimierte Formate: NICHT konvertieren (wäre nur schlechter), aber seit
// 2026-07-26 auf Übergröße prüfen. Vorher rutschte ein von Hand hinzugefügtes
// 3000×4000-WebP komplett an der Optimierung vorbei – so sind 18 solcher Bilder
// ins Repo gelangt.
const recheckExtensions = new Set(['.webp', '.avif']);

const maxWidth = MAX_EDGE;
const webpQuality = WEBP_QUALITY;


const getStagedImageFiles = () => {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      cwd: projectRoot,
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => {
        const normalized = line.replace(/\\/g, '/');
        return watchedFolders.some((folder) =>
          normalized.startsWith(folder.replace(/\\/g, '/'))
        );
      })
      .filter((line) => {
        const ext = path.extname(line).toLowerCase();
        return allowedExtensions.has(ext) || recheckExtensions.has(ext);
      })
      .map((line) => path.join(projectRoot, line))
      .filter((filePath) => fs.existsSync(filePath));
  } catch {
    return [];
  }
};


// Ein schon optimiertes Bild (webp/avif) an Ort und Stelle auf den Kantendeckel
// bringen. Kein Formatwechsel, kein Löschen – nur herunterrechnen, und nur wenn
// es dadurch wirklich kleiner wird.
const shrinkInPlace = async (filePath) => {
  const metadata = await sharp(filePath).metadata();
  if (!metadata.width || !metadata.height) return null;
  if (Math.max(metadata.width, metadata.height) <= maxWidth) return null;

  const ext = path.extname(filePath).toLowerCase();
  const originalSize = fs.statSync(filePath).size;

  // sharp kann nicht in die eigene Quelle schreiben → über eine temporäre Datei.
  const tmpPath = `${filePath}.tmp`;
  const pipeline = sharp(filePath).resize(resizeToMaxEdge(maxWidth));
  await (ext === '.avif'
    ? pipeline.avif({ quality: webpQuality })
    : pipeline.webp({ quality: webpQuality })
  ).toFile(tmpPath);

  const newSize = fs.statSync(tmpPath).size;
  if (newSize >= originalSize) {
    fs.unlinkSync(tmpPath);
    return null;
  }
  fs.renameSync(tmpPath, filePath);

  return {
    original: path.relative(projectRoot, filePath),
    optimized: path.relative(projectRoot, filePath),
    savedKB: Math.round((originalSize - newSize) / 1024),
  };
};

const optimizeImage = async (filePath) => {
  // Schon optimiertes Format: nur Übergröße korrigieren, nicht konvertieren.
  if (recheckExtensions.has(path.extname(filePath).toLowerCase())) {
    return shrinkInPlace(filePath);
  }

  const parsed = path.parse(filePath);
  const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

  // WebP überspringen wenn bereits aktuell (Original nicht neuer als WebP)
  if (fs.existsSync(webpPath)) {
    const originalMtime = fs.statSync(filePath).mtimeMs;
    const webpMtime = fs.statSync(webpPath).mtimeMs;
    if (originalMtime <= webpMtime) {
      return null;
    }
  }

  const image = sharp(filePath);
  const metadata = await image.metadata();

  if (!metadata.width) {
    console.warn(`optimize-images: Warnung - keine Bildbreite erkennbar, überspringe: ${path.relative(projectRoot, filePath)}`);
    return null;
  }

  // Deckelt die LÄNGERE Kante – nicht nur die Breite (siehe image-constraints.mjs).
  // withoutEnlargement macht den Aufruf für kleine Bilder zum No-Op, ein
  // vorgeschaltetes needsResize erübrigt sich.
  await image
    .resize(resizeToMaxEdge(maxWidth))
    .webp({ quality: webpQuality })
    .toFile(webpPath);

  const originalSize = fs.statSync(filePath).size;
  const optimizedSize = fs.statSync(webpPath).size;
  const savedKB = Math.round((originalSize - optimizedSize) / 1024);

  return {
    original: path.relative(projectRoot, filePath),
    optimized: path.relative(projectRoot, webpPath),
    savedKB,
  };
};


const stagedImages = getStagedImageFiles();

if (stagedImages.length === 0) {
  console.log('optimize-images: Keine neuen Bilder gefunden.');
  process.exit(0);
}

console.log(`optimize-images: ${stagedImages.length} neue Bilder gefunden.`);

const results = [];

for (const filePath of stagedImages) {
  try {
    const result = await optimizeImage(filePath);
    if (result) {
      results.push(result);
    }
  } catch (err) {
    console.error(`optimize-images: Fehler bei ${path.relative(projectRoot, filePath)}: ${err.message}`);
  }
}

if (results.length > 0) {
  console.log(`optimize-images: ${results.length} Bilder optimiert.`);

  const totalSaved = results.reduce((sum, r) => sum + r.savedKB, 0);
  console.log(`optimize-images: Gesamt-Einsparung: ${totalSaved} KB`);

  // Aus x.gif wurde x.webp – die Metadaten schlüsseln auf den Dateinamen und
  // müssen mitwandern, sonst sind die im Admin gesetzten Werte still weg.
  const migrated = migrateMetadataKeys(projectRoot, results, (file) => {
    spawnSync('git', ['add', '--', file], { cwd: projectRoot });
  });
  if (migrated > 0) {
    console.log(`optimize-images: ${migrated} Metadaten-Einträge auf den neuen Dateinamen gezogen.`);
  }

  for (const result of results) {
    // spawnSync statt execSync + string interpolation → kein Shell-Injection-Risiko
    spawnSync('git', ['add', '--', result.optimized], { cwd: projectRoot });
  }
} else {
  console.log('optimize-images: Alle Bilder bereits optimiert (WebP vorhanden).');
}
