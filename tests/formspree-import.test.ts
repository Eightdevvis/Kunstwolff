import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// WEB-006/P3-4: formspree.js MUSS per ESM-import eingebunden werden (Vite bündelt,
// bricht bei falschem Pfad laut beim Build). Der frühere rohe <script src="../scripts/
// formspree.js"> löste relativ zur Seiten-URL auf und zeigte auf ein nicht
// existierendes /scripts/... → 404, der Kontaktformular-Handler lief auf den
// Landing-/Skill-Seiten gar nicht. Dieser Test verhindert die Rückkehr des Musters.

const pagesDir = path.resolve('./src/pages');

function allAstroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...allAstroFiles(p));
    else if (entry.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

describe('formspree per ESM-import statt rohem <script src> (WEB-006)', () => {
  it('keine Seite bindet formspree per <script src> ein', () => {
    const offenders = allAstroFiles(pagesDir).filter((f) =>
      /<script\s+src=["'][^"']*formspree/.test(fs.readFileSync(f, 'utf-8')),
    );
    expect(offenders).toEqual([]);
  });
});
