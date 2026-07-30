/**
 * Bildbreite einer WebP-Datei aus dem Header lesen – synchron und ohne
 * Abhängigkeit.
 *
 * Warum überhaupt: `srcset` verzeiht keinen fehlenden Kandidaten. Wählt der
 * Browser eine Variante, die es nicht gibt, bleibt das Bild leer – anders als
 * bei einem kaputten `src` gibt es keinen zweiten Versuch. Wir dürfen also nur
 * Breiten anbieten, die auch wirklich erzeugt wurden, und dafür muss die
 * Originalbreite zur Render-Zeit bekannt sein.
 *
 * Seit der Galerie wird auch die HÖHE gelesen. Grund: das Mosaik zeigt jedes
 * Bild in seinem eigenen Seitenverhältnis, ungeschnitten. Ohne `width`/`height`
 * am `<img>` kennt der Browser dieses Verhältnis erst, wenn die Datei da ist –
 * bei ~230 lazy geladenen Bildern in Spalten heißt das: die Seite springt beim
 * Scrollen dauernd um. Mit beiden Maßen reserviert er den Platz vorab.
 *
 * `sharp` scheidet aus: es ist asynchron, die Slide-Reader sind synchron.
 * Der WebP-Header ist dafür simpel genug – 12 Byte RIFF, dann ein Chunk, dessen
 * vier Kennbuchstaben das Format verraten:
 *
 *   VP8    verlustbehaftet   Breite  14-Bit ab Byte 26, Höhe  14-Bit ab Byte 28
 *   VP8L   verlustfrei       Breite-1 und Höhe-1 als je 14 Bit im 32-Bit-Wert ab Byte 21
 *   VP8X   erweitert         Leinwandbreite-1 24-Bit ab Byte 24, Höhe-1 24-Bit ab Byte 27
 */

import fs from 'fs';

export type WebpSize = { width: number; height: number };

const cache = new Map<string, WebpSize | null>();

/** Breite und Höhe in Pixeln, oder null wenn die Datei nicht lesbar/kein WebP ist. */
export function readWebpSize(filePath: string): WebpSize | null {
  if (cache.has(filePath)) return cache.get(filePath) ?? null;

  let groesse: WebpSize | null = null;
  try {
    // 32 Byte genügen für alle drei Varianten.
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(32);
    const gelesen = fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);

    if (gelesen >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const kennung = buf.toString('ascii', 12, 16);
      if (kennung === 'VP8 ') {
        groesse = {
          width: buf.readUInt16LE(26) & 0x3fff,
          height: buf.readUInt16LE(28) & 0x3fff,
        };
      } else if (kennung === 'VP8L') {
        // 14 Bit Breite-1, dann 14 Bit Höhe-1 – beide im selben 32-Bit-Wert.
        const bits = buf.readUInt32LE(21);
        groesse = {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      } else if (kennung === 'VP8X') {
        groesse = {
          width: (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16)) + 1,
          height: (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16)) + 1,
        };
      }
    }
  } catch {
    groesse = null;
  }

  // Ein halb gelesenes Maß ist wertlos: ein `height="0"` am `<img>` wäre
  // schlimmer als gar keine Angabe.
  if (
    groesse &&
    (!Number.isFinite(groesse.width) ||
      !Number.isFinite(groesse.height) ||
      groesse.width <= 0 ||
      groesse.height <= 0)
  ) {
    groesse = null;
  }

  cache.set(filePath, groesse);
  return groesse;
}

/** Nur die Breite – was `srcset` braucht. */
export function readWebpWidth(filePath: string): number | null {
  return readWebpSize(filePath)?.width ?? null;
}
