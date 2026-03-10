
// Importiere benötigte Node.js-Module und sharp für Bildbearbeitung
import { execSync } from 'child_process'; // Für das Ausführen von Git-Befehlen
import fs from 'fs'; // Für Dateisystem-Operationen
import path from 'path'; // Für Pfad-Operationen
import sharp from 'sharp'; // Für Bildoptimierung und -konvertierung


// Projektverzeichnis (Root)
const projectRoot = process.cwd();
// Pfad zum Slides-Bilderordner
const slidesRoot = path.join(projectRoot, 'public', 'img', 'slides');
// Erlaubte Bildformate
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif']);
// Maximale Breite für optimierte Bilder (Pixel)
const maxWidth = 1600;
// Qualität für WebP-Export (0-100)
const webpQuality = 75;


// Liefert alle neuen/änderten Bilddateien im Slides-Ordner, die zum Commit vorgemerkt sind
const getStagedImageFiles = () => {
  try {
    // Hole alle zum Commit vorgemerkten Dateien (hinzugefügt/geändert)
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      encoding: 'utf-8',
      cwd: projectRoot,
    });

    return output
      .split('\n') // Zeilenweise aufteilen
      .map((line) => line.trim()) // Whitespace entfernen
      .filter((line) => line.startsWith('public/img/slides/')) // Nur Slides-Bilder
      .filter((line) => {
        const ext = path.extname(line).toLowerCase();
        return allowedExtensions.has(ext); // Nur erlaubte Bildformate
      })
      .map((line) => path.join(projectRoot, line)) // Absoluten Pfad erzeugen
      .filter((filePath) => fs.existsSync(filePath)); // Nur existierende Dateien
  } catch {
    // Bei Fehler (z.B. kein Git-Repo): leeres Array
    return [];
  }
};


// Optimiert ein Bild (verkleinert ggf. und speichert als WebP)
const optimizeImage = async (filePath) => {
  // Zerlege Pfad in Einzelteile
  const parsed = path.parse(filePath);
  // Zielpfad für WebP-Datei
  const webpPath = path.join(parsed.dir, `${parsed.name}.webp`);

  // Wenn WebP schon existiert, überspringen
  if (fs.existsSync(webpPath)) {
    return null;
  }

  // Lade Bild mit sharp
  const image = sharp(filePath);
  // Lese Metadaten (z.B. Breite)
  const metadata = await image.metadata();

  if (!metadata.width) {
    // Falls keine Breite erkannt wird, abbrechen
    return null;
  }

  // Prüfe, ob Verkleinerung nötig ist
  const needsResize = metadata.width > maxWidth;

  // Verkleinere ggf. und speichere als WebP
  await image
    .resize(needsResize ? maxWidth : undefined, undefined, {
      withoutEnlargement: true, // Nie vergrößern
      fit: 'inside', // Seitenverhältnis beibehalten
    })
    .webp({ quality: webpQuality })
    .toFile(webpPath);

  // Vergleiche Dateigrößen
  const originalSize = fs.statSync(filePath).size;
  const optimizedSize = fs.statSync(webpPath).size;
  const savedKB = Math.round((originalSize - optimizedSize) / 1024);

  // Rückgabe-Objekt mit Infos
  return {
    original: path.relative(projectRoot, filePath), // Ursprungsbild (relativ)
    optimized: path.relative(projectRoot, webpPath), // WebP-Bild (relativ)
    savedKB, // Ersparnis in KB
  };
};


// Hole alle neuen/änderten Bilder im Slides-Ordner, die zum Commit vorgemerkt sind
const stagedImages = getStagedImageFiles();

if (stagedImages.length === 0) {
  // Keine neuen Bilder gefunden
  console.log('optimize-images: Keine neuen Bilder in Slides gefunden.');
  process.exit(0);
}

console.log(`optimize-images: ${stagedImages.length} neue Bilder gefunden.`);

const results = [];

// Gehe alle gefundenen Bilder durch und optimiere sie
for (const filePath of stagedImages) {
  try {
    const result = await optimizeImage(filePath);
    if (result) {
      results.push(result);
    }
  } catch (err) {
    // Fehler beim Optimieren eines Bildes
    console.error(`optimize-images: Fehler bei ${path.relative(projectRoot, filePath)}:`, err.message);
  }
}

if (results.length > 0) {
  // Mindestens ein Bild wurde optimiert
  console.log(`optimize-images: ${results.length} Bilder optimiert.`);
  
  // Gesamte Ersparnis berechnen
  const totalSaved = results.reduce((sum, r) => sum + r.savedKB, 0);
  console.log(`optimize-images: Gesamt-Einsparung: ${totalSaved} KB`);

  // Optimierte WebP-Dateien zum Commit hinzufügen
  const optimizedFiles = results.map((r) => r.optimized);
  
  for (const file of optimizedFiles) {
    execSync(`git add "${file}"`, { cwd: projectRoot });
  }
} else {
  // Alle Bilder waren schon optimiert
  console.log('optimize-images: Alle Bilder bereits optimiert (WebP vorhanden).');
}
