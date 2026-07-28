// Responsive Bildvarianten erzeugen – NACH dem Astro-Build, direkt in dist/.
//
// Entscheidung (Phase 4, 2026-07-28): die Bilder bleiben in `public/`, die
// Varianten entstehen beim Bauen.
//
// Warum nicht `astro:assets`: `public/` umgeht die Bild-Pipeline von Astro
// grundsätzlich, und ein Umzug nach `src/assets/` würde den Vertrag zwischen
// den beiden Repos brechen – das Admin-Tool schreibt nach `public/` und listet
// von dort. Das ist keine interne Konvention, sondern die Schnittstelle.
//
// Warum die Varianten NICHT ins Repo: sie sind ableitbar. Lägen sie in
// `public/`, würden sie
//   - das Repo um ein Vielfaches aufblähen (dieselbe Krankheit, die wir gerade
//     mit den Duplikaten kuriert haben),
//   - im Admin als vermeintlich eigene Bilder auftauchen (der ImageManager
//     listet jede Bilddatei eines Ordners),
//   - bei jedem Upload-Vorgang als zusätzliche Blobs mitgeschleppt.
// In `dist/` kosten sie nichts davon und werden bei jedem Build frisch erzeugt.
//
//   node scripts/generate-image-variants.mjs
//   node scripts/generate-image-variants.mjs --check   # nur zählen

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';

const nurPruefen = process.argv.includes('--check');

/** Breiten, die `sizes` im Slideshow-Markup anbietet. */
export const VARIANT_WIDTHS = [400, 800, 1200];

const distRoot = path.resolve('./dist');
const quellen = ['img/slides', 'img/Titelbild', 'img/why'];
const bildEndung = /\.webp$/i;

/** Zielpfad einer Variante: img/slides/x/y.webp + 800 → img/variants/img/slides/x/y-800.webp */
export const variantPath = (relPfad, breite) => {
  const ext = path.extname(relPfad);
  return path.posix.join('img/variants', `${relPfad.slice(0, -ext.length)}-${breite}${ext}`);
};

const walk = (abs, rel = '') => {
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const a = path.join(abs, e.name);
    const r = path.posix.join(rel, e.name);
    if (e.isDirectory()) return walk(a, r);
    return bildEndung.test(e.name) ? [r] : [];
  });
};

const grenze = Math.max(2, os.cpus().length - 1);

async function inHaeppchen(items, arbeit) {
  let i = 0;
  const laeufer = Array.from({ length: Math.min(grenze, items.length) }, async () => {
    while (i < items.length) {
      const eigene = items[i++];
      await arbeit(eigene);
    }
  });
  await Promise.all(laeufer);
}

export async function generateVariants() {
  if (!fs.existsSync(distRoot)) {
    console.error('bild-varianten: dist/ fehlt – erst bauen, dann Varianten erzeugen.');
    process.exitCode = 1;
    return;
  }

  const dateien = quellen.flatMap((q) => walk(path.join(distRoot, q), q));
  if (dateien.length === 0) {
    console.log('bild-varianten: keine Quellbilder gefunden.');
    return;
  }

  if (nurPruefen) {
    console.log(`bild-varianten: ${dateien.length} Quellbilder × ${VARIANT_WIDTHS.length} Breiten.`);
    return;
  }

  let erzeugt = 0;
  let uebersprungen = 0;
  let fehler = 0;

  await inHaeppchen(dateien, async (rel) => {
    const quelle = path.join(distRoot, rel);
    let breiteOriginal;
    try {
      breiteOriginal = (await sharp(quelle).metadata()).width ?? 0;
    } catch {
      fehler++;
      return;
    }

    for (const breite of VARIANT_WIDTHS) {
      // Nie hochskalieren: eine 400px-Datei als "800px-Variante" wäre größer
      // als das Original und schlechter.
      if (breiteOriginal && breite >= breiteOriginal) {
        uebersprungen++;
        continue;
      }
      const ziel = path.join(distRoot, variantPath(rel, breite));
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      try {
        await sharp(quelle).resize({ width: breite, withoutEnlargement: true }).webp({ quality: 75 }).toFile(ziel);
        erzeugt++;
      } catch {
        fehler++;
      }
    }
  });

  console.log(
    `bild-varianten: ${erzeugt} erzeugt, ${uebersprungen} übersprungen (Original kleiner), ${fehler} Fehler.`
  );
  if (fehler > 0) process.exitCode = 1;
}

// Nur ausführen, wenn direkt aufgerufen – im Build ruft die Astro-Integration
// `generateVariants()` an `astro:build:done` (siehe astro.config.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  await generateVariants();
}
