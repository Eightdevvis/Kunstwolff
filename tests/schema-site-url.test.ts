import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_ORIGIN } from '../src/utils/siteOrigin.mjs';

// WEB-012/P3-3: JSON-LD-Schema-URLs müssen aus Astro.site (= SITE_URL) kommen,
// nicht hardcoded auf eine Domain zeigen – sonst verweist eine Stage/Preview
// auf die Prod-Domain, inkonsistent zu Canonical/OG im Layout.
//
// Der Rückfall für ein fehlendes SITE_URL steht seit 2026-11-20 an EINER
// Stelle: `SITE_ORIGIN` in src/utils/siteOrigin.mjs. Vorher stand er achtmal
// als Apex `https://kunstwolff.de` im Code – kanonisch ist aber `www`.

const SCHEMA_PAGES = [
  'src/pages/index.astro',
  'src/pages/[skill].astro',
  'src/pages/[landing].astro',
  'src/pages/[...kombi].astro',
  'src/pages/galerie.astro',
  'src/pages/team.astro',
  'src/pages/fr/[landing].astro',
];

const HARDCODED = /https:\/\/(www\.)?kunstwolff\.de/g;

describe('Schema-URLs aus Astro.site (WEB-012)', () => {
  it('SITE_ORIGIN ist die kanonische www-Adresse', () => {
    expect(SITE_ORIGIN).toBe('https://www.kunstwolff.de');
  });

  it.each(SCHEMA_PAGES)('%s nutzt Astro.site, Rückfall nur über SITE_ORIGIN', (rel) => {
    const src = fs.readFileSync(path.resolve(rel), 'utf-8');
    expect(src).toContain('Astro.site?.origin ?? SITE_ORIGIN');
    expect(src.match(HARDCODED) ?? []).toHaveLength(0);
  });

  it('astro.config.mjs: SITE_URL hat Vorrang, Rückfall SITE_ORIGIN', () => {
    const src = fs.readFileSync(path.resolve('astro.config.mjs'), 'utf-8');
    expect(src).toContain('process.env.SITE_URL ?? SITE_ORIGIN');
    expect(src.match(HARDCODED) ?? []).toHaveLength(0);
  });
});
