// validate-dist läuft seit 2026-11-20 am Ende jedes Builds (astro.config.mjs)
// und lässt ihn scheitern, wenn eine Bild-Adresse ins Leere zeigt.
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateDist } from '../scripts/validate-dist-images.mjs';

let tmp = '';
afterEach(() => {
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = '';
});

const baue = (html: string, dateien: string[]) => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-dist-'));
  fs.writeFileSync(path.join(tmp, 'index.html'), html);
  for (const d of dateien) {
    fs.mkdirSync(path.dirname(path.join(tmp, d)), { recursive: true });
    fs.writeFileSync(path.join(tmp, d), '');
  }
  return tmp;
};

describe('validateDist', () => {
  it('findet eine fehlende srcset-Stufe', () => {
    const dist = baue('<img src="/img/a.webp" srcset="/img/a-400w.webp 400w, /img/a.webp 1600w">', ['img/a.webp']);
    const { fehlend, seiten } = validateDist(dist);
    expect(seiten).toBe(1);
    expect(fehlend.map((f) => f.url)).toEqual(['/img/a-400w.webp']);
  });

  it('ist still, wenn alles da ist', () => {
    const dist = baue('<img src="/img/a.webp" srcset="/img/a-400w.webp 400w">', ['img/a.webp', 'img/a-400w.webp']);
    expect(validateDist(dist).fehlend).toEqual([]);
  });

  it('wirft, wenn es kein dist gibt', () => {
    expect(() => validateDist(path.join(os.tmpdir(), 'gibt-es-nicht-' + Date.now()))).toThrow();
  });
});
