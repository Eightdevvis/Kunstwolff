import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// WEB-012/P3-3: JSON-LD-Schema-URLs müssen aus Astro.site (= SITE_URL) kommen,
// nicht hardcoded auf kunstwolff.de zeigen – sonst verweist die Vercel-Stage auf
// die (noch Wix-)Prod-Domain, inkonsistent zu Canonical/OG im Layout.
// Erlaubt ist GENAU ein Vorkommen pro Datei: der Fallback `?? 'https://kunstwolff.de'`.

const SCHEMA_PAGES = [
  'src/pages/index.astro',
  'src/pages/[skill].astro',
  'src/pages/[landing].astro',
  'src/pages/[skill]/[landing].astro',
];

describe('Schema-URLs aus Astro.site (WEB-012)', () => {
  it.each(SCHEMA_PAGES)('%s nutzt Astro.site, kunstwolff.de nur als Fallback', (rel) => {
    const src = fs.readFileSync(path.resolve(rel), 'utf-8');
    expect(src).toContain('Astro.site');
    const hits = src.match(/https:\/\/kunstwolff\.de/g) ?? [];
    expect(hits).toHaveLength(1); // nur der Fallback, keine hardcoded Schema-URL
    expect(src).toContain("?? 'https://kunstwolff.de'");
  });
});
