import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getNavigationItems, type NavigationDropdownItem } from '../src/utils/navigation';

const teamSeite = path.resolve('./src/pages/team.astro');
const quelle = fs.readFileSync(teamSeite, 'utf-8');

describe('Team-Seite', () => {
  it('existiert als Route', () => {
    expect(fs.existsSync(teamSeite)).toBe(true);
    // Case-sensitiv: `/team/` muss auch auf case-sensitivem Hosting greifen
    // (WEB-001 entstand genau so: Link `/faq`, Datei `FAQ.astro`).
    expect(fs.readdirSync(path.dirname(teamSeite))).toContain('team.astro');
  });

  it('zeigt Gabriele vor Jenny', () => {
    // Ausdrücklicher Wunsch, und aus dem Markup allein nicht ersichtlich –
    // ein späteres Umsortieren der Liste soll hier auffallen.
    const gabriele = quelle.indexOf('Gabriele Wolff');
    const jenny = quelle.indexOf('Jenny Wolff');
    expect(gabriele).toBeGreaterThan(-1);
    expect(jenny).toBeGreaterThan(-1);
    expect(gabriele).toBeLessThan(jenny);
  });

  it('nennt die Szenenmalerei als Jennys Alleinstellung', () => {
    expect(quelle).toContain('Szenenmalerei');
    const jenny = quelle.indexOf('Jenny Wolff');
    // Die Aussage "die Einzige" darf nur im Jenny-Block stehen.
    const einzige = quelle.indexOf('Einzige');
    expect(einzige).toBeGreaterThan(jenny);
  });
});

describe('Team-Portraits', () => {
  const bilder = [...quelle.matchAll(/\/img\/team\/[^"']+\.webp/g)].map((m) => m[0]);

  it('verweist überhaupt auf Portraits', () => {
    expect(bilder.length).toBeGreaterThanOrEqual(2);
  });

  it.each([...new Set(bilder)])('%s liegt im Repo', (ref) => {
    const abs = path.resolve(`./public${ref}`);
    expect(fs.existsSync(abs), abs).toBe(true);
    // Eine 0-Byte-Datei wäre gültig verlinkt und trotzdem kaputt.
    expect(fs.statSync(abs).size).toBeGreaterThan(5_000);
  });

  it('liefert KEIN srcset, solange img/team keine Varianten bekommt', () => {
    // Der teuerste Fehler in diesem Bereich, dokumentiert in
    // src/utils/responsiveImages.ts: ein srcset-Kandidat, den das Build-Skript
    // nicht erzeugt, lässt das Bild LEER – der Browser versucht keine andere
    // Stufe. `generate-image-variants.mjs` verarbeitet nur img/slides,
    // img/Titelbild und img/why.
    const skript = fs.readFileSync(path.resolve('./scripts/generate-image-variants.mjs'), 'utf-8');
    const teamHatVarianten = /['"]img\/team['"]/.test(skript);
    // Auf die Attribut- bzw. Aufrufform prüfen, nicht auf das Wort: der
    // Kommentar in team.astro erklärt genau diese Falle und würde sonst selbst
    // als Verstoss gelten.
    const seiteNutztSrcset = /srcset=|buildSrcSet\(/.test(quelle);
    // Genau eines von beiden darf gelten – oder keines. Verboten ist nur:
    // srcset ohne Varianten.
    expect(
      seiteNutztSrcset && !teamHatVarianten,
      'team.astro liefert srcset, aber img/team steht nicht in den Varianten-Quellen',
    ).toBe(false);
  });
});

describe('Navigation', () => {
  const items = getNavigationItems();

  it('führt Team unter "Über uns"', () => {
    const ueberUns = items.find(
      (item): item is NavigationDropdownItem => 'children' in item && item.label === 'Über uns',
    );
    expect(ueberUns, 'Dropdown "Über uns" fehlt').toBeDefined();
    const team = ueberUns!.children.find((c) => c.label === 'Team');
    expect(team, 'Team-Eintrag fehlt').toBeDefined();
    expect(team!.url).toBe('/team/');
  });

  it('hält die Nav-URL und die Route zusammen', () => {
    const ueberUns = items.find(
      (item): item is NavigationDropdownItem => 'children' in item && item.label === 'Über uns',
    )!;
    const url = ueberUns.children.find((c) => c.label === 'Team')!.url;
    const seg = url.replace(/^\/+/, '').replace(/\/+$/, '');
    expect(fs.existsSync(path.resolve(`./src/pages/${seg}.astro`)), url).toBe(true);
  });
});
