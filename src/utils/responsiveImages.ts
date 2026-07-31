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

import path from 'path';
import { readWebpSize } from './webpSize';

/** Muss mit VARIANT_WIDTHS in scripts/generate-image-variants.mjs übereinstimmen. */
export const VARIANT_WIDTHS = [400, 800, 1200] as const;

const VARIANT_ROOT = '/img/variants';

/**
 * Ordner, für die es überhaupt Varianten gibt. Muss mit `VARIANT_SOURCES` in
 * `scripts/generate-image-variants.mjs` übereinstimmen.
 *
 * Warum das eine eigene Liste ist und nicht bloss „alles unter /img/": der
 * Generator läuft nur über diese drei Ordner. Für `img/team` oder `img/hero-bg`
 * existiert keine einzige Variante — und ein `srcset`, dessen Kandidat 404
 * liefert, zeigt **gar kein Bild**, ohne zweiten Versuch. Der Riegel steht
 * deshalb in `buildSrcSet` selbst und nicht bei den Aufrufern: sonst muss jeder
 * neue Aufrufer daran denken, und genau das passiert nicht.
 */
export const VARIANT_SOURCES = ['/img/slides/', '/img/Titelbild/', '/img/why/'] as const;

const hatVarianten = (src: string): boolean =>
  VARIANT_SOURCES.some((ordner) => src.startsWith(ordner));

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
  // Ordner ohne Varianten → gar kein srcset. Siehe VARIANT_SOURCES.
  if (!hatVarianten(src) || !originalWidth || originalWidth <= 0) return '';
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
 * `srcset` für ein Hero-Bild, das nur als Pfad vorliegt.
 *
 * Die Slideshow und die Galerie kennen die Originalbreite bereits, weil ihre
 * Reader sie beim Einsammeln mitlesen. Die Hero-Bauteile bekommen dagegen einen
 * nackten Pfad aus `resolveTitleImage()` / `resolveHeroBg()` — und ohne Breite
 * gibt `buildSrcSet` absichtlich nichts zurück. Diese Funktion schließt genau
 * diese Lücke: Pfad → Datei → Breite → `srcset`.
 *
 * Nur WebP. Der Varianten-Generator verarbeitet ausschließlich `.webp`; für ein
 * AVIF gäbe es die angebotenen Stufen nicht, und ein `srcset` mit fehlendem
 * Kandidaten zeigt GAR KEIN Bild. Praktisch kostet das wenig: es gibt genau ein
 * AVIF-Hero (`Titelbild/default/titelbild.avif`, 39 KB) — das ist bereits
 * kleiner als jede Variante, die wir daraus machen würden.
 *
 * Läuft nur zur Build-Zeit (Astro-Frontmatter). Das Ergebnis wird zwischen-
 * gespeichert, weil dasselbe Titelbild auf bis zu 49 Seiten steht.
 */
const breitenCache = new Map<string, number>();
const publicRoot = path.resolve('./public');

/**
 * Originalbreite eines Bildes aus `public/`, oder 0.
 *
 * Nur WebP: der Varianten-Generator verarbeitet ausschliesslich `.webp`. Für ein
 * AVIF gäbe es die Stufen nicht, und ein angebotener, nicht erzeugter Kandidat
 * zeigt GAR KEIN Bild. Praktisch kostet das nichts — es gibt genau ein
 * AVIF-Hero (`Titelbild/default/titelbild.avif`, 39 KB), bereits kleiner als
 * jede Variante, die daraus entstünde.
 *
 * Zwischengespeichert, weil dasselbe Titelbild auf bis zu 49 Seiten steht.
 */
function heroBreite(src: string): number {
  if (breitenCache.has(src)) return breitenCache.get(src) ?? 0;

  let breite = 0;
  if (/\.webp$/i.test(src)) {
    // Die Pfade sind pro Segment URL-kodiert (Umlaute in Ordnernamen).
    const relativ = src
      .slice(1)
      .split('/')
      .map((teil) => decodeURIComponent(teil))
      .join(path.sep);
    const datei = path.resolve(publicRoot, relativ);

    // Nicht aus public/ herauslaufen – derselbe Riegel wie in bildAufloesung.ts.
    if (datei.startsWith(publicRoot + path.sep)) {
      breite = readWebpSize(datei)?.width ?? 0;
    }
  }

  breitenCache.set(src, breite);
  return breite;
}

export function heroSrcSet(src: unknown): string {
  if (typeof src !== 'string' || !hatVarianten(src)) return '';
  return buildSrcSet(src, heroBreite(src));
}

/**
 * Varianten eines Hero-HINTERGRUNDS (CSS `background-image`).
 *
 * `Opener.astro` und `EventHero.astro` zeigen ihr Titelbild nicht als `<img>`,
 * sondern als CSS-Hintergrund — und für einen Hintergrund gibt es kein
 * `srcset`. Der Ersatz: die Varianten kommen als eigene CSS-Variablen ins
 * `style`-Attribut, und die Media-Queries im jeweiligen Bauteil greifen die
 * passende heraus. Fehlt eine Variable, fällt `var(…, …)` auf das Original
 * zurück — deshalb braucht weder AVIF noch ein zu kleines Original einen
 * Sonderfall im Markup.
 *
 * ⚠️ Die Bedingung `stufe < Originalbreite` MUSS dieselbe sein wie im
 * Build-Skript (kein Hochskalieren). Der erste Anlauf am 2026-07-31 las die
 * vorhandenen Stufen aus dem `srcset`-String zurück — und übersah, dass dort
 * auch das ORIGINAL mit seiner eigenen Breite steht. Bei einem 1200px breiten
 * Original stand da `… 1200w`, also wurde eine 1200er-Variante angeboten, die
 * das Skript nie erzeugt hatte: 13 tote Kandidaten, am gebauten `dist/`
 * gefunden. Deshalb hier die Breite direkt, nicht der Umweg über den String.
 *
 * KEINE 400er-Stufe. Die Hintergründe laufen mit `cover` über einen hohen,
 * schmalen Handybildschirm; bei einem querformatigen Original entscheidet dort
 * die HÖHE, und 400px Breite wären sichtbar unscharf. Die Stufe existiert für
 * die Slideshow, wo das Bild in seinem eigenen Rahmen sitzt.
 */
export function heroHintergrundVarianten(src: unknown): { w800?: string; w1200?: string } {
  if (typeof src !== 'string' || !hatVarianten(src) || !SRCSET_AKTIV) return {};
  const original = heroBreite(src);
  if (original <= 0) return {};

  return {
    w800: 800 < original ? variantSrc(src, 800) : undefined,
    w1200: 1200 < original ? variantSrc(src, 1200) : undefined,
  };
}

/**
 * Die CSS-Variablen aus den Varianten — fertig fürs `style`-Attribut.
 * Ausgelagert, weil beide Hero-Bauteile denselben String brauchen und ein
 * Tippfehler im Variablennamen still zum Original zurückfällt.
 */
export function heroHintergrundStyle(src: unknown): string {
  const { w800, w1200 } = heroHintergrundVarianten(src);
  return (
    (w800 ? `--hero-bg-800: url('${w800}'); ` : '') +
    (w1200 ? `--hero-bg-1200: url('${w1200}'); ` : '')
  );
}

/**
 * `sizes` für ein Hero-Bild.
 *
 * Der Hero ist auf schmalen Geräten die volle Breite; ab Tablet teilt er sich
 * die Zeile mit dem Text und belegt rund die Hälfte, gedeckelt durch den
 * 1100px-Container. Bewusst grob — siehe SLIDESHOW_SIZES.
 */
export const HERO_SIZES = '(max-width: 900px) 100vw, 550px';

/**
 * `sizes` für ein bildschirmfüllendes Hintergrundbild (`hero-bg`).
 *
 * Anders als das Titelbild liegt es unter dem gesamten Hero und ist auf JEDER
 * Breite volle Fensterbreite.
 */
export const HERO_BG_SIZES = '100vw';

/**
 * `sizes` für die Slideshow.
 *
 * Die Bühne ist auf schmalen Geräten ~volle Breite und wächst auf grossen
 * Displays nicht über ~1200px hinaus. Bewusst grob gehalten: eine zu genaue
 * Angabe wird beim nächsten Layout-Umbau falsch, ohne dass es jemand merkt.
 */
export const SLIDESHOW_SIZES = '(max-width: 640px) 100vw, (max-width: 1200px) 60vw, 700px';

/**
 * `sizes` für das Galerie-Mosaik.
 *
 * Andere Werte als in der Slideshow, weil das Mosaik ein anderes Bild
 * ausliefert: dort EINE Bühne von ~700px, hier Spalten. Mit `SLIDESHOW_SIZES`
 * lüde die Galerie für jede Kachel die grosse Variante – bei 230 Bildern auf
 * einer Seite ist das der teuerste Copy-Paste-Fehler, den man hier machen kann.
 *
 * Muss zu den Spaltenzahlen in `Gallery.astro` passen: bis 900px zwei Spalten
 * (~50vw), darüber drei. Der Container endet bei 1200px, eine Spalte ist dort
 * rund 390px breit.
 */
export const GALLERY_SIZES = '(max-width: 900px) 50vw, (max-width: 1240px) 33vw, 400px';
