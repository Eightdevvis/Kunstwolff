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
 * Am 2026-08-01 traf das `/aquarelle-galerie` → `/aquarelle/` (ausgeblendet,
 * keine Bilder). Die Adresse zeigt jetzt auf die nächstbeste sichtbare Seite.
 *
 * ⚠️ Nur die Adressen aus dem Wix-Inventar zählen (Anhang A in
 * `reports/cutover-audit-2026-07-30.md`). Die übrigen ~100 Regeln stammen aus
 * den internen Adress-Umstellungen — deren Quellen waren nie öffentlich, weil
 * die Astro-Seite nie live war. Dass die auf ausgeblendete Seiten zeigen, ist
 * richtig so: die Zielseite ist ja bewusst versteckt.
 */

/**
 * Das VOLLSTÄNDIGE Wix-Inventar: alle Adressen aus den fünf Sitemaps unter
 * https://www.kunstwolff.de/sitemap.xml, gezogen am 2026-08-01.
 *
 * Die Liste muss vollständig sein, sonst prüft der Test nur das, was ohnehin
 * schon abgedeckt ist. Genau das war sie vorher nicht: sie enthielt 24 Einträge,
 * davon zwei erfundene (`/gallerie` und `/schnellzeichner-duesseldorf` stehen in
 * keiner Wix-Sitemap), und es fehlten sieben echte Adressen ganz ohne Regel —
 * die wären am Umzugstag ins 404 gelaufen, ohne dass ein Test gemeckert hätte.
 *
 * Neu ziehen lässt sie sich so:
 *   curl -s https://www.kunstwolff.de/sitemap.xml   # → die fünf Teil-Sitemaps
 *   curl -s <jede davon> | grep -o '<loc>[^<]*</loc>'
 */
const WIX_ADRESSEN = [
  '/about',
  '/about-3',
  '/about-9',
  '/aquarelle-galerie',
  '/copy-of-galerie',
  '/galerie',
  '/impressum',
  '/kontakt',
  '/kontakt-jenny',
  '/landingpages/landing',
  '/portfolio',
  '/portfolio-collections/my-portfolio',
  '/portfolio-collections/my-portfolio/digitale-kunst',
  '/portfolio-collections/my-portfolio/einladungskarten-mit-karikatur',
  '/portfolio-collections/my-portfolio/karikaturen-schwarz-weiß',
  '/portfolio-collections/my-portfolio/portrait-karikatur-vom-foto',
  '/portfolio-collections/my-portfolio/storytelling-graphic-recording',
  '/portfolio-collections/my-portfolio/szenenmalerei',
  '/portfolio-collections/my-portfolio/veranstaltungen',
  '/referenzen',
  '/schnellzeichnung-galerie',
  '/szenenmaler-galerie',
  '/template/allur-postkarten',
  '/template/allur-surrealismus',
  '/template/digitale-kunst',
  '/template/einladungskarten-hochzeit%26geburtstag',
  '/template/fuer-evente-aller-art',
  '/template/manga--und-cartoonstil',
  '/template/modezeichnungen',
  '/template/schnellzeichnungen',
  '/template/storytelling---graphic-recording',
  '/template/szenenmalerei',
  '/template/vom-foto',
];

type Regel = { source: string; destination: string; permanent?: boolean };

const vercel = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf-8')) as {
  redirects?: Regel[];
};
const regeln = vercel.redirects ?? [];
const nachQuelle = new Map(regeln.map((r) => [r.source, r]));

/**
 * Bildet nach, was Vercel tut: die Regeln der Reihe nach durchgehen und die
 * ERSTE nehmen, die passt — genaue wie Sammelregeln (`/template/:rest*`).
 *
 * Ein bloßer Abgleich auf exakte Quellen reicht nicht. Er meldet Adressen als
 * unversorgt, die längst von einer Sammelregel abgefangen werden (das ist mir
 * am 2026-08-01 selbst passiert), und er übersieht umgekehrt, wenn eine
 * Sammelregel vor die genaue Regel rutscht und sie tot macht.
 *
 * Die Quelle darf percent-kodiert oder dekodiert stehen: `ß` und `&` kommen in
 * den alten Adressen in beiden Schreibweisen vor.
 */
const alsMuster = (source: string): RegExp =>
  new RegExp(
    `^${source
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/:[A-Za-z]+\*/g, '(?:.*)')
      .replace(/:[A-Za-z]+/g, '(?:[^/]+)')}$`,
  );

const regelFuer = (quelle: string): Regel | undefined => {
  const formen = new Set([quelle, decodeURIComponent(quelle)]);
  for (const regel of regeln) {
    const muster = alsMuster(regel.source);
    const quelleDekodiert = (() => {
      try {
        return decodeURIComponent(regel.source);
      } catch {
        return regel.source;
      }
    })();
    const musterDekodiert = alsMuster(quelleDekodiert);
    for (const form of formen) {
      if (muster.test(form) || musterDekodiert.test(form)) return regel;
    }
  }
  return undefined;
};

const eigeneSeite = (quelle: string): boolean =>
  fs.existsSync(path.resolve(`src/pages${quelle}.astro`)) ||
  fs.existsSync(path.resolve(`src/pages${quelle}/index.astro`));

describe('Weiterleitungen der alten Wix-Adressen', () => {
  it('es gibt überhaupt Regeln', () => {
    expect(regeln.length).toBeGreaterThan(100);
  });

  it.each(WIX_ADRESSEN)('%s läuft nicht ins 404', (quelle) => {
    expect(
      !!regelFuer(quelle) || eigeneSeite(quelle),
      `${quelle} hat weder eine Weiterleitung noch eine eigene Seite – am Umzugstag ein 404 auf eine heute erreichbare Adresse`,
    ).toBe(true);
  });

  it.each(WIX_ADRESSEN)('%s landet auf einer sichtbaren Seite', (quelle) => {
    const regel = regelFuer(quelle);
    if (!regel) return; // der Test darüber meldet das bereits
    const ziel = regel.destination.endsWith('/') ? regel.destination : `${regel.destination}/`;
    expect(
      isPageHiddenByPath(ziel),
      `${quelle} → ${ziel} ist ausgeblendet – der Wert der alten Adresse verpufft`,
    ).toBe(false);
  });

  /**
   * Die Sammelregeln schicken alles unter `/template/` und
   * `/portfolio-collections/` pauschal auf `/galerie/`. Für drei Adressen ist
   * das zu grob – sie handeln von Schnellzeichnen, nicht von Bildern:
   */
  const GENAUERES_ZIEL: Record<string, string> = {
    '/portfolio-collections/my-portfolio/karikaturen-schwarz-weiß': '/schnellzeichner-karikaturist/',
    '/portfolio-collections/my-portfolio/veranstaltungen': '/schnellzeichner-karikaturist/',
    '/template/fuer-evente-aller-art': '/schnellzeichner-karikaturist/',
  };

  it.each(Object.entries(GENAUERES_ZIEL))(
    '%s wird nicht von der Sammelregel verschluckt',
    (quelle, ziel) => {
      expect(
        regelFuer(quelle)?.destination,
        `${quelle} landet auf der Sammelregel – die genaue Regel steht zu weit hinten`,
      ).toBe(ziel);
    },
  );

  it('alle Wix-Regeln sind dauerhaft (308/301), nicht temporär', () => {
    const temporaer = WIX_ADRESSEN.map((q) => regelFuer(q))
      .filter((r): r is Regel => !!r)
      .filter((r) => r.permanent !== true)
      .map((r) => r.source);
    expect(temporaer).toEqual([]);
  });
});
