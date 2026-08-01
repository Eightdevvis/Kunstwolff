import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { isPageHiddenByPath } from '../src/utils/pageVisibility';

/**
 * Alte Wix-Adressen dürfen nicht auf einer ausgeblendeten Seite enden.
 *
 * Eine Weiterleitung gibt den Wert der alten Adresse an das Ziel weiter. Steht
 * das Ziel auf `noindex`, verpufft er: Google folgt der Weiterleitung, findet
 * „nicht indexieren" und lässt beides fallen. Bei einer Adresse, die seit Jahren
 * rankt, ist das der teuerste Weg, den Umzug zu vermasseln — und er fällt nicht
 * auf, weil technisch alles funktioniert: 308, Ziel antwortet 200.
 *
 * Am 2026-08-01 traf das zwei der 34 Wix-Adressen:
 *   /aquarelle-galerie          → /aquarelle/ (ausgeblendet, keine Bilder)
 *   /schnellzeichner-duesseldorf → /duesseldorf-…/ (Düsseldorf ist ausgeblendet)
 * Beide zeigen jetzt auf die nächstbeste sichtbare Seite.
 *
 * ⚠️ Nur die Adressen aus dem Wix-Inventar zählen (Anhang A in
 * `reports/cutover-audit-2026-07-30.md`). Die übrigen ~100 Regeln stammen aus
 * den internen Adress-Umstellungen — deren Quellen waren nie öffentlich, weil
 * die Astro-Seite nie live war. Dass die auf ausgeblendete Seiten zeigen, ist
 * richtig so: die Zielseite ist ja bewusst versteckt.
 */

/** Adressen aus den fünf Wix-Sitemaps, die eine Weiterleitung haben. */
const WIX_ADRESSEN = [
  '/kontakt',
  '/kontakt-jenny',
  '/about',
  '/about-3',
  '/about-9',
  '/gallerie',
  '/portfolio',
  '/copy-of-galerie',
  '/portfolio-collections/my-portfolio/szenenmalerei',
  '/portfolio-collections/my-portfolio/storytelling-graphic-recording',
  '/portfolio-collections/my-portfolio/digitale-kunst',
  '/portfolio-collections/my-portfolio/portrait-karikatur-vom-foto',
  '/portfolio-collections/my-portfolio/einladungskarten-mit-karikatur',
  '/schnellzeichnung-galerie',
  '/szenenmaler-galerie',
  '/aquarelle-galerie',
  '/schnellzeichner-duesseldorf',
  '/template/szenenmalerei',
  '/template/storytelling---graphic-recording',
  '/template/schnellzeichnungen',
  '/template/digitale-kunst',
  '/template/vom-foto',
  '/template/manga--und-cartoonstil',
  '/landingpages/landing',
];

type Regel = { source: string; destination: string; permanent?: boolean };

const vercel = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf-8')) as {
  redirects?: Regel[];
};
const regeln = vercel.redirects ?? [];
const nachQuelle = new Map(regeln.map((r) => [r.source, r]));

describe('Weiterleitungen der alten Wix-Adressen', () => {
  it('es gibt überhaupt Regeln', () => {
    expect(regeln.length).toBeGreaterThan(100);
  });

  it.each(WIX_ADRESSEN)('%s hat eine Regel', (quelle) => {
    expect(nachQuelle.has(quelle), `keine Weiterleitung für ${quelle}`).toBe(true);
  });

  it.each(WIX_ADRESSEN)('%s landet auf einer sichtbaren Seite', (quelle) => {
    const regel = nachQuelle.get(quelle);
    if (!regel) return; // der Test darüber meldet das bereits
    const ziel = regel.destination.endsWith('/') ? regel.destination : `${regel.destination}/`;
    expect(
      isPageHiddenByPath(ziel),
      `${quelle} → ${ziel} ist ausgeblendet – der Wert der alten Adresse verpufft`,
    ).toBe(false);
  });

  it('alle Wix-Regeln sind dauerhaft (308/301), nicht temporär', () => {
    const temporaer = WIX_ADRESSEN.map((q) => nachQuelle.get(q))
      .filter((r): r is Regel => !!r)
      .filter((r) => r.permanent !== true)
      .map((r) => r.source);
    expect(temporaer).toEqual([]);
  });
});
