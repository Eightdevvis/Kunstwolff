import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { getAllReviews, getReviewsByLandingAndSkill, type ReviewItem } from '../src/utils/reviews';
import { getAllFAQs, getFAQsForContext, matchesFAQContext, type FAQItem } from '../src/utils/faq';

// Phase 5d: Reviews und FAQs wählen über TAGS aus, nicht mehr über den Ordner.
//
// Die Datei-Invarianten unten sind kein Selbstzweck: sie sind der Beweis, dass
// die Umstellung nichts verlieren KANN. Solange jeder Inhalt den Ort-Tag seines
// Ordners trägt, ist die Tag-Auswahl eine Obermenge der Ordner-Auswahl. Fällt
// die Invariante, verschwinden Inhalte still von den Seiten – deshalb steht sie
// als Test da und nicht als Notiz.

const walk = (dir: string): string[] =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.md$/i.test(entry.name) ? [full] : [];
      })
    : [];

const istVorlage = (datei: string) => /^_?vorlage\.md$/i.test(path.basename(datei));

const tagsVon = (datei: string) => {
  const daten = matter(fs.readFileSync(datei, 'utf-8')).data as Record<string, unknown>;
  const roh = (daten.tags ?? {}) as Record<string, unknown>;
  const liste = (wert: unknown) =>
    Array.isArray(wert) ? wert.map((v) => String(v).trim().toLowerCase()).filter(Boolean) : [];
  return { skills: liste(roh.skills), events: liste(roh.events), landings: liste(roh.landings) };
};

const ordnerVon = (datei: string, wurzel: string) => {
  const teile = path.relative(wurzel, datei).split(path.sep);
  return teile.length > 1 ? teile[0]!.toLowerCase() : '';
};

describe('Reviews: Ort-Tag deckt den Ordner ab', () => {
  const wurzel = path.resolve('./public/reviews');
  const dateien = walk(wurzel).filter((d) => !istVorlage(d));

  it('findet überhaupt Reviews (sonst prüft der Rest nichts)', () => {
    expect(dateien.length).toBeGreaterThan(0);
  });

  // Die eigentliche Parität. Ohne sie wäre die Umstellung ein Datenverlust.
  it('jedes Review trägt den Ort-Tag seines Ordners', () => {
    const abweichend = dateien.filter((datei) => {
      const ordner = ordnerVon(datei, wurzel);
      if (!ordner || ordner === 'default') return false;
      return !tagsVon(datei).landings.includes(ordner);
    });

    expect(abweichend.map((d) => path.relative(wurzel, d))).toEqual([]);
  });

  it('jedes Review trägt mindestens einen Skill-Tag', () => {
    const ohne = dateien.filter((datei) => tagsVon(datei).skills.length === 0);
    expect(ohne.map((d) => path.relative(wurzel, d))).toEqual([]);
  });
});

describe('FAQs: Ort-Tag deckt den Ordner ab', () => {
  const wurzel = path.resolve('./public/faq');
  const dateien = walk(wurzel);

  it('findet überhaupt FAQs', () => {
    expect(dateien.length).toBeGreaterThan(0);
  });

  // `default/` bleibt absichtlich ohne Ort-Tag: allgemein gilt überall.
  it('jede FAQ ausserhalb von default/ trägt den Ort-Tag ihres Ordners', () => {
    const abweichend = dateien.filter((datei) => {
      const ordner = ordnerVon(datei, wurzel);
      if (!ordner || ordner === 'default' || ordner === 'events') return false;
      return !tagsVon(datei).landings.includes(ordner);
    });

    expect(abweichend.map((d) => path.relative(wurzel, d))).toEqual([]);
  });
});

describe('matchesFAQContext – Dimensionen einzeln, nicht als ODER-Kette', () => {
  const faq = (tags: Partial<NonNullable<FAQItem['tags']>>, categories?: string[]): FAQItem => ({
    question: 'q',
    answer: 'a',
    categories,
    tags: { skills: [], events: [], landings: [], ...tags },
  });

  it('lässt eine FAQ ohne Ort-Tag überall zu', () => {
    expect(matchesFAQContext(faq({ skills: ['schnellzeichner'] }), { city: 'trier' })).toBe(true);
  });

  it('zeigt eine Stadt-FAQ auf ihrer Stadt', () => {
    expect(matchesFAQContext(faq({ landings: ['trier'] }), { city: 'trier' })).toBe(true);
  });

  // Der Kern der Umstellung: früher genügte der passende Skill, und die FAQ
  // erschien auf JEDER Stadt. Genau deshalb brauchte FAQ.astro das Ordner-Gate.
  it('zeigt eine fremde Stadt-FAQ NICHT, auch wenn der Skill passt', () => {
    const fremde = faq({ landings: ['koeln'], skills: ['schnellzeichner'] });
    expect(
      matchesFAQContext(fremde, { city: 'trier', categories: ['Schnellzeichner'] }),
    ).toBe(false);
  });

  it('siebt nach Skill aus, wenn die FAQ einen anderen Skill trägt', () => {
    const nurSzene = faq({ landings: ['trier'], skills: ['szenenmaler'] });
    expect(matchesFAQContext(nurSzene, { city: 'trier', categories: ['Schnellzeichner'] })).toBe(
      false,
    );
  });

  it('erkennt den Skill auch aus dem alten categories-Feld', () => {
    const ohneSkillTag = faq({ landings: ['trier'] }, ['Schnellzeichner']);
    expect(
      matchesFAQContext(ohneSkillTag, { city: 'trier', categories: ['Schnellzeichner'] }),
    ).toBe(true);
  });

  it('behandelt events/<slug> als Anlass, nicht als Ort', () => {
    const hochzeit = faq({ events: ['hochzeit'] });
    expect(matchesFAQContext(hochzeit, { city: 'events/hochzeit' })).toBe(true);
    expect(matchesFAQContext(hochzeit, { city: 'events/messe' })).toBe(false);
    // Eine Anlass-FAQ hat keinen Ort-Tag und darf deshalb auf Stadtseiten bleiben.
    expect(matchesFAQContext(hochzeit, { city: 'trier' })).toBe(true);
  });
});

describe('getFAQsForContext – Reihenfolge und Vollständigkeit', () => {
  const stadt = 'trier';

  it('stellt die FAQs der Stadt vor die allgemeinen', () => {
    const liste = getFAQsForContext({ city: stadt, categories: ['Schnellzeichner'] });
    const eigene = liste.filter((f) => (f.tags?.landings ?? []).includes(stadt));

    expect(eigene.length).toBeGreaterThan(0);
    // Alle stadteigenen FAQs stehen vor der ersten allgemeinen.
    const ersteAllgemeine = liste.findIndex((f) => (f.tags?.landings ?? []).length === 0);
    const letzteEigene = liste.reduce(
      (max, f, i) => ((f.tags?.landings ?? []).includes(stadt) ? i : max),
      -1,
    );
    expect(letzteEigene).toBeLessThan(ersteAllgemeine === -1 ? Number.MAX_SAFE_INTEGER : ersteAllgemeine);
  });

  it('lässt keine FAQ einer fremden Stadt durch', () => {
    const liste = getFAQsForContext({ city: stadt, categories: ['Schnellzeichner'] });
    const fremd = liste.filter((f) => {
      const orte = f.tags?.landings ?? [];
      return orte.length > 0 && !orte.includes(stadt);
    });

    expect(fremd.map((f) => f.question)).toEqual([]);
  });

  it('liefert ohne Kontext alle FAQs', () => {
    expect(getFAQsForContext({}).length).toBe(getAllFAQs().length);
  });
});

describe('Reviews-Auswahl über Tags', () => {
  const orteMitReviews = (): string[] => [
    ...new Set(getAllReviews().flatMap((r: ReviewItem) => r.tags?.landings ?? [])),
  ];

  it('nimmt alle Reviews mit, die den Ort-Tag tragen', () => {
    for (const ort of orteMitReviews()) {
      const erwartet = getAllReviews().filter((r) => (r.tags?.landings ?? []).includes(ort));
      const geliefert = getReviewsByLandingAndSkill(ort, 'Schnellzeichner');

      const passend = erwartet.filter((r) =>
        r.categories.some((c) => c.toLowerCase() === 'schnellzeichner') ||
        (r.tags?.skills ?? []).some((t) => t.toLowerCase() === 'schnellzeichner'),
      );

      for (const review of passend) {
        expect(
          geliefert.some((g) => g.author === review.author && g.text === review.text),
          `${ort}: Review von ${review.author} fehlt`,
        ).toBe(true);
      }
    }
  });

  it('füllt auf, bis das Minimum erreicht ist, statt eine leere Seite zu zeigen', () => {
    for (const ort of orteMitReviews()) {
      expect(getReviewsByLandingAndSkill(ort, 'Schnellzeichner').length).toBeGreaterThan(0);
    }
  });
});
