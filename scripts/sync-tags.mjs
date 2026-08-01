// Erzeugt/pflegt `public/config/tags.json` – das Vokabular für Skill × Anlass × Ort.
//
// Gespeist wird es automatisch aus den Quellen, die es ohnehin schon gibt:
//   skills.json   → Dimension `skills`
//   events.json   → Dimension `events` (die vier Event-Slugs)
//   landings.md   → Dimension `landings`
// Dazu die Anlässe aus EXTRA_EVENTS, die in den Inhalten vorkommen, aber
// (noch) keine eigene Seite haben.
//
// Jenny kann im Admin eigene Tags anlegen; die tragen `source: "custom"` und
// werden hier NIE angefasst. Auch geseedete Einträge werden nie entfernt –
// siehe mergeVocabulary() in tags.mjs für die Begründung.

import fs from 'fs';
import path from 'path';
import { EXTRA_EVENTS, mergeVocabulary, slugifyTag } from './tags.mjs';

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
  events: mergeVocabulary(
    existing.events,
    [
      ...readEventLabels().map((label) => ({ label, source: 'events.json' })),
      // Herkunft getrennt halten: diese stammen NICHT aus events.json, es gibt
      // für sie (noch) keine Seite. Wer später aufräumt, muss das unterscheiden
      // können.
      ...EXTRA_EVENTS.map((label) => ({ label, source: 'extra' })),
    ],
    'extra'
  ),
  landings: mergeVocabulary(existing.landings, readCityLabels(), 'landings.md'),
};

// Event-Slugs müssen zeichengleich mit den Seiten-Slugs sein, sonst findet eine
// Event-Seite ihre getaggten Bilder nicht. Das ist die eine Stelle, an der ein
// abweichendes Label echten Schaden anrichtet – deshalb hier ein harter Check.
const eventSlugs = (readJson(eventsJsonPath)?.events ?? []).map((e) => e?.slug).filter(Boolean);
const anlassSlugs = new Set(next.events.map((a) => a.slug));
const missing = eventSlugs.filter((s) => !anlassSlugs.has(slugifyTag(s)));
if (missing.length > 0) {
  console.error(`sync-tags: FEHLER - Event-Slugs ohne passenden Anlass-Tag: ${missing.join(', ')}`);
  process.exit(1);
}

// Verwaiste Seed-Einträge melden.
//
// Das Vokabular wächst nur (siehe mergeVocabulary) – wer eine Stadt aus
// landings.md streicht, wird sie in tags.json NICHT los. Der Eintrag bleibt im
// Admin auswählbar, behauptet weiter `source: "landings.md"` und taggt Bilder
// auf eine Seite, die es nicht mehr gibt. Genau so überlebte
// `schnellzeichner-duesseldorf` seine eigene Löschung um zwei Tage.
//
// Automatisch entfernen wäre falsch: an so einem Slug hängen Ordner, Bilder,
// Reviews und Tags, die jemand erst umziehen muss. Deshalb nur ein Hinweis –
// laut, mit Namen und mit dem nächsten Schritt.
const seedSlugsJeDimension = {
  skills: new Set(readSkillLabels().map(slugifyTag)),
  events: new Set([...readEventLabels(), ...EXTRA_EVENTS].map(slugifyTag)),
  landings: new Set(readCityLabels().map(slugifyTag)),
};
const quelleJeDimension = { skills: 'skills.json', events: 'events.json', landings: 'landings.md' };

for (const [dim, quelle] of Object.entries(quelleJeDimension)) {
  for (const e of next[dim]) {
    if (e.source !== quelle || seedSlugsJeDimension[dim].has(e.slug)) continue;
    console.warn(
      `sync-tags: HINWEIS - "${e.slug}" steht in tags.json unter ${dim} mit source "${quelle}", ` +
        `kommt in ${quelle} aber nicht mehr vor. Entweder dort wieder eintragen oder den Eintrag ` +
        `aus public/config/tags.json entfernen - samt allem, was daran haengt ` +
        `(grep -rIl "${e.slug}" public src).`
    );
  }
}

const before = fs.existsSync(tagsPath) ? fs.readFileSync(tagsPath, 'utf-8') : '';
const serialized = `${JSON.stringify(next, null, 2)}\n`;

if (before === serialized) {
  console.log('sync-tags: Alles bereits vorhanden.');
} else {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(tagsPath, serialized, 'utf-8');
  const counts = `${next.skills.length} Skills, ${next.events.length} Anlässe, ${next.landings.length} Orte`;
  console.log(`sync-tags: ${before ? 'aktualisiert' : 'angelegt'} - ${counts}.`);
}
