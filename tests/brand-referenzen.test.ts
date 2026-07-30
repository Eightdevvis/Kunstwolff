import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildBrandLabel, getBrandLogos } from '../src/utils/brandLogos';

// Auf `/referenzen/` lief lange derselbe animierte Logo-Streifen wie im Hero.
// Dort ist die Firmenliste aber der INHALT der Seite und kein Teaser: man muss
// alle auf einen Blick sehen, statt zu warten, bis die gesuchte vorbeikommt –
// und den Namen braucht es sichtbar, nicht nur als Tooltip (auf dem Handy gibt
// es kein Hover). Dieser Test nagelt das fest, damit es nicht still zurückfällt.

const lies = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');

describe('Referenzen-Seite zeigt ein Gitter, keinen Laufstreifen', () => {
  const seite = lies('./src/pages/referenzen.astro');

  it('bindet BrandGrid ein', () => {
    expect(seite).toContain('BrandGrid');
    expect(seite).toMatch(/<BrandGrid\s*\/>/);
  });

  it('bindet den Laufstreifen NICHT mehr ein', () => {
    expect(seite).not.toContain('BrandStripe');
  });

  it('lässt den Laufstreifen im Hero unangetastet', () => {
    // Der Streifen ist dort weiterhin richtig – nur die Referenzen-Seite wechselt.
    expect(lies('./src/components/hero/Opener.astro')).toContain('<BrandStripe />');
  });

  it('zeigt im Gitter jeden Namen sichtbar an (nicht nur als Tooltip)', () => {
    const grid = lies('./src/components/reviews-references/BrandGrid.astro');
    expect(grid).toContain('logo.label');
    expect(grid).toContain('getBrandLogos');
  });
});

describe('Anzeigenamen der Referenzlogos', () => {
  it('macht aus Trennzeichen Leerzeichen und wirft die Endung weg', () => {
    expect(buildBrandLabel('acme_gmbh.webp')).toBe('acme gmbh');
    expect(buildBrandLabel('kunde-xyz.png')).toBe('kunde xyz');
  });

  it('entfernt ein angehängtes „logo"', () => {
    expect(buildBrandLabel('Deutsche_Bundesbank_logo.svg')).toBe('Deutsche Bundesbank');
    expect(buildBrandLabel('Acme-LOGO.png')).toBe('Acme');
  });

  it('lässt Abkürzungen in Ruhe', () => {
    expect(buildBrandLabel('CDU.svg')).toBe('CDU');
    expect(buildBrandLabel('ING_Bank.webp')).toBe('ING Bank');
  });

  it('korrigiert, was der Dateiname nicht ausdrücken kann', () => {
    expect(buildBrandLabel('SAmsung.svg')).toBe('Samsung');
    expect(buildBrandLabel('Europäische_Zentral_Bank.svg')).toBe('Europäische Zentralbank');
  });

  it('liefert für jedes echte Logo einen brauchbaren Namen', () => {
    const logos = getBrandLogos();
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      expect(logo.label.trim()).not.toBe('');
      expect(logo.label).not.toMatch(/\.(svg|webp|png|jpe?g|avif|gif)$/i);
      expect(logo.label).not.toMatch(/\slogo$/i);
      expect(logo.label).not.toMatch(/[_]/);
    }
  });
});
