import { describe, expect, it } from 'vitest';
import { parseSkillsContent } from '../src/utils/skills';

// Das link-Feld wird im Admin von Hand gepflegt. Ohne Schrägstriche wurde die
// Skill-Seite zur 404-Weiterleitung, mit Pfad darin brach der ganze Build.
describe('Skill-Link aus dem Admin', () => {
  const link = (l: unknown) =>
    parseSkillsContent({ skills: [{ title: 'Graphic recording', link: l as string }] })[0].link;

  it('ergänzt fehlende Schrägstriche', () => {
    expect(link('eventzeichner')).toBe('/eventzeichner/');
    expect(link('/eventzeichner')).toBe('/eventzeichner/');
    expect(link('//eventzeichner//')).toBe('/eventzeichner/');
  });

  it('fällt bei Pfaden und ganzen Adressen auf den Titel zurück', () => {
    expect(link('https://www.kunstwolff.de/graphic/')).toBe('/graphic-recording/');
    expect(link('/a/b/')).toBe('/graphic-recording/');
    expect(link('mit leerzeichen')).toBe('/graphic-recording/');
  });

  it('lässt leere Felder beim Titel', () => {
    expect(link('')).toBe('/graphic-recording/');
    expect(link(undefined)).toBe('/graphic-recording/');
  });
});

describe('Skill-Liste aus dem Admin', () => {
  it('übersteht Nicht-Texte in den Feldern', () => {
    const liste = parseSkillsContent({
      skills: [
        { title: 'Aquarelle', description: 42 as unknown as string, image: ['x'] as unknown as string },
        null as unknown as { title: string },
        { title: '   ' },
      ],
    });
    expect(liste.map((s) => s.link)).toEqual(['/aquarelle/']);
    expect(liste[0].description).toBeUndefined();
  });
});
