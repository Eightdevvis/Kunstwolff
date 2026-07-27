// Byte-gleiche Slide-Duplikate auflösen.
//
// Warum es sie gibt: im Ordnermodell bestimmte der ABLAGEORT, auf welcher Seite
// ein Bild erscheint. Ein Motiv auf der Hochzeits- UND der Saarland-Seite ging
// deshalb nur als zweite, bytegleiche Datei. Seit Phase 5b entscheiden Tags –
// damit ist die Kopie überflüssig, und ihre Tags gehören auf das Original.
//
// Vorgehen je Gruppe:
//   1. Kanonische Datei wählen (die mit den meisten Verweisen; bei Gleichstand
//      die außerhalb von events/, weil Ortsordner die ältere Heimat sind).
//   2. Tags ALLER Kopien auf die kanonische Datei vereinigen – sonst verlöre
//      das Bild genau die Zuordnung, für die die Kopie angelegt wurde.
//   3. Alle Verweise in public/ auf die kanonische Datei umbiegen.
//   4. Kopie und ihren Metadaten-Eintrag entfernen.
//
//   node scripts/dissolve-slide-duplicates.mjs            # Trockenlauf
//   node scripts/dissolve-slide-duplicates.mjs --apply    # wirklich ändern

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const apply = process.argv.includes('--apply');

const publicRoot = path.resolve('./public');
const slidesRoot = path.join(publicRoot, 'img/slides');
const metaPath = path.join(slidesRoot, 'slides.meta.json');

const bildEndung = /\.(webp|avif|jpe?g|png)$/i;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    return e.isDirectory() ? walk(f) : bildEndung.test(e.name) ? [f] : [];
  });

/** Alle Textdateien unter public/, in denen Verweise stehen können. */
const textDateien = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) return textDateien(f);
    return /\.(json|md)$/i.test(e.name) ? [f] : [];
  });

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

// ── Gruppen bilden ──────────────────────────────────────────────────────────
const nachHash = new Map();
for (const f of walk(slidesRoot)) {
  const h = crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
  nachHash.set(h, [...(nachHash.get(h) ?? []), f]);
}
const gruppen = [...nachHash.values()].filter((v) => v.length > 1);

// ── Verweise zählen ─────────────────────────────────────────────────────────
const alleTexte = textDateien(publicRoot).map((f) => ({ f, inhalt: fs.readFileSync(f, 'utf-8') }));

const keyVon = (datei) => datei.replace(`${slidesRoot}/`, '');
const webPfad = (datei) => `/img/slides/${keyVon(datei)}`;

const verweiseAuf = (datei) => {
  const key = keyVon(datei);
  const web = webPfad(datei);
  return alleTexte.filter(({ inhalt }) => inhalt.includes(web) || inhalt.includes(key)).map((t) => t.f);
};

const tagsVon = (key) => {
  const t = meta[key]?.tags;
  return t && typeof t === 'object' ? t : {};
};

const vereinige = (a, b) => {
  const out = {};
  for (const dim of ['skills', 'events', 'landings']) {
    const liste = [...(a[dim] ?? []), ...(b[dim] ?? [])];
    if (liste.length > 0 || dim in a || dim in b) out[dim] = [...new Set(liste)];
  }
  return out;
};

let entfernt = 0;
let bytes = 0;
const aenderungen = new Map(); // Datei -> neuer Inhalt

console.log('─'.repeat(72));
console.log(apply ? 'Duplikate auflösen (ÄNDERND)' : 'Duplikate auflösen (Trockenlauf)');
console.log('─'.repeat(72));

for (const gruppe of gruppen) {
  const mitVerweisen = gruppe.map((f) => ({ f, refs: verweiseAuf(f) }));
  mitVerweisen.sort((a, b) => {
    const nachRefs = b.refs.length - a.refs.length;
    if (nachRefs !== 0) return nachRefs;
    // Bei Gleichstand: Ortsordner schlägt events/ (aeltere Heimat, mehr Kontext).
    const aEvent = keyVon(a.f).startsWith('events/') ? 1 : 0;
    const bEvent = keyVon(b.f).startsWith('events/') ? 1 : 0;
    return aEvent - bEvent;
  });

  const [behalten, ...weg] = mitVerweisen;
  const behaltenKey = keyVon(behalten.f);

  console.log(`\nbehalten:  ${behaltenKey}  (${behalten.refs.length} Verweise)`);

  for (const { f, refs } of weg) {
    const wegKey = keyVon(f);
    console.log(`  ersetzen: ${wegKey}  (${refs.length} Verweise)`);

    // Tags vereinigen – DAS ist der Punkt: die Kopie existierte nur wegen
    // ihrer Zuordnung, die darf beim Loeschen nicht mitverschwinden.
    const zusammen = vereinige(tagsVon(behaltenKey), tagsVon(wegKey));
    const vorher = JSON.stringify(tagsVon(behaltenKey));
    if (JSON.stringify(zusammen) !== vorher) {
      console.log(`     Tags:  ${vorher} → ${JSON.stringify(zusammen)}`);
    }
    if (apply) {
      meta[behaltenKey] = { ...(meta[behaltenKey] ?? {}), tags: zusammen };
      delete meta[wegKey];
    }

    // Verweise umbiegen
    for (const datei of refs) {
      const bisher = aenderungen.get(datei) ?? fs.readFileSync(datei, 'utf-8');
      const neu = bisher.split(webPfad(f)).join(webPfad(behalten.f)).split(wegKey).join(behaltenKey);
      if (neu !== bisher) {
        aenderungen.set(datei, neu);
        console.log(`     Verweis in ${path.relative(publicRoot, datei)}`);
      }
    }

    bytes += fs.statSync(f).size;
    entfernt++;
    if (apply) fs.unlinkSync(f);
  }
}

if (apply) {
  for (const [datei, inhalt] of aenderungen) fs.writeFileSync(datei, inhalt);
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
}

console.log(`\n${'─'.repeat(72)}`);
console.log(`Gruppen:            ${gruppen.length}`);
console.log(`Dateien entfernt:   ${entfernt}`);
console.log(`Eingespart:         ${(bytes / 1048576).toFixed(2)} MB`);
console.log(`Dateien angepasst:  ${aenderungen.size}`);
if (!apply) console.log('\nTrockenlauf – nichts geändert. Mit --apply ausführen.');
