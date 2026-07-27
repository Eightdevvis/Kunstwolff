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
 * `sharp` scheidet aus: es ist asynchron, die Slide-Reader sind synchron.
 * Der WebP-Header ist dafür simpel genug – 12 Byte RIFF, dann ein Chunk, dessen
 * vier Kennbuchstaben das Format verraten:
 *
 *   VP8    verlustbehaftet   Breite als 14-Bit-Wert ab Byte 26
 *   VP8L   verlustfrei       Breite-1 als 14-Bit-Wert ab Byte 21
 *   VP8X   erweitert         Leinwandbreite-1 als 24-Bit-Wert ab Byte 24
 */

import fs from 'fs';

const cache = new Map<string, number | null>();

/** Breite in Pixeln, oder null wenn die Datei nicht lesbar/kein WebP ist. */
export function readWebpWidth(filePath: string): number | null {
  if (cache.has(filePath)) return cache.get(filePath) ?? null;

  let breite: number | null = null;
  try {
    // 32 Byte genügen für alle drei Varianten.
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(32);
    const gelesen = fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);

    if (gelesen >= 30 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const kennung = buf.toString('ascii', 12, 16);
      if (kennung === 'VP8 ') {
        breite = buf.readUInt16LE(26) & 0x3fff;
      } else if (kennung === 'VP8L') {
        const bits = buf.readUInt32LE(21);
        breite = (bits & 0x3fff) + 1;
      } else if (kennung === 'VP8X') {
        breite = (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16)) + 1;
      }
    }
  } catch {
    breite = null;
  }

  if (breite !== null && (!Number.isFinite(breite) || breite <= 0)) breite = null;
  cache.set(filePath, breite);
  return breite;
}
