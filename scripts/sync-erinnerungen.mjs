/**
 * sync-erinnerungen.mjs
 *
 * Stellt sicher, dass für jede Stadt und jeden Skill eine Erinnerungen-JSON existiert.
 * Bestehende Dateien werden NICHT überschrieben – nur fehlende werden neu angelegt.
 *
 * Angelegt werden:
 *   - public/erinnerungen/default.json  (falls nicht vorhanden)
 *   - public/erinnerungen/{stadt}.json  (für jede Stadt aus landings.md)
 *   - public/erinnerungen/{skill}.json  (für jeden Skill aus skills.json)
 *
 * Die Stadtdateien werden mit den Daten aus default.json befüllt.
 * Das Admin-Tool kann die Dateien später direkt überschreiben.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// ── Pfade ────────────────────────────────────────────────────────────────────

const projectRoot = process.cwd();
const erinnerungenRoot = path.join(projectRoot, 'public', 'erinnerungen');
const defaultFile = path.join(erinnerungenRoot, 'default.json');
const landingsRoot = path.join(projectRoot, 'public', 'landings');
const landingsMdPath = path.join(landingsRoot, 'landings.md');
const landingsJsonPath = path.join(landingsRoot, 'landings.json');
const skillsJsonPath = path.join(projectRoot, 'public', 'skills', 'skills.json');

// ── Hilfsfunktionen (gleiche Logik wie in sync-why.mjs) ──────────────────────

/** Deutsche Umlaute transliterieren */
const transliterateGerman = (value) =>
  String(value)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');

/** Slug normalisieren (lowercase, keine Sonderzeichen) */
const normalizeSlug = (value) =>
  transliterateGerman(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Liste deduplizieren und sortieren */
const normalizeList = (items) => {
  const unique = new Set();
  for (const item of items) {
    if (typeof item !== 'string') continue;
    const slug = normalizeSlug(item);
    if (!slug || slug === 'default') continue;
    unique.add(slug);
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

/** Landings aus Markdown-Body lesen (eine Stadt pro Zeile) */
const readLandingsFromBodyLines = (content) =>
  normalizeList(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && !line.startsWith('---'))
      .map((line) => (line.startsWith('- ') || line.startsWith('* ') ? line.slice(2).trim() : line)),
  );

/** Landings aus landings.md lesen */
const readLandingsFromMarkdown = () => {
  if (!fs.existsSync(landingsMdPath)) return [];
  const raw = fs.readFileSync(landingsMdPath, 'utf-8');
  try {
    const parsed = matter(raw);
    const fromFrontmatter = parsed.data?.cities ?? parsed.data?.landings;
    if (Array.isArray(fromFrontmatter)) return normalizeList(fromFrontmatter);
    return readLandingsFromBodyLines(parsed.content);
  } catch {
    return readLandingsFromBodyLines(raw);
  }
};

/** Landings aus landings.json lesen (Fallback) */
const readLandingsFromJson = () => {
  if (!fs.existsSync(landingsJsonPath)) return [];
  try {
    const raw = fs.readFileSync(landingsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return normalizeList(parsed);
    const values = parsed?.cities ?? parsed?.landings;
    if (Array.isArray(values)) return normalizeList(values);
  } catch { /* ignore */ }
  return [];
};

/** Skills aus skills.json lesen */
const readSkills = () => {
  if (!fs.existsSync(skillsJsonPath)) return [];
  try {
    const raw = fs.readFileSync(skillsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const skills = Array.isArray(parsed?.skills) ? parsed.skills : [];
    return normalizeList(
      skills
        .map((entry) => (typeof entry?.title === 'string' ? entry.title : ''))
        .filter((value) => value.length > 0),
    );
  } catch { return []; }
};

// ── Fallback-Default (wird nur genutzt wenn default.json nicht existiert) ────

const fallbackDefault = {
  photos: [
    {
      image: '/img/slides/default/1_schnellzeichner_hq.webp',
      alt: 'Schnellzeichner bei einem Live-Event – Erinnerung an einen besonderen Abend',
    },
    {
      image: '/img/slides/default/2_karikatur_stadtfest.webp',
      alt: 'Karikatur-Zeichnung als Andenken an ein Stadtfest',
    },
    {
      image: '/img/slides/default/3_schnellzeichner-schweiz.webp',
      alt: 'Live-Schnellzeichner sorgt für Staunen bei den Gästen',
    },
    {
      image: '/img/slides/default/4_Hochzeit_schnellzeichner_maler.webp',
      alt: 'Schnellzeichner und Maler auf einer Hochzeitsfeier',
    },
  ],
};

// ── Hauptlogik ───────────────────────────────────────────────────────────────

// Verzeichnis sicherstellen
fs.mkdirSync(erinnerungenRoot, { recursive: true });

const created = [];

// Default-Datei anlegen falls nicht vorhanden
if (!fs.existsSync(defaultFile)) {
  fs.writeFileSync(defaultFile, `${JSON.stringify(fallbackDefault, null, 2)}\n`);
  created.push(`+ ${path.relative(projectRoot, defaultFile)}`);
}

// Default-Daten lesen (für Kopien)
let defaultData;
try {
  const raw = fs.readFileSync(defaultFile, 'utf-8');
  defaultData = JSON.parse(raw);
  if (!Array.isArray(defaultData?.photos)) {
    defaultData = fallbackDefault;
  }
} catch {
  defaultData = fallbackDefault;
}

/**
 * Legt eine Erinnerungen-JSON für einen bestimmten Key an,
 * WENN sie noch nicht existiert. Bestehende werden nie überschrieben.
 */
const ensureErinnerungenFile = (key) => {
  const targetFile = path.join(erinnerungenRoot, `${key}.json`);
  if (fs.existsSync(targetFile)) return;

  // Kopie der Default-Daten – Admin-Tool kann sie später stadtspezifisch überschreiben
  fs.writeFileSync(targetFile, `${JSON.stringify(defaultData, null, 2)}\n`);
  created.push(`+ ${path.relative(projectRoot, targetFile)}`);
};

// Alle Städte aus landings.md / landings.json
const landingSlugs = (() => {
  const fromMd = readLandingsFromMarkdown();
  if (fromMd.length > 0) return fromMd;
  return readLandingsFromJson();
})();

// Alle Skills aus skills.json
const skillSlugs = readSkills();

// Pro Stadt eine JSON anlegen
for (const landing of landingSlugs) {
  ensureErinnerungenFile(landing);
}

// Pro Skill eine JSON anlegen
for (const skill of skillSlugs) {
  ensureErinnerungenFile(skill);
}

// ── Ausgabe ──────────────────────────────────────────────────────────────────

if (created.length > 0) {
  console.log('sync-erinnerungen: Neue Dateien angelegt:');
  for (const line of created) {
    console.log(line);
  }
} else {
  console.log('sync-erinnerungen: Alles bereits vorhanden.');
}
