/**
 * Prüft das GEBAUTE `dist/`: zeigt irgendeine Bild-URL auf eine Datei, die es
 * dort nicht gibt?
 *
 * ## Warum zusätzlich zu `validate:images`
 *
 * `validate-image-refs.mjs` liest die QUELLEN (`public/`, `src/`, …) und findet
 * damit tote Verweise, die jemand von Hand geschrieben hat. Es kann aber
 * naturgemäss nicht sehen, was der Build daraus macht — und genau dort sass der
 * teuerste Fehler dieses Projekts:
 *
 * Ein `srcset`-Kandidat, den es nicht gibt, lässt das Bild **leer**. Der
 * Browser versucht es NICHT noch einmal mit einer anderen Stufe. Am 2026-07-28
 * fehlten die Varianten in der Produktion komplett (der Erzeugungsschritt lief
 * nicht), am 2026-07-31 waren es 13 tote Kandidaten, weil die Bedingung
 * „Stufe < Originalbreite" an zwei Stellen auseinandergelaufen war. Beides war
 * an den Quellen nicht zu sehen, nur am gebauten Ergebnis.
 *
 * Geprüft wird deshalb JEDE Adresse im fertigen HTML: `src`, jede einzelne
 * Stufe in `srcset`, jedes `url(...)` aus den Hintergrund-Variablen und die
 * `href` der Lightbox-Links.
 *
 * ## Benutzung
 *
 * Läuft seit 2026-11-20 AUTOMATISCH am Ende jedes Builds (Astro-Integration in
 * `astro.config.mjs`, nach den Bildvarianten) und lässt den Build scheitern,
 * wenn etwas fehlt – damit geht ein kaputter Build auf Vercel nicht live.
 * Bewusst kein npm-`postbuild`: Vercel führt seinen eigenen Astro-Build aus,
 * npm-Ketten um den Build herum laufen dort nicht zuverlässig
 * (`memory/responsive-images.md`). Von Hand: `npm run validate:dist`
 * (Code 1, wenn etwas fehlt).
 */
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function htmlDateien(dir, treffer = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlDateien(p, treffer);
    else if (p.endsWith('.html')) treffer.push(p);
  }
  return treffer;
}

/**
 * Prüft alle Bild-Adressen im gebauten HTML unter `dist`.
 * @param {string} [dist]
 * @returns {{ seiten: number, urls: number, fehlend: { url: string, beispiele: string[], gesamt: number }[] }}
 */
export function validateDist(dist = 'dist') {
  if (!existsSync(dist)) {
    throw new Error(`${dist}/ gibt es nicht – erst "npm run build" laufen lassen.`);
  }

  const seiten = htmlDateien(dist);
  const verweise = new Map(); // URL -> Set(Seiten)

  const merke = (url, seite) => {
    if (!url || !url.startsWith('/')) return;
    const sauber = url.split('?')[0].split('#')[0];
    if (!/\.(webp|avif|png|jpe?g|gif|svg)$/i.test(sauber)) return;
    if (!verweise.has(sauber)) verweise.set(sauber, new Set());
    verweise.get(sauber).add(seite.slice(dist.length));
  };

  for (const seite of seiten) {
    const html = readFileSync(seite, 'utf8');

    // `data-src`/`data-srcset`: die Slideshow-Bilder tragen ihre Adresse bis zum
    // Vorladen nur dort (siehe src/scripts/slideVorladen.ts).
    for (const m of html.matchAll(/\s(?:data-)?src="([^"]+)"/g)) merke(m[1], seite);
    // Jede Stufe einzeln – der fehlende Kandidat ist der gefährliche Fall.
    for (const m of html.matchAll(/\s(?:data-)?srcset="([^"]+)"/g)) {
      for (const kandidat of m[1].split(',')) merke(kandidat.trim().split(/\s+/)[0], seite);
    }
    // Hero-Hintergründe kommen als CSS-Variablen im style-Attribut.
    for (const m of html.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) merke(m[1], seite);
    // Lightbox-Links zeigen auf das Originalbild.
    for (const m of html.matchAll(/\shref="([^"]+\.(?:webp|avif|png|jpe?g|gif))"/gi)) merke(m[1], seite);
  }

  const fehlend = [];
  for (const [url, seitenMenge] of verweise) {
    if (!existsSync(join(dist, decodeURIComponent(url)))) {
      fehlend.push({ url, beispiele: [...seitenMenge].slice(0, 3), gesamt: seitenMenge.size });
    }
  }

  return { seiten: seiten.length, urls: verweise.size, fehlend };
}

/**
 * Ergebnis ausgeben. Gibt `true` zurück, wenn alles gültig ist.
 * @param {ReturnType<typeof validateDist>} ergebnis
 */
export function reportDist({ seiten, urls, fehlend }) {
  console.log(`validate-dist: ${seiten} Seiten, ${urls} eindeutige Bild-URLs geprüft.`);

  if (fehlend.length === 0) {
    console.log('validate-dist: alle Bild-Adressen im gebauten Ergebnis gültig ✓');
    return true;
  }

  console.error(`\nvalidate-dist: ${fehlend.length} tote Adresse(n)!\n`);
  for (const f of fehlend.slice(0, 25)) {
    console.error(`FEHLT  ${f.url}`);
    console.error(`       auf ${f.gesamt} Seite(n), z.B. ${f.beispiele.join(', ')}`);
  }
  if (fehlend.length > 25) console.error(`... und ${fehlend.length - 25} weitere`);
  return false;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(reportDist(validateDist('dist')) ? 0 : 1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
