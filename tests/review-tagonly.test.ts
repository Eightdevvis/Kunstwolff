import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getReviewsByLanding } from '../src/utils/reviews';

/**
 * Der Schalter `tagOnly` (2026-07-31).
 *
 * Bewertungen sind absichtlich unspezifischer als FAQs und Bilder und duerfen
 * fremde Seiten auffuellen — sonst stuenden 9 Staedte ohne eigene Bewertungen
 * mit einem leeren Slider da. `tagOnly: true` nimmt eine einzelne Bewertung
 * davon aus.
 */
const alleDateien = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? alleDateien(path.join(dir, e.name))
          : /\.md$/i.test(e.name) && !e.name.startsWith('_')
            ? [path.join(dir, e.name)]
            : [],
      )
    : [];

describe('tagOnly', () => {
  it('ist im Bestand nirgends gesetzt – der Standard bleibt frei', () => {
    const gesetzt = alleDateien('public/reviews').filter(
      (p) => matter(fs.readFileSync(p, 'utf-8')).data.tagOnly === true,
    );
    expect(gesetzt).toEqual([]);
  });

  it('Berlin hat keine eigenen Bewertungen und wird trotzdem aufgefuellt', () => {
    // Genau das Verhalten, das erhalten bleiben soll. Waere die strenge
    // FAQ-Regel auch hier angewandt worden, stuende hier 0.
    expect(getReviewsByLanding('berlin').length).toBeGreaterThan(0);
  });

  it('haelt eine als tagOnly markierte Bewertung von fremden Seiten fern', () => {
    // Wirkungsnachweis mit einer echten Datei: ohne Schalter wandert sie beim
    // Auffuellen auf fremde Stadtseiten, mit Schalter nicht.
    const dir = 'public/reviews/koblenz';
    const datei = path.join(dir, 'review98.md');
    const text = 'Die Location hier in Koblenz war perfekt fuer den Zeichner.';
    const schreibe = (tagOnly: boolean) =>
      fs.writeFileSync(
        datei,
        `---\nauthor: "Testfall"\ncategories: []\n${tagOnly ? 'tagOnly: true\n' : ''}tags:\n  skills: []\n  events: []\n  landings:\n    - koblenz\n---\n${text}\n`,
        'utf-8',
      );
    const stehtAuf = (stadt: string) =>
      getReviewsByLanding(stadt).some((r) => r.text.includes('Koblenz war perfekt'));

    try {
      fs.mkdirSync(dir, { recursive: true });

      schreibe(false);
      expect(stehtAuf('koblenz'), 'ohne Schalter auf der eigenen Seite').toBe(true);
      const fremdeOhne = ['berlin', 'hamburg', 'dortmund'].filter(stehtAuf);
      expect(fremdeOhne.length, 'ohne Schalter fuellt sie fremde Seiten auf').toBeGreaterThan(0);

      schreibe(true);
      expect(stehtAuf('koblenz'), 'mit Schalter weiterhin auf der eigenen Seite').toBe(true);
      expect(['berlin', 'hamburg', 'dortmund'].filter(stehtAuf), 'mit Schalter nicht mehr fremd').toEqual([]);
    } finally {
      fs.rmSync(datei, { force: true });
    }
  });

  it('eine Stadt mit eigenen Bewertungen zeigt ihre eigenen', () => {
    const trier = getReviewsByLanding('trier');
    const eigene = trier.filter((r) => r.tags?.landings?.includes('trier'));
    expect(eigene.length).toBeGreaterThan(0);
  });
});
