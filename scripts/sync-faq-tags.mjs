// Ergänzt FAQs um den Tag-Block des Tag-Systems (Skill × Anlass × Ort).
//
// Ausgangslage am 2026-07-28 gemessen: von 71 FAQ-Dateien trug KEINE einzige
// einen Ort-Tag und nur eine einzige einen Skill-Tag. `matchesFAQContext`
// (src/utils/faq.ts) las also seit jeher Tags, die es nicht gab – die Auswahl
// lief zu 100 % über den Ablageort. Solange das so ist, kann das Ordner-Gate
// in FAQ.astro nicht weg, ohne dass die Seiten leerlaufen.
//
// Dieses Script ist das Gegenstück zu `sync-reviews-tags.mjs` und verhält sich
// bewusst identisch:
//
// - Der Block wird TEXTUELL vor das schliessende `---` eingefügt, statt die
//   Datei über gray-matter neu zu serialisieren. Sonst würde die Migration alle
//   71 Dateien umformatieren (Anführungszeichen, Reihenfolge, Zeilenumbrüche in
//   `answer`) – ein riesiger Diff ohne inhaltlichen Wert und ein unnötiges
//   Risiko für den Frontmatter-Parser des Admin-Tools, der eine eigene
//   Implementierung ist.
// - Vorhandene Tag-DIMENSIONEN werden NIE angefasst: was im Admin gesetzt wurde,
//   gilt (gleiche Haltung wie bei `priority` und bei den Bild-Tags). Auch ein
//   ausdrücklich leeres `landings: []` bleibt stehen – das ist eine Entscheidung
//   ("gilt überall"), keine Lücke.
//
//   Ergänzt werden seit 2026-08-01 aber Dimensionen, die im Block GAR NICHT
//   stehen. Vorher prüfte das Script nur, OB ein `tags:`-Block da ist. Ein halber
//   Block – wie ihn der Admin schreibt, wenn nur ein Skill gesetzt ist –
//   schaltete die Ergänzung damit dauerhaft ab: der Ordner-Tag kam nie nach, und
//   weil "Dimension fehlt = gilt überall" gilt, wanderte eine Stadt-FAQ still auf
//   alle Seiten. Aufgefallen an `faq/bw/wie-kann-ich-einen-event-karikaturisten-
//   buchen.md`, festgehalten von `tests/content-tags.test.ts`.
//
// Bewusst NICHT gemacht: Anlässe aus dem Fliesstext raten. Bei den Reviews tut
// das `eventsFromText`, weil dort der Anlass sonst NIRGENDS steht. Bei FAQs
// würde ein geratener Anlass eine allgemeine Frage stillschweigend zu einer
// Anlass-Frage machen – genau die Sorte unsichtbarer Automatik, die wir gerade
// abbauen. Anlässe vergibt Jenny im Admin über die Tag-Chips.

import fs from 'fs';
import path from 'path';
import {
  ergaenzeFehlendeDimensionen,
  normalizeTagList,
  slugifyTag,
  slugSet,
} from './tags.mjs';

const projectRoot = process.cwd();
const faqRoot = path.join(projectRoot, 'public', 'faq');
const tagsConfigPath = path.join(projectRoot, 'public', 'config', 'tags.json');

const knownLandings = (() => {
  try {
    return slugSet(JSON.parse(fs.readFileSync(tagsConfigPath, 'utf-8')).landings);
  } catch {
    return new Set();
  }
})();

const knownEvents = (() => {
  try {
    return slugSet(JSON.parse(fs.readFileSync(tagsConfigPath, 'utf-8')).events);
  } catch {
    return new Set();
  }
})();

const walk = (dir) => {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!entry.isFile() || !/\.md$/i.test(entry.name)) return [];
    return [full];
  });
};

/** Frontmatter-Block als {start, end, body} oder null, wenn keiner da ist. */
const findFrontmatter = (raw) => {
  if (!raw.startsWith('---')) return null;
  const firstBreak = raw.indexOf('\n');
  if (firstBreak === -1) return null;
  const closing = raw.indexOf('\n---', firstBreak);
  if (closing === -1) return null;
  return { start: firstBreak + 1, end: closing + 1, body: raw.slice(firstBreak + 1, closing + 1) };
};

/** Sehr schmaler Leser für die eine Liste, die wir brauchen (`categories`). */
const readListField = (fmBody, field) => {
  const lines = fmBody.split('\n');
  const out = [];
  let inField = false;
  for (const line of lines) {
    if (new RegExp(`^${field}\\s*:`).test(line)) {
      inField = true;
      const inline = line.slice(line.indexOf(':') + 1).trim();
      // Inline-Form `categories: [A, B]` mit abdecken.
      if (inline.startsWith('[')) {
        out.push(
          ...inline
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((s) => s.trim().replace(/^["']|["']$/g, '')),
        );
        inField = false;
      }
      continue;
    }
    if (!inField) continue;
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      out.push(item[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    if (line.trim() !== '') inField = false;
  }
  return out.filter(Boolean);
};

/**
 * Ort und Anlass aus dem Pfad unterhalb von public/faq/.
 *
 * `default/` bleibt ABSICHTLICH ohne Ort-Tag: eine allgemeine FAQ gehört nicht
 * zu einem Ort, sie gilt überall. Im neuen Auswahlmodell heisst genau das
 * "keine Ort-Tags" (src/utils/faq.ts, `getFAQsForContext`).
 */
const tagsFromPath = (filePath) => {
  const segments = path.relative(faqRoot, filePath).split(path.sep);
  if (segments.length < 2) return { landings: [], events: [] };

  const erstes = slugifyTag(segments[0] ?? '');
  if (!erstes || erstes === 'default') return { landings: [], events: [] };

  // events/<slug>/… – gleiche Konvention wie bei den Bildern.
  if (erstes === 'events' && segments.length > 2) {
    const slug = slugifyTag(segments[1] ?? '');
    if (!slug) return { landings: [], events: [] };
    if (knownEvents.size > 0 && !knownEvents.has(slug)) return { landings: [], events: [] };
    return { landings: [], events: [slug] };
  }

  if (knownLandings.size > 0 && !knownLandings.has(erstes)) return { landings: [], events: [] };
  return { landings: [erstes], events: [] };
};

const renderTagsBlock = (tags) => {
  const lines = ['tags:'];
  for (const dim of ['skills', 'events', 'landings']) {
    const values = tags[dim];
    if (values.length === 0) {
      lines.push(`  ${dim}: []`);
      continue;
    }
    lines.push(`  ${dim}:`);
    for (const value of values) lines.push(`    - ${value}`);
  }
  return `${lines.join('\n')}\n`;
};

const files = walk(faqRoot);
let touched = 0;
let ergaenzt = 0;
let skipped = 0;

for (const filePath of files) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const fm = findFrontmatter(raw);
  if (!fm) {
    console.warn(
      `sync-faq-tags: Warnung - kein Frontmatter, übersprungen: ${path.relative(projectRoot, filePath)}`,
    );
    continue;
  }

  const ausPfad = tagsFromPath(filePath);
  const tags = {
    skills: normalizeTagList(readListField(fm.body, 'categories')),
    events: ausPfad.events,
    landings: ausPfad.landings,
  };

  // Block vorhanden → nur die Dimensionen nachtragen, die gar nicht drinstehen.
  if (/^tags\s*:/m.test(fm.body)) {
    const neuerBody = ergaenzeFehlendeDimensionen(fm.body, tags);
    if (!neuerBody) {
      skipped += 1;
      continue;
    }
    fs.writeFileSync(filePath, raw.slice(0, fm.start) + neuerBody + raw.slice(fm.end), 'utf-8');
    console.log(
      `sync-faq-tags: fehlende Dimension ergänzt in ${path.relative(projectRoot, filePath)}`,
    );
    ergaenzt += 1;
    continue;
  }

  const next = raw.slice(0, fm.end) + renderTagsBlock(tags) + raw.slice(fm.end);
  fs.writeFileSync(filePath, next, 'utf-8');
  touched += 1;
}

const teile = [];
if (touched > 0) teile.push(`${touched} FAQs um Tags ergänzt`);
if (ergaenzt > 0) teile.push(`${ergaenzt} um fehlende Dimensionen ergänzt`);
if (teile.length === 0) {
  console.log(`sync-faq-tags: Alles bereits vorhanden (${skipped} FAQs).`);
} else {
  console.log(`sync-faq-tags: ${teile.join(', ')}, ${skipped} bereits vollständig.`);
}
