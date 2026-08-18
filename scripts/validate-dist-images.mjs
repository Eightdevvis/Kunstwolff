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
 *   npm run build && npm run validate:dist
 *
 * Beendet sich mit Code 1, wenn etwas fehlt — damit taugt es für CI.
 */
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error(`${DIST}/ gibt es nicht – erst "npm run build" laufen lassen.`);
  process.exit(1);
}

function htmlDateien(dir, treffer = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlDateien(p, treffer);
    else if (p.endsWith('.html')) treffer.push(p);
  }
  return treffer;
}

const seiten = htmlDateien(DIST);
const verweise = new Map(); // URL -> Set(Seiten)

const merke = (url, seite) => {
  if (!url || !url.startsWith('/')) return;
  const sauber = url.split('?')[0].split('#')[0];
  if (!/\.(webp|avif|png|jpe?g|gif|svg)$/i.test(sauber)) return;
  if (!verweise.has(sauber)) verweise.set(sauber, new Set());
  verweise.get(sauber).add(seite.slice(DIST.length));
};

for (const seite of seiten) {
  const html = readFileSync(seite, 'utf8');

  for (const m of html.matchAll(/\ssrc="([^"]+)"/g)) merke(m[1], seite);
  // Jede Stufe einzeln – der fehlende Kandidat ist der gefährliche Fall.
  for (const m of html.matchAll(/\ssrcset="([^"]+)"/g)) {
    for (const kandidat of m[1].split(',')) merke(kandidat.trim().split(/\s+/)[0], seite);
  }
  // Hero-Hintergründe kommen als CSS-Variablen im style-Attribut.
  for (const m of html.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) merke(m[1], seite);
  // Lightbox-Links zeigen auf das Originalbild.
  for (const m of html.matchAll(/\shref="([^"]+\.(?:webp|avif|png|jpe?g|gif))"/gi)) merke(m[1], seite);
}

const fehlend = [];
for (const [url, seitenMenge] of verweise) {
  if (!existsSync(join(DIST, decodeURIComponent(url)))) {
    fehlend.push({ url, beispiele: [...seitenMenge].slice(0, 3), gesamt: seitenMenge.size });
  }
}

console.log(
  `validate-dist: ${seiten.length} Seiten, ${verweise.size} eindeutige Bild-URLs geprüft.`
);

if (fehlend.length === 0) {
  console.log('validate-dist: alle Bild-Adressen im gebauten Ergebnis gültig ✓');
  process.exit(0);
}

console.error(`\nvalidate-dist: ${fehlend.length} tote Adresse(n)!\n`);
for (const f of fehlend.slice(0, 25)) {
  console.error(`FEHLT  ${f.url}`);
  console.error(`       auf ${f.gesamt} Seite(n), z.B. ${f.beispiele.join(', ')}`);
}
if (fehlend.length > 25) console.error(`... und ${fehlend.length - 25} weitere`);
process.exit(1);
