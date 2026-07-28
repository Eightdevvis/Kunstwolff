/**
 * `srcset`/`sizes` für Bilder aus `public/`.
 *
 * Hintergrund: `public/` umgeht `astro:assets` komplett, es gibt hier also
 * keine automatischen Varianten. Bis 2026-07-28 stand im gesamten `src/` kein
 * einziges `srcset` – jedes Gerät lud die volle Datei, auch das Handy. Bei
 * Seiten mit 30+ Slides ist das der grösste verbleibende Hebel.
 *
 * Die Varianten erzeugt `scripts/generate-image-variants.mjs` NACH dem Build
 * direkt in `dist/`; sie liegen bewusst nicht im Repo (ableitbar, würden es
 * aufblähen und im Admin als eigene Bilder auftauchen).
 */

/** Muss mit VARIANT_WIDTHS in scripts/generate-image-variants.mjs übereinstimmen. */
export const VARIANT_WIDTHS = [400, 800, 1200] as const;

const VARIANT_ROOT = '/img/variants';

/**
 * Schalter für die Auslieferung von `srcset`.
 *
 * `srcset` verzeiht keinen fehlenden Kandidaten – wählt der Browser eine
 * Variante, die es nicht gibt, bleibt das Bild leer, ohne zweiten Versuch.
 * Deshalb dieser Schalter statt eines Rückbaus, und deshalb gilt: **erst
 * einschalten, wenn die Varianten in der PRODUKTION nachweislich ankommen.**
 *
 * Chronik: am 2026-07-28 stand er kurz auf `false`, weil die Varianten live
 * fehlten (die Erzeugung hing am Build-BEFEHL, den Vercel abschnitt). Seit die
 * Erzeugung als Astro-Integration am Hook `astro:build:done` hängt, liefert die
 * Produktion sie aus – am echten Ziel geprüft, nicht angenommen.
 */
export const SRCSET_AKTIV = true;

/**
 * Pfad einer Variante. Spiegelt `variantPath()` im Build-Skript – weichen die
 * beiden ab, zeigt das `srcset` auf Dateien, die es nicht gibt.
 */
export function variantSrc(src: string, width: number): string {
  const punkt = src.lastIndexOf('.');
  if (punkt <= 0) return src;
  return `${VARIANT_ROOT}${src.slice(0, punkt)}-${width}${src.slice(punkt)}`;
}

/**
 * `srcset` für ein Bild. Das Original bleibt als grösste Stufe drin, damit auf
 * grossen Displays nichts an Schärfe verloren geht.
 *
 * OHNE bekannte Originalbreite gibt es KEIN `srcset`. Das ist Absicht: ein
 * angebotener, aber nicht erzeugter Kandidat lässt das Bild leer – der Browser
 * versucht es nicht noch einmal mit einer anderen Stufe. Lieber das Original
 * ausliefern als ein kaputtes Bild riskieren.
 */
export function buildSrcSet(src: string, originalWidth?: number): string {
  // NOTBREMSE (2026-07-28): erst wieder aktivieren, wenn die Varianten in der
  // PRODUKTION nachweislich ausgeliefert werden. Sie fehlten dort, weil der
  // Build-Schritt nicht lief – und ein srcset, dessen Kandidat 404 liefert,
  // zeigt gar kein Bild. Siehe SRCSET_AKTIV unten.
  if (!SRCSET_AKTIV) return '';
  if (!src.startsWith('/img/') || !originalWidth || originalWidth <= 0) return '';
  // Nur Stufen, die das Build-Skript auch erzeugt: es überspringt jede Breite
  // >= Original (kein Hochskalieren). Die Bedingung MUSS dieselbe sein.
  const stufen = VARIANT_WIDTHS.filter((w) => w < originalWidth).map(
    (w) => `${variantSrc(src, w)} ${w}w`
  );
  if (stufen.length === 0) return '';
  stufen.push(`${src} ${originalWidth}w`);
  return stufen.join(', ');
}

/**
 * `sizes` für die Slideshow.
 *
 * Die Bühne ist auf schmalen Geräten ~volle Breite und wächst auf grossen
 * Displays nicht über ~1200px hinaus. Bewusst grob gehalten: eine zu genaue
 * Angabe wird beim nächsten Layout-Umbau falsch, ohne dass es jemand merkt.
 */
export const SLIDESHOW_SIZES = '(max-width: 640px) 100vw, (max-width: 1200px) 60vw, 700px';
