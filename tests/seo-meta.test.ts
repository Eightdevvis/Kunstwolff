import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { isPageHiddenByPath } from '../src/utils/pageVisibility';

/**
 * Nagelt die SEO-Grundlagen fest, die nach dem Domain-Cutover (2026-08-05)
 * gerichtet wurden. Zwei Sorten Prüfung:
 *
 *  1. Quelltext-Prüfungen — laufen immer.
 *  2. `dist/`-Prüfungen — nur wenn ein Build vorliegt. Sie prüfen das, was
 *     Google tatsächlich bekommt, statt das, was der Quelltext verspricht.
 */

const layoutQuelle = fs.readFileSync(path.resolve('./src/layouts/Layout.astro'), 'utf-8');
const galerieQuelle = fs.readFileSync(path.resolve('./src/components/Gallery.astro'), 'utf-8');

const distDa = fs.existsSync(path.resolve('./dist/index.html'));

describe('Französische Seiten sind ausgeblendet', () => {
  it('/fr/ steht in der echten page-visibility.json', () => {
    const roh = fs.readFileSync(path.resolve('./public/config/page-visibility.json'), 'utf-8');
    const hidden: string[] = JSON.parse(roh).hidden;
    // Das Admin-Tool schreibt die Liste ohne Schrägstrich am Ende zurück
    // (normalizeUrlToId), beide Schreibweisen müssen also zählen.
    expect(hidden.some((p) => p === '/fr/' || p === '/fr')).toBe(true);
  });

  it('die Präfix-Regel trifft alle FR-Unterseiten', () => {
    // `/fr/belgique/` stand bis 2026-08-05 auf `index, follow` und lieferte
    // unter `<html lang="fr">` deutsche Navigation, Fußzeile und FAQ.
    expect(isPageHiddenByPath('/fr/belgique/')).toBe(true);
    expect(isPageHiddenByPath('/fr/')).toBe(true);
  });

  it('greift nicht auf deutsche Seiten über', () => {
    expect(isPageHiddenByPath('/frankfurt/')).toBe(false);
  });
});

describe('Layout: hreflang, x-default, Twitter-Cards, OG-Bild', () => {
  it('hreflang wird nur auf indexierbaren Seiten ausgegeben', () => {
    // Eine noindex-Seite, die Sprachalternativen bewirbt, ist ein Widerspruch.
    expect(layoutQuelle).toMatch(/const showAlternates\s*=\s*!shouldNoindex/);
    expect(layoutQuelle).toContain('{showAlternates && alternates.map(');
    // Die alte, ungeschützte Form darf nicht zurückkommen.
    expect(layoutQuelle).not.toContain('{alternates.length > 1 && alternates.map(');
  });

  it('kennt x-default', () => {
    expect(layoutQuelle).toContain('hreflang="x-default"');
  });

  it('gibt Twitter-Cards aus', () => {
    for (const tag of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      expect(layoutQuelle).toContain(tag);
    }
  });

  it('das Standard-OG-Bild ist kein AVIF und existiert', () => {
    const treffer = layoutQuelle.match(/const DEFAULT_OG_IMAGE = "([^"]+)"/);
    expect(treffer).toBeTruthy();
    const pfad = treffer![1]!;
    // Facebook, LinkedIn und X lesen AVIF für og:image nicht zuverlässig.
    expect(pfad.endsWith('.avif')).toBe(false);
    expect(fs.existsSync(path.resolve(`./public${pfad}`))).toBe(true);
  });
});

describe('Galerie hat eine H1', () => {
  it('die Hauptüberschrift ist ein h1, nicht ein h2', () => {
    expect(galerieQuelle).toContain('<h1>Unsere Kunst – alle Bilder</h1>');
  });

  it('das CSS zielt auf dasselbe Element', () => {
    // Sonst ändert sich still die Optik: die Regel hing an `h2`.
    expect(galerieQuelle).toContain('.gallery-container h1 {');
  });
});

describe('lastmod-Register', () => {
  const lastmodPfad = path.resolve('./public/config/lastmod.json');

  it.skipIf(!fs.existsSync(lastmodPfad))('enthält nur gültige ISO-Daten', () => {
    const map: Record<string, string> = JSON.parse(fs.readFileSync(lastmodPfad, 'utf-8'));
    const eintraege = Object.entries(map);
    expect(eintraege.length).toBeGreaterThan(0);

    for (const [pfad, datum] of eintraege) {
      expect(pfad.startsWith('/')).toBe(true);
      expect(pfad.endsWith('/')).toBe(true);
      expect(Number.isNaN(Date.parse(datum))).toBe(false);
    }
  });

  it.skipIf(!fs.existsSync(lastmodPfad))('ist nicht gleichförmig', () => {
    // Der eigentliche Zweck des Skripts: ein für alle Seiten identisches
    // Datum ist kein fehlendes Signal, sondern ein falsches — Google stuft
    // `lastmod` dann dauerhaft als unglaubwürdig ein.
    const map: Record<string, string> = JSON.parse(fs.readFileSync(lastmodPfad, 'utf-8'));
    const werte = new Set(Object.values(map));
    expect(werte.size).toBeGreaterThan(1);
  });
});

// ─── Prüfungen am gebauten Ergebnis ──────────────────────────────────────────

function alleSeiten(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) alleSeiten(p, acc);
    else if (e.name === 'index.html' || e.name === '404.html') acc.push(p);
  }
  return acc;
}

describe.skipIf(!distDa)('Gebautes Ergebnis', () => {
  const seiten = distDa ? alleSeiten(path.resolve('./dist')) : [];

  it('jede Seite hat genau eine H1', () => {
    const abweichend = seiten
      .map((f) => ({ f, n: (fs.readFileSync(f, 'utf-8').match(/<h1[\s>]/g) ?? []).length }))
      .filter((x) => x.n !== 1)
      .map((x) => `${path.relative(process.cwd(), x.f)} (${x.n})`);
    expect(abweichend).toEqual([]);
  });

  it('jede Seite hat einen Canonical', () => {
    const ohne = seiten
      .filter((f) => !/rel="canonical"/.test(fs.readFileSync(f, 'utf-8')))
      .map((f) => path.relative(process.cwd(), f));
    expect(ohne).toEqual([]);
  });

  it('keine ausgeblendete Seite steht in der Sitemap', () => {
    // Die Präfix-Regel steht ZWEIMAL im Code: in `src/utils/pageVisibility.ts`
    // (steuert `<meta robots>`) und noch einmal im Sitemap-Filter in
    // `astro.config.mjs`, weil die Astro-Konfig kein TS-Modul importieren kann.
    // Wer eine Stelle ändert und die andere vergisst, baut Seiten mit
    // `noindex`, die trotzdem in der Sitemap stehen — der schlechteste aller
    // Zustände, weil Google beides sieht. Dieser Test prüft beide gegeneinander.
    const sitemap = fs.readFileSync(path.resolve('./dist/sitemap-0.xml'), 'utf-8');
    const pfade = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
    expect(pfade.length).toBeGreaterThan(0);
    expect(pfade.filter((p) => isPageHiddenByPath(p))).toEqual([]);
  });

  it('jeder Sitemap-Eintrag trägt ein lastmod', () => {
    const sitemap = fs.readFileSync(path.resolve('./dist/sitemap-0.xml'), 'utf-8');
    const urls = (sitemap.match(/<loc>/g) ?? []).length;
    const daten = (sitemap.match(/<lastmod>/g) ?? []).length;
    expect(daten).toBe(urls);
  });
});

/**
 * Titel- und Beschreibungslängen der INDEXIERBAREN Seiten.
 *
 * Google schneidet Titel bei rund 60 und Beschreibungen bei rund 155 Zeichen
 * ab. Ausgeblendete Seiten sind bewusst nicht dabei — sie stehen nicht im
 * Wettbewerb.
 */
describe.skipIf(!distDa)('Snippet-Längen der indexierbaren Seiten', () => {
  /**
   * Bekannte, bewusst offene Fälle. Kein Freibrief: wer hier etwas einträgt,
   * muss den Grund danebenschreiben.
   *
   * `/private-feier/`: Der Titel kommt aus `heroTitle` in `events.json` — und
   * derselbe String ist die SICHTBARE H1 der Seite. Ihn zu kürzen ist eine
   * Textentscheidung von Gabriele, keine technische. Solange er 88 Zeichen
   * hat, schneidet Google ihn im Suchergebnis ab.
   */
  const AUSNAHMEN: Record<string, 'titel' | 'beschreibung' | 'beides'> = {
    '/private-feier/': 'beides',
  };

  const sitemapPfad = path.resolve('./dist/sitemap-0.xml');

  /**
   * Im HTML steht `&amp;` für EIN Zeichen. Ungezählt entschärft, wäre jeder
   * Titel mit einem „&" fünf Zeichen zu lang gemessen – und der Test meldete
   * einen Fehler, den Google gar nicht sieht.
   */
  const entschluesseln = (s: string): string =>
    s
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');

  it('Titel bleiben unter 60, Beschreibungen unter 155 Zeichen', () => {
    const sitemap = fs.readFileSync(sitemapPfad, 'utf-8');
    const pfade = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);

    const zuLang: string[] = [];
    for (const p of pfade) {
      const datei = path.resolve(`./dist${p === '/' ? '/index.html' : `${p}index.html`}`);
      if (!fs.existsSync(datei)) continue;
      const html = fs.readFileSync(datei, 'utf-8');
      const titel = entschluesseln(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
      const beschreibung = entschluesseln(
        html.match(/name="description" content="([^"]*)"/)?.[1] ?? '',
      );
      const ausnahme = AUSNAHMEN[p];

      if (titel.length > 60 && ausnahme !== 'titel' && ausnahme !== 'beides') {
        zuLang.push(`${p} Titel ${titel.length}`);
      }
      if (beschreibung.length > 155 && ausnahme !== 'beschreibung' && ausnahme !== 'beides') {
        zuLang.push(`${p} Beschreibung ${beschreibung.length}`);
      }
    }
    expect(zuLang).toEqual([]);
  });
});
