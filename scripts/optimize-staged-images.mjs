
import { spawnSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const projectRoot = process.cwd();

// Ordner die auf neue Bilder geprüft werden
const watchedFolders = [
  path.join('public', 'img', 'slides'),
  path.join('public', 'img', 'Titelbild'),
];

// Erlaubte Bildformate (kein .gif – animated GIFs verlieren Animation bei WebP-Konvertierung)
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png']);

const maxWidth = 1600;
const webpQuality = 75;


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
        return allowedExtensions.has(ext);
      })
      .map((line) => path.join(projectRoot, line))
      .filter((filePath) => fs.existsSync(filePath));
  } catch {
    return [];
  }
};


const optimizeImage = async (filePath) => {
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

  const needsResize = metadata.width > maxWidth;

  await image
    .resize(needsResize ? { width: maxWidth, withoutEnlargement: true, fit: 'inside' } : undefined)
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

  for (const result of results) {
    // spawnSync statt execSync + string interpolation → kein Shell-Injection-Risiko
    spawnSync('git', ['add', '--', result.optimized], { cwd: projectRoot });
  }
} else {
  console.log('optimize-images: Alle Bilder bereits optimiert (WebP vorhanden).');
}
