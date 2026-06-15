#!/usr/bin/env node
/**
 * Einmalige (idempotente) Migration der Slide-Metadaten (mom-Feedback #3):
 *
 * mom hatte viele Bild-Dateinamen mit SEO-Keywords vollgestopft. SEO-Best-Practice:
 * kurzer Titel, langer Alt-Text. Da das Umbenennen der physischen Dateien riskant ist
 * (Referenzen in public/erinnerungen/*.json), lösen wir es rein über die Metadaten:
 *
 *   - title       = kurz: "{Skill} {Ortsname}"  (z.B. "Schnellzeichner Frankfurt")
 *   - altOverride = der reiche, beschreibende Text aus dem (langen) Dateinamen
 *
 * Nur "aufgeblähte" Einträge werden angefasst; bestehende title/altOverride bleiben.
 * Greift nur public/img/slides/slides.meta.json an.
 */
import fs from 'fs';
import path from 'path';

const META = path.resolve('./public/img/slides/slides.meta.json');

const deslug = (file) =>
  decodeURIComponent(file)
    .replace(/\.[^.]+$/, '')        // Extension
    .replace(/^\d+[_-]+/, '')        // führender Prioritäts-Prefix "13_"
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const titleCase = (s) =>
  s.split(/[-\s]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const meta = JSON.parse(fs.readFileSync(META, 'utf-8'));
let touched = 0;
let altSet = 0;
let titleSet = 0;

for (const [key, entry] of Object.entries(meta)) {
  if (!entry || typeof entry !== 'object') continue;
  const slash = key.indexOf('/');
  const city = slash >= 0 ? key.slice(0, slash) : '';
  const file = slash >= 0 ? key.slice(slash + 1) : key;
  const rich = deslug(file);
  const wordCount = rich.split(' ').length;

  // "aufgebläht": langer beschreibender Dateiname (mom's Keyword-Stuffing)
  const bloated = rich.length > 55 || wordCount >= 7;
  if (!bloated) continue;

  let changed = false;

  // Reicher Text in altOverride (langer Alt-Text) – nur wenn noch nichts gesetzt
  const hasAlt =
    (typeof entry.altOverride === 'string' && entry.altOverride.trim()) ||
    (typeof entry.alt === 'string' && entry.alt.trim());
  if (!hasAlt) {
    entry.altOverride = cap(rich);
    altSet++;
    changed = true;
  }

  // Kurzer Titel: "{Skill} {Ortsname}" – nur wenn noch kein Titel gesetzt
  if (!(typeof entry.title === 'string' && entry.title.trim())) {
    const skill = Array.isArray(entry.categories) && entry.categories.length > 0
      ? entry.categories[0]
      : 'Live-Kunst';
    const cityTitle = titleCase(city);
    entry.title = cityTitle ? `${skill} ${cityTitle}` : skill;
    titleSet++;
    changed = true;
  }

  if (changed) touched++;
}

fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
console.log(`migrate-slide-meta: ${touched} aufgeblähte Einträge migriert (altOverride gesetzt: ${altSet}, title gesetzt: ${titleSet}).`);
