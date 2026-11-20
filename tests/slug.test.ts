// Slug-Regeln: EINE Quelle (`scripts/slug.mjs`), gemeinsame Testvektoren
// (`tests/fixtures/slug-vectors.json`).
//
// Bis 2026-11-20 stand die Slug-Funktion als Kopie in neun Dateien. Die
// erwarteten Werte in der JSON wurden VOR dem Zusammenlegen aus genau diesen
// Kopien aufgenommen. Damit beweist dieser Test, dass das Zusammenlegen nichts
// verändert hat – und er hält die drei bekannten Familien auseinander, statt
// sie stillschweigend anzugleichen:
//
// - `slugify`: Umlaute ausschreiben (ö → oe, ß → ss), Akzente weg, Kleinbuchstaben,
//   alles außer a–z/0–9 wird `-`.
// - `slugifyTag`: wie `slugify`, nur null/undefined → '' statt 'null'/'undefined'.
//   Gegenstück im Admin: `src/utils/tagSlug.ts`.
// - `slugifyWithoutTransliteration`: Event-Slug-Ersatz (nur wenn `events.json`
//   kein `slug` hat). Schreibt Umlaute NICHT aus („Jubiläum" → `jubilaum`).
//   Bekannte Abweichung, bewusst nicht angeglichen (würde URLs ändern).
//
// Der Admin soll dieselbe JSON gegen seine eigenen Funktionen laufen lassen.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { slugify, slugifyTag, slugifyWithoutTransliteration, transliterateGerman } from '../scripts/slug.mjs';
import { slugifyTag as slugifyTagFromTags } from '../scripts/tags.mjs';

type Vector = {
  input: string | null;
  slugify: string;
  slugifyTag: string;
  slugifyWithoutTransliteration: string;
};

const { vectors } = JSON.parse(
  fs.readFileSync(path.resolve('tests/fixtures/slug-vectors.json'), 'utf-8'),
) as { vectors: Vector[] };

describe('Slug-Testvektoren', () => {
  it('deckt die Pflicht-Fälle ab', () => {
    const inputs = vectors.map((v) => v.input);
    for (const needed of ['', 'Köln', 'Gießen', 'Café Crème', 'Private Feier', 'Rhein-Main-Gebiet', 'BERLIN', null]) {
      expect(inputs).toContain(needed);
    }
    expect(vectors.length).toBeGreaterThan(50);
  });

  it.each(vectors)('slugify(%j)', (v) => {
    expect(slugify(v.input)).toBe(v.slugify);
  });

  it.each(vectors)('slugifyTag(%j)', (v) => {
    expect(slugifyTag(v.input)).toBe(v.slugifyTag);
    // tags.mjs reicht dieselbe Funktion weiter, keine eigene Kopie.
    expect(slugifyTagFromTags(v.input)).toBe(v.slugifyTag);
  });

  it.each(vectors)('slugifyWithoutTransliteration(%j)', (v) => {
    expect(slugifyWithoutTransliteration(v.input)).toBe(v.slugifyWithoutTransliteration);
  });

  it('transliterateGerman schreibt nur Umlaute und ß aus', () => {
    expect(transliterateGerman('Größe Ärger Café')).toBe('Groesse aerger Café');
  });
});

describe('Keine Kopien mehr', () => {
  const files = [
    'scripts/sync-title-images.mjs',
    'scripts/sync-erinnerungen.mjs',
    'scripts/remove-landing.mjs',
    'scripts/sync-why.mjs',
    'scripts/sync-landings.mjs',
    'scripts/sync-events.mjs',
    'scripts/tags.mjs',
    'src/utils/landings.ts',
    'src/utils/titleImages.ts',
    'src/utils/skills.ts',
    'src/utils/events.ts',
  ];
  it.each(files)('%s definiert keine eigene Slug-Funktion', (file) => {
    const src = fs.readFileSync(path.resolve(file), 'utf-8');
    expect(src).not.toMatch(/const (transliterateGerman|normalizeSlug|slugify)\s*=/);
    expect(src).not.toMatch(/\.replace\(\/ä\/gi?, 'ae'\)/);
  });
});
