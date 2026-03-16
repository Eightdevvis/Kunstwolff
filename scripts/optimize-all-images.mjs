import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const imgRoot = path.join(projectRoot, 'public', 'img');
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif']);
const maxWidth = 1600;
const webpQuality = 75;

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

// Einzelnes Bild zu WebP konvertieren, Original löschen
const convertImage = async (filePath) => {
  const parsed = path.parse(filePath);
  const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

  const image = sharp(filePath);
  const metadata = await image.metadata();

  if (!metadata.width) {
    return null;
  }

  const needsResize = metadata.width > maxWidth;

  await image
    .resize(needsResize ? maxWidth : undefined, undefined, {
      withoutEnlargement: true,
      fit: 'inside',
    })
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

const images = findConvertibleImages(imgRoot);

if (images.length === 0) {
  console.log('optimize-all-images: Alle Bilder bereits als WebP vorhanden.');
  process.exit(0);
}

console.log(`optimize-all-images: ${images.length} Bilder gefunden zum Konvertieren.`);

const results = [];

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

if (results.length === 0) {
  console.log('optimize-all-images: Keine Bilder konvertiert.');
  process.exit(0);
}

const totalSaved = results.reduce((sum, r) => sum + r.savedKB, 0);
console.log(`optimize-all-images: ${results.length} Bilder konvertiert, ${totalSaved} KB gespart.`);

// Alle neuen WebP-Dateien und gelöschten Originale stagen
execSync('git add public/img/', { cwd: projectRoot });

// Slides-Metadaten aktualisieren falls Slides betroffen
const slidesAffected = results.some((r) => r.original.startsWith('public/img/slides/'));
if (slidesAffected) {
  console.log('optimize-all-images: Slides betroffen, aktualisiere slides.meta.json...');
  execSync('npm run sync:slides', { cwd: projectRoot, stdio: 'inherit' });
  execSync('git add public/img/slides/slides.meta.json', { cwd: projectRoot });
}
