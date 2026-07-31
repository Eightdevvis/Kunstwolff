// Ergänzt Reviews um den Tag-Block des Tag-Systems (Skill × Anlass × Ort).
//
// Reviews trugen bisher zwei der drei Dimensionen implizit: `categories` im
// Frontmatter (= Skill) und den Ordner (= Ort). Der Anlass fehlte ganz. Damit
// liessen sie sich nicht nach denselben Regeln einsortieren wie FAQs, die den
// Block `tags: { skills, events, landings }` seit jeher tragen
// (src/utils/faq.ts).
//
// Der Block wird TEXTUELL vor das schliessende `---` eingefügt, statt die Datei
// über gray-matter neu zu serialisieren. Sonst würde die Migration alle 73
// Dateien umformatieren (Anführungszeichen, Reihenfolge) – ein riesiger Diff
// ohne inhaltlichen Wert, und ein unnötiges Risiko für den Frontmatter-Parser
// des Admin-Tools, der eine eigene Implementierung ist.
//
// Vorhandene `tags:`-Blöcke werden NIE angefasst: was im Admin gesetzt wurde,
// gilt (gleiche Haltung wie bei `priority` und bei den Bild-Tags).

import fs from 'fs';
import path from 'path';
import { EVENT_KEYWORDS, normalizeTagList, slugifyTag, slugSet } from './tags.mjs';

const projectRoot = process.cwd();
const reviewsRoot = path.join(projectRoot, 'public', 'reviews');
const tagsConfigPath = path.join(projectRoot, 'public', 'config', 'tags.json');

const TEMPLATE_NAMES = new Set(['_vorlage.md', 'vorlage.md']);

const knownLandings = (() => {
  try {
    return slugSet(JSON.parse(fs.readFileSync(tagsConfigPath, 'utf-8')).landings);
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
    if (TEMPLATE_NAMES.has(entry.name.toLowerCase())) return [];
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
        out.push(...inline.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')));
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

/** Ort aus dem Ordner unterhalb von public/reviews/. */
const landingFromPath = (filePath) => {
  const rel = path.relative(reviewsRoot, filePath).split(path.sep);
  const slug = slugifyTag(rel[0] ?? '');
  if (!slug || slug === 'default') return [];
  if (knownLandings.size > 0 && !knownLandings.has(slug)) return [];
  return [slug];
};

/**
 * Anlass aus Text und Autor ableiten. Bei Bildern liefert der Dateiname die
 * Stichwörter, hier der Fliesstext – dieselbe Keyword-Tabelle, damit beide
 * Inhaltsarten dieselben Anlässe erkennen.
 */
const eventsFromText = (text) => {
  const haystack = `-${String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}-`;
  const found = [];
  // Wortgrenze statt Substring – sonst macht "Wir haben die Wirkung gemessen"
  // aus einer Bewertung eine Messe-Bewertung. Der Heuhaufen ist oben bereits
  // mit Bindestrichen eingefasst.
  for (const [slug, keywords] of Object.entries(EVENT_KEYWORDS)) {
    if (keywords.some((kw) => haystack.includes(`-${kw}`))) found.push(slug);
  }
  return normalizeTagList(found);
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

const files = walk(reviewsRoot);
let touched = 0;
let skipped = 0;

for (const filePath of files) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const fm = findFrontmatter(raw);
  if (!fm) {
    console.warn(`sync-reviews-tags: Warnung - kein Frontmatter, übersprungen: ${path.relative(projectRoot, filePath)}`);
    continue;
  }
  if (/^tags\s*:/m.test(fm.body)) {
    skipped += 1;
    continue;
  }

  const body = raw.slice(fm.end + 4); // hinter dem schliessenden ---
  const tags = {
    skills: normalizeTagList(readListField(fm.body, 'categories')),
    events: eventsFromText(body),
    landings: landingFromPath(filePath),
  };

  const next = raw.slice(0, fm.end) + renderTagsBlock(tags) + raw.slice(fm.end);
  fs.writeFileSync(filePath, next, 'utf-8');
  touched += 1;
}

if (touched === 0) {
  console.log(`sync-reviews-tags: Alles bereits vorhanden (${skipped} Reviews).`);
} else {
  console.log(`sync-reviews-tags: ${touched} Reviews um Tags ergänzt, ${skipped} bereits vorhanden.`);
}
