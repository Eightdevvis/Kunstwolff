import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getSharedSkills, getSkillBySlug, skillContentKey } from '../src/utils/skills';

/**
 * Ein Skill hat ZWEI Schlüssel, und sie sind seit dem 2026-07-31 verschieden.
 *
 *   URL     → `skills.json.link`      → /schnellzeichner-karikaturist/
 *   Inhalt  → `skillContentKey(titel)` → schnellzeichner
 *
 * Der Titel „Schnellzeichner" bleibt überall sichtbar; nur die Adresse ändert
 * sich, weil „Karikaturist" das häufiger gesuchte Wort ist.
 *
 * Warum das ein Test wert ist: die Verwechslung erzeugt KEINE Fehlermeldung.
 * `resolveTitleImage`, `resolveHeroBg`, `getWhyBenefits`, `getErinnerungen` und
 * `getSkillEventContent` schlagen bei unbekanntem Schlüssel still auf Default
 * oder Leer zurück. Wer hier den URL-Slug einsetzt, bekommt eine Seite ohne
 * Bilder und ohne Texte – und sucht die Ursache garantiert nicht in der URL.
 *
 * Die Dateien heißen nach dem TITEL, weil die Sync-Skripte sie so anlegen:
 * `sync-why.mjs` und `sync-erinnerungen.mjs` lesen `entry.title`.
 */

const lies = (p: string): string => fs.readFileSync(path.resolve(p), 'utf-8');

describe('URL und Inhalts-Schlüssel eines Skills', () => {
  it('sind für Schnellzeichner absichtlich verschieden', () => {
    const skill = getSharedSkills().find((s) => s.title === 'Schnellzeichner');
    expect(skill, 'Skill „Schnellzeichner" fehlt in skills.json').toBeDefined();
    expect(skill!.link).toBe('/schnellzeichner-karikaturist/');
    expect(skillContentKey(skill!.title)).toBe('schnellzeichner');
  });

  it('die Seite ist unter der neuen Adresse erreichbar', () => {
    expect(getSkillBySlug('schnellzeichner-karikaturist')?.title).toBe('Schnellzeichner');
    // Die alte Adresse baut keine Seite mehr – dafür gibt es den 301 in vercel.json.
    expect(getSkillBySlug('schnellzeichner')).toBeNull();
  });

  it('die Inhalts-Dateien liegen weiterhin unter dem Titel-Schlüssel', () => {
    // Genau die Dateien, die bei einer Verwechslung still ins Leere greifen.
    for (const p of ['./public/why/schnellzeichner.json', './public/erinnerungen/schnellzeichner.json']) {
      expect(fs.existsSync(path.resolve(p)), p).toBe(true);
    }
    expect(fs.existsSync(path.resolve('./public/img/Titelbild/schnellzeichner'))).toBe(true);
  });

  it('die Skill-Seiten reichen den Inhalts-Schlüssel weiter, nicht den URL-Slug', () => {
    for (const seite of ['./src/pages/[skill].astro', './src/pages/[skill]/[landing].astro']) {
      const quelle = lies(seite);
      expect(quelle, seite).toMatch(/const skillKey = skillContentKey\(skillData\.title\)/);
    }

    // Jeder Aufruf, der in Ordner oder Dateien greift, muss `skillKey` nennen.
    // Geprüft wird der Aufruf selbst, nicht die Datei – sonst schlägt der Test
    // auch bei `getStaticPaths` an, wo `skill` als URL-Segment völlig richtig ist.
    const inhaltsAufrufe = [
      /resolveTitleImage\(\{ skill: skillKey/,
      /resolveHeroBg\(\{ skill: skillKey/,
      /why: \{ skill: skillKey/,
    ];
    const skillSeite = lies('./src/pages/[skill].astro');
    const komboSeite = lies('./src/pages/[skill]/[landing].astro');

    for (const muster of inhaltsAufrufe) {
      expect(komboSeite, `Kombiseite: ${muster}`).toMatch(muster);
    }
    expect(skillSeite).toMatch(/resolveTitleImage\(\{ skill: skillKey \}\)/);
    expect(skillSeite).toMatch(/resolveHeroBg\(\{ skill: skillKey \}\)/);
    expect(skillSeite).toMatch(/why: \{ skill: skillKey \}/);
    expect(komboSeite).toMatch(/erinnerungen: \{ skill: skillKey/);
    expect(komboSeite).toMatch(/getSkillEventContent\(skillKey/);

    // Umgekehrt: was eine URL baut, muss den URL-Slug behalten.
    expect(skillSeite, 'Städte-Links müssen die URL benutzen').toMatch(
      /landingsection: \{ site: skill \}/,
    );
  });

  it('schreibt Umlaute aus – wie die Sync-Skripte, sonst zwei Schlüssel für eine Sache', () => {
    // `sync-why.mjs` legt für „Ölmalerei" die Datei `oelmalerei.json` an.
    // Ohne Transliteration käme hier `olmalerei` heraus und die Seite bliebe leer.
    expect(skillContentKey('Ölmalerei')).toBe('oelmalerei');
    expect(skillContentKey('Straßenkunst')).toBe('strassenkunst');
  });
});

describe('Weiterleitungen der Umbenennung', () => {
  const vercel = JSON.parse(lies('./vercel.json')) as {
    redirects: { source: string; destination: string; permanent?: boolean }[];
  };

  it('leitet die alte Adresse und alle Unterseiten dauerhaft um', () => {
    const exakt = vercel.redirects.find((r) => r.source === '/schnellzeichner');
    const rest = vercel.redirects.find((r) => r.source === '/schnellzeichner/:rest*');

    expect(exakt?.destination).toBe('/schnellzeichner-karikaturist/');
    expect(exakt?.permanent).toBe(true);
    expect(rest?.destination).toBe('/schnellzeichner-karikaturist/:rest*');
    expect(rest?.permanent).toBe(true);
  });

  it('kein Inhalt verlinkt noch auf die alte Adresse', () => {
    // Beim Umbenennen blieben drei Verweise stehen (branding, du-bist-kunst,
    // stimmung-durch-kunst). Die fielen erst am gebauten `dist/` auf, weil ein
    // interner Link auf eine nicht mehr gebaute Seite kein Build-Fehler ist,
    // sondern ein 404 für den Besucher.
    const wurzeln = ['./public/branding', './public/du-bist-kunst', './public/stimmung-durch-kunst',
      './public/navigation', './public/skills', './public/config'];
    const treffer: string[] = [];

    for (const wurzel of wurzeln) {
      const dir = path.resolve(wurzel);
      if (!fs.existsSync(dir)) continue;
      for (const name of fs.readdirSync(dir)) {
        const datei = path.join(dir, name);
        if (!fs.statSync(datei).isFile()) continue;
        if (lies(datei).includes('"/schnellzeichner/')) treffer.push(`${wurzel}/${name}`);
      }
    }

    expect(treffer).toEqual([]);
  });

  it('erzeugt keine Ketten: kein Wix-Ziel zeigt auf die alte Adresse', () => {
    // Wix-URL → alte Astro-URL → neue Astro-URL wäre zwei Sprünge. Google folgt
    // dem zwar, gibt aber pro Sprung Signal ab, und die Kette ist unnötig.
    const ketten = vercel.redirects.filter(
      (r) => r.destination === '/schnellzeichner/' || r.destination.startsWith('/schnellzeichner/'),
    );
    expect(ketten.map((r) => r.source)).toEqual([]);
  });
});
