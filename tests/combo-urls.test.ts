import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  cityComboPath,
  cityComboSlug,
  eventComboPath,
  legacyCityComboPath,
  skillSlugFromLink,
} from '../src/utils/comboUrls';
import { getLandingSlugs } from '../src/utils/landings';
import { getEventSlugs } from '../src/utils/events';
import { getSkillSlugs } from '../src/utils/skills';
import { isPageHiddenByPath } from '../src/utils/pageVisibility';

const skills = getSkillSlugs();
const landings = getLandingSlugs();
const events = getEventSlugs();

describe('Adressform der Kombi-Seiten', () => {
  it('Ort-Kombis sind flach, Ort zuerst', () => {
    expect(cityComboPath('schnellzeichner-karikaturist', 'berlin')).toBe(
      '/berlin-schnellzeichner-karikaturist/',
    );
    expect(cityComboSlug('szenenmaler', 'frankfurt')).toBe('frankfurt-szenenmaler');
  });

  it('Anlass-Kombis bleiben hierarchisch', () => {
    // Das sind die einzigen indexierbaren Kombi-Seiten – bewusst NICHT geflacht.
    expect(eventComboPath('schnellzeichner-karikaturist', 'hochzeit')).toBe(
      '/schnellzeichner-karikaturist/hochzeit/',
    );
  });

  it('nimmt den Skill-Slug aus dem link-Feld, mit und ohne Schrägstriche', () => {
    expect(skillSlugFromLink('/szenenmaler/')).toBe('szenenmaler');
    expect(skillSlugFromLink('szenenmaler')).toBe('szenenmaler');
  });
});

describe('Kollisionen', () => {
  it('keine flache Kombi-Adresse verdeckt eine Stadt-, Anlass- oder feste Seite', () => {
    // /{ort}-{skill} liegt auf derselben Ebene wie /berlin/ und /impressum/.
    // Eine Kollision würde eine der beiden Seiten still überschreiben.
    const feste = fs
      .readdirSync(path.resolve('./src/pages'))
      .filter((n) => n.endsWith('.astro') && !n.startsWith('['))
      .map((n) => n.replace(/\.astro$/, ''));
    const belegt = new Set<string>([...landings, ...events, ...feste]);

    const kombis = skills.flatMap((s) => landings.map((o) => cityComboSlug(s, o)));
    const kollisionen = kombis.filter((k) => belegt.has(k));
    expect(kollisionen).toEqual([]);
  });

  it('erzeugt für jede Kombination genau eine Adresse', () => {
    const kombis = skills.flatMap((s) => landings.map((o) => cityComboSlug(s, o)));
    expect(new Set(kombis).size).toBe(kombis.length);
  });
});

describe('Ausblenden greift auch bei flacher Adresse', () => {
  /**
   * Die eigentliche Falle dieser Umstellung.
   *
   * `page-visibility.json` blendet per PRÄFIX aus: `/aquarelle/` versteckt auch
   * `/aquarelle/berlin/`. Bei `/berlin-aquarelle/` greift das nicht mehr – der
   * Pfad fängt nicht mit `/aquarelle/` an. Die Einträge mussten deshalb einzeln
   * auf die flache Form gezogen werden. Wer das rückgängig macht, macht 102
   * bewusst versteckte Seiten stillschweigend wieder indexierbar.
   */
  it('kein versteckter Skill zieht seine Ort-Kombis noch per Präfix mit', () => {
    const versteckteSkills = skills.filter((s) => isPageHiddenByPath(`/${s}/`));
    // Aquarelle ist zum Zeitpunkt des Umbaus der Fall, der das aufdeckt.
    expect(versteckteSkills.length).toBeGreaterThan(0);

    for (const skill of versteckteSkills) {
      for (const ort of landings) {
        expect(
          isPageHiddenByPath(cityComboPath(skill, ort)),
          `${cityComboPath(skill, ort)} ist nicht mehr versteckt – ` +
            `page-visibility.json steht noch auf der alten hierarchischen Adresse`,
        ).toBe(true);
      }
    }
  });

  it('page-visibility.json enthält keine alten hierarchischen Ort-Adressen mehr', () => {
    const roh = JSON.parse(
      fs.readFileSync(path.resolve('./public/config/page-visibility.json'), 'utf-8'),
    ) as { hidden: string[] };
    const alteFormen = skills
      .flatMap((s) => landings.map((o) => legacyCityComboPath(s, o)))
      .filter((p) => roh.hidden.includes(p));
    expect(alteFormen).toEqual([]);
  });
});

describe('Weiterleitungen in vercel.json', () => {
  const vercel = JSON.parse(fs.readFileSync(path.resolve('./vercel.json'), 'utf-8')) as {
    redirects: { source: string; destination: string; permanent?: boolean }[];
  };
  const ziel = new Map(vercel.redirects.map((r) => [r.source.replace(/\/$/, ''), r.destination]));

  it('jede alte Ort-Kombi zeigt dauerhaft auf die neue', () => {
    for (const skill of skills) {
      for (const ort of landings) {
        const quelle = `/${skill}/${ort}`;
        expect(ziel.get(quelle), `keine Weiterleitung für ${quelle}`).toBe(
          cityComboPath(skill, ort),
        );
      }
    }
  });

  it('keine Weiterleitung landet auf einer anderen Weiterleitung (keine Ketten)', () => {
    // Ketten kosten Crawl-Budget und verwässern das Signal. Beim Wix-Umzug ist
    // das der wahrscheinlichste Fehler: Wix-URL → alte Astro-URL → neue.
    for (const r of vercel.redirects) {
      if (r.source.includes(':')) continue; // Sammelregeln haben kein festes Ziel
      const weiter = ziel.get(r.destination.replace(/\/$/, ''));
      expect(weiter, `${r.source} → ${r.destination} → ${weiter}`).toBeUndefined();
    }
  });

  it('die Sammelregel für den alten Skill-Namen steht hinter den genauen Regeln', () => {
    // Vercel nimmt die erste passende Regel. Stünde `/schnellzeichner/:rest*`
    // vorn, liefe /schnellzeichner/berlin über zwei Sprünge statt einen.
    const sammel = vercel.redirects.findIndex(
      (r) => r.source.startsWith('/schnellzeichner/') && r.source.includes(':rest*'),
    );
    const genau = vercel.redirects
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.source.startsWith('/schnellzeichner/') && !r.source.includes(':'))
      .map(({ i }) => i);
    if (sammel >= 0 && genau.length) expect(Math.max(...genau)).toBeLessThan(sammel);
  });
});
