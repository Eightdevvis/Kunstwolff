// Paritäts-Prüfung: Ordner-Modell vs. Tag-Abfrage.
//
// Vor der Umstellung des Renderings muss bewiesen sein, dass die Tag-Abfrage
// für JEDE Seite mindestens das liefert, was heute der Ordner liefert. Ohne
// diesen Nachweis wäre der Wechsel ein Blindflug: eine fehlende Zuordnung
// zeigt sich sonst erst als leere Sektion auf der Live-Website.
//
// Bewusst kein Test, sondern ein Bericht – die Zahl der Abweichungen sinkt
// über mehrere Durchgänge, und man will dabei SEHEN, was noch fehlt.
//
//   node scripts/tag-parity-check.mjs           # Zusammenfassung
//   node scripts/tag-parity-check.mjs --details # jede Abweichung einzeln

import fs from 'node:fs';
import path from 'node:path';

const details = process.argv.includes('--details');

const slidesRoot = path.resolve('./public/img/slides');
const metaPath = path.join(slidesRoot, 'slides.meta.json');

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

const landings = fs
  .readFileSync(path.resolve('./public/landings/landings.md'), 'utf-8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const events = JSON.parse(fs.readFileSync(path.resolve('./public/events/events.json'), 'utf-8'));
const eventSlugs = (Array.isArray(events) ? events : events.events ?? []).map((e) => e.slug);

const bildEndung = /\.(avif|gif|jpe?g|png|webp)$/i;

/** Dateien EINES Ordners – entspricht readFolderSlides (nicht rekursiv). */
const ordnerDateien = (ordnerName) => {
  const p = path.join(slidesRoot, ordnerName);
  if (!fs.existsSync(p)) return [];
  return fs
    .readdirSync(p, { withFileTypes: true })
    .filter((e) => e.isFile() && bildEndung.test(e.name))
    .map((e) => `${ordnerName}/${e.name}`)
    .filter((key) => meta[key]?.enabled !== false);
};

/** Alle Slides mit Tag X – unabhängig vom Ordner. */
const mitTag = (dimension, slug) =>
  Object.entries(meta)
    .filter(([, v]) => v?.enabled !== false)
    .filter(([, v]) => Array.isArray(v?.tags?.[dimension]) && v.tags[dimension].includes(slug))
    .map(([k]) => k);

const berichte = [];
let fehlendGesamt = 0;
let zusatzGesamt = 0;

const pruefe = (bezeichnung, ordnerKeys, tagKeys) => {
  const ordnerSet = new Set(ordnerKeys);
  const tagSet = new Set(tagKeys);
  // Kritisch: was der Ordner heute zeigt, die Tag-Abfrage aber NICHT fände.
  const fehlend = ordnerKeys.filter((k) => !tagSet.has(k));
  // Unkritisch, aber interessant: was durch Tags NEU dazukäme.
  const zusatz = tagKeys.filter((k) => !ordnerSet.has(k));
  fehlendGesamt += fehlend.length;
  zusatzGesamt += zusatz.length;
  berichte.push({ bezeichnung, ordner: ordnerKeys.length, tag: tagKeys.length, fehlend, zusatz });
};

for (const ort of landings) {
  pruefe(`Ort ${ort}`, ordnerDateien(ort), mitTag('landings', ort));
}
for (const anlass of eventSlugs) {
  pruefe(`Anlass ${anlass}`, ordnerDateien(`events/${anlass}`), mitTag('events', anlass));
}

console.log('─'.repeat(72));
console.log('Paritäts-Prüfung: Ordner-Modell vs. Tag-Abfrage');
console.log('─'.repeat(72));

const kaputt = berichte.filter((b) => b.fehlend.length > 0);
for (const b of berichte) {
  const marke = b.fehlend.length === 0 ? '✓' : '✗';
  const zeile = `${marke} ${b.bezeichnung.padEnd(34)} Ordner ${String(b.ordner).padStart(3)} → Tags ${String(b.tag).padStart(3)}`;
  const anhang = b.fehlend.length ? `   FEHLEN: ${b.fehlend.length}` : '';
  if (details || b.fehlend.length) console.log(zeile + anhang);
  if (details && b.fehlend.length) for (const k of b.fehlend) console.log(`      − ${k}`);
}

console.log('─'.repeat(72));
console.log(`Seiten geprüft:            ${berichte.length}`);
console.log(`Seiten mit Lücke:          ${kaputt.length}`);
console.log(`Bilder, die verschwänden:  ${fehlendGesamt}`);
console.log(`Bilder, die dazukämen:     ${zusatzGesamt}`);
console.log('─'.repeat(72));

if (fehlendGesamt > 0) {
  console.log('\nNOCH NICHT umstellen: die Tag-Abfrage liefert weniger als der Ordner.');
  process.exitCode = 1;
} else {
  console.log('\nParität erreicht – die Umstellung verliert kein einziges Bild.');
}
