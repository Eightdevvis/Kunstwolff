/**
 * Referenz-Logos auf ihre tatsächliche Anzeigegrösse bringen.
 *
 * Warum das ein eigenes Skript ist und nicht der Varianten-Generator:
 * `generate-image-variants.mjs` erzeugt 400/800/1200er Stufen für Bilder, die
 * gross gezeigt werden. Die Logos werden NIRGENDS gross gezeigt – der
 * Laufstreifen (`BrandStripe.astro`) gibt ihnen einen Platz von rund 114×44 px,
 * das Gitter auf `/referenzen/` (`BrandGrid.astro`) genau 160×48 px. Eine
 * 400er-Stufe wäre also immer noch zu gross, und ein `srcset` mit drei Stufen
 * für ein 3 KB grosses Logo ist Aufwand ohne Ertrag.
 *
 * Gemessen am 2026-08-16, bevor dieses Skript lief: 40 Logos, 368 KB, darunter
 * ein Logo mit 3840×1055 px (36 KB) und eines mit 696×788 px (90 KB) – für
 * einen Platz von 44 px Höhe. Der Laufstreifen steht weit oben auf der
 * Startseite und lädt `eager`; diese 368 KB gehen also VOR den Bildern der
 * Slideshow über die Leitung, die `lazy` geladen werden.
 *
 * Die Quelldateien werden ERSETZT, nicht ergänzt. Das ist Absicht: es gibt
 * keinen Ort, an dem die grosse Fassung gebraucht würde, und eine zweite
 * Fassung wäre nur ein weiterer Pfad, der auseinanderlaufen kann. Das Original
 * bleibt über die Git-Historie erreichbar.
 *
 * Idempotent: was bereits klein genug ist, wird nicht angefasst. Nach dem
 * Hinzufügen neuer Logos einfach noch einmal laufen lassen.
 *
 *   node scripts/verkleinere-referenzlogos.mjs            # nur zeigen
 *   node scripts/verkleinere-referenzlogos.mjs --schreiben
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SCHREIBEN = process.argv.includes('--schreiben');
const ORDNER = 'public/img/referenzenLogos';

/**
 * Doppelte Anzeigegrösse, damit die Logos auf einem Retina-Display scharf
 * bleiben: 160×48 im Gitter ist der grösste Platz, also 320×96.
 */
const MAX_BREITE = 320;
const MAX_HOEHE = 96;

const dateien = readdirSync(ORDNER).filter((n) => /\.(webp|png|jpe?g)$/i.test(n));

let vorher = 0;
let nachher = 0;
let angefasst = 0;

for (const name of dateien) {
  const pfad = join(ORDNER, name);
  const alt = statSync(pfad).size;
  vorher += alt;

  const bild = sharp(pfad);
  const { width = 0, height = 0 } = await bild.metadata();

  if (width <= MAX_BREITE && height <= MAX_HOEHE) {
    nachher += alt;
    continue;
  }

  // `fit: inside` behält das Seitenverhältnis und deckelt BEIDE Kanten – ein
  // sehr breites Logo (3840×1055) darf sonst über die Höhe hinauswachsen.
  const neu = await bild
    .resize({ width: MAX_BREITE, height: MAX_HOEHE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  console.log(
    `${name}: ${width}×${height}, ${(alt / 1024).toFixed(0)} KB → ${(neu.length / 1024).toFixed(1)} KB`
  );

  nachher += neu.length;
  angefasst++;
  if (SCHREIBEN) writeFileSync(pfad, neu);
}

console.log(
  `\n${dateien.length} Logos, ${angefasst} verkleinert: ` +
    `${(vorher / 1024).toFixed(0)} KB → ${(nachher / 1024).toFixed(0)} KB`
);
if (!SCHREIBEN) console.log('Vorschau – es wurde nichts geändert. Mit --schreiben ausführen.');
