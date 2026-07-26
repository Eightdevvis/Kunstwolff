// Erzeugt/pflegt `public/config/tags.json` – das Vokabular für Skill × Anlass × Ort.
//
// Gespeist wird es automatisch aus den Quellen, die es ohnehin schon gibt:
//   skills.json   → Dimension `skills`
//   events.json   → Dimension `anlaesse` (die vier Event-Slugs)
//   landings.md   → Dimension `orte`
// Dazu die Anlässe aus EXTRA_ANLAESSE, die in den Inhalten vorkommen, aber
// (noch) keine eigene Seite haben.
//
// Jenny kann im Admin eigene Tags anlegen; die tragen `source: "custom"` und
// werden hier NIE angefasst. Auch geseedete Einträge werden nie entfernt –
// siehe mergeVocabulary() in tags.mjs für die Begründung.

import fs from 'fs';
import path from 'path';
import { EXTRA_ANLAESSE, mergeVocabulary, slugifyTag } from './tags.mjs';

const projectRoot = process.cwd();
const configDir = path.join(projectRoot, 'public', 'config');
const tagsPath = path.join(configDir, 'tags.json');
const skillsJsonPath = path.join(projectRoot, 'public', 'skills', 'skills.json');
const eventsJsonPath = path.join(projectRoot, 'public', 'events', 'events.json');
const landingsMdPath = path.join(projectRoot, 'public', 'landings', 'landings.md');

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.warn(`sync-tags: Warnung - ${path.relative(projectRoot, filePath)} nicht lesbar (${err.message}).`);
    return null;
  }
};

const readSkillLabels = () => {
  const parsed = readJson(skillsJsonPath);
  const list = Array.isArray(parsed?.skills) ? parsed.skills : [];
  return list.map((s) => (typeof s?.title === 'string' ? s.title : '')).filter(Boolean);
};

const readEventLabels = () => {
  const parsed = readJson(eventsJsonPath);
  const list = Array.isArray(parsed?.events) ? parsed.events : [];
  // Titel als Label, Slug als Identität – der Slug muss der Event-Seite
  // entsprechen, damit eine Seite ihre Bilder per Tag findet.
  return list
    .map((e) => ({ label: typeof e?.title === 'string' && e.title ? e.title : e?.slug, slug: e?.slug }))
    .filter((e) => e.slug)
    .map((e) => e.label);
};

const readCityLabels = () => {
  if (!fs.existsSync(landingsMdPath)) return [];
  return fs
    .readFileSync(landingsMdPath, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
    .filter((line) => !line.includes(':')); // Frontmatter-Zeilen überspringen
};

const existing = readJson(tagsPath) ?? {};

const next = {
  skills: mergeVocabulary(existing.skills, readSkillLabels(), 'skills.json'),
  anlaesse: mergeVocabulary(
    existing.anlaesse,
    [
      ...readEventLabels().map((label) => ({ label, source: 'events.json' })),
      // Herkunft getrennt halten: diese stammen NICHT aus events.json, es gibt
      // für sie (noch) keine Seite. Wer später aufräumt, muss das unterscheiden
      // können.
      ...EXTRA_ANLAESSE.map((label) => ({ label, source: 'extra' })),
    ],
    'extra'
  ),
  orte: mergeVocabulary(existing.orte, readCityLabels(), 'landings.md'),
};

// Event-Slugs müssen zeichengleich mit den Seiten-Slugs sein, sonst findet eine
// Event-Seite ihre getaggten Bilder nicht. Das ist die eine Stelle, an der ein
// abweichendes Label echten Schaden anrichtet – deshalb hier ein harter Check.
const eventSlugs = (readJson(eventsJsonPath)?.events ?? []).map((e) => e?.slug).filter(Boolean);
const anlassSlugs = new Set(next.anlaesse.map((a) => a.slug));
const missing = eventSlugs.filter((s) => !anlassSlugs.has(slugifyTag(s)));
if (missing.length > 0) {
  console.error(`sync-tags: FEHLER - Event-Slugs ohne passenden Anlass-Tag: ${missing.join(', ')}`);
  process.exit(1);
}

const before = fs.existsSync(tagsPath) ? fs.readFileSync(tagsPath, 'utf-8') : '';
const serialized = `${JSON.stringify(next, null, 2)}\n`;

if (before === serialized) {
  console.log('sync-tags: Alles bereits vorhanden.');
} else {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(tagsPath, serialized, 'utf-8');
  const counts = `${next.skills.length} Skills, ${next.anlaesse.length} Anlässe, ${next.orte.length} Orte`;
  console.log(`sync-tags: ${before ? 'aktualisiert' : 'angelegt'} - ${counts}.`);
}
