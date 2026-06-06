import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getWhyDetailLinkByTitle, WHY_DETAIL_LINKS } from '../src/utils/whyDetailLinks';

// WEB-007/P3-2: Why.astro verlinkt die 4 Why-Karten positionsbasiert
// (WHY_DETAIL_LINKS). Das ist robust gegen Titeländerungen (die der Admin macht),
// aber abhängig davon, dass default.json die kanonische Reihenfolge behält.
// Dieser Test koppelt die Positions-Liste an die titelbasierte
// getWhyDetailLinkByTitle (von den Detailseiten genutzt) und die ECHTEN
// default.json-Titel. Reordert jemand default.json oder ändert eine der beiden
// Zuordnungen, schlägt der Test an – die zwei Mechanismen können nicht mehr
// stillschweigend auseinanderdriften.

function defaultTitles(): string[] {
  const p = path.resolve('./public/why/default.json');
  const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const arr = Array.isArray(parsed) ? parsed : (parsed.benefits ?? parsed);
  return arr.map((x: { title: string }) => x.title);
}

describe('Why-Detaillinks: Position ↔ Titel konsistent (WEB-007)', () => {
  const titles = defaultTitles();

  it('default.json hat genau 4 Karten (Index-Annahme von Why.astro)', () => {
    expect(titles).toHaveLength(WHY_DETAIL_LINKS.length);
  });

  it.each(WHY_DETAIL_LINKS.map((link, i) => [i, link] as const))(
    'Position %i (%s) deckt sich mit der titelbasierten Auflösung',
    (i, link) => {
      expect(getWhyDetailLinkByTitle(titles[i])).toBe(link);
    },
  );
});
