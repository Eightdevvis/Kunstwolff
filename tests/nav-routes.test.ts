import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { getNavigationItems, sprungmarkeZuSeite } from '../src/utils/navigation';
import { getLandingSlugs } from '../src/utils/landings';
import { getEventSlugs } from '../src/utils/events';
import { getSkillSlugs } from '../src/utils/skills';

// Regressionsschutz für WEB-001: Der Navigations-Fallback (wenn ein #anchor
// auf der aktuellen Seite fehlt, wird auf eine Route ausgewichen) zeigte auf
// `/faq`, die Route hieß aber `/FAQ` → 404 auf case-sensitivem Hosting.
//
// Am 2026-08-01 umgebaut: die Ziele stehen nicht mehr als `data-*-fallback`
// in Navigation.astro, sondern in `navigation.ts` (`sprungmarkeZuSeite`), und
// sie landen direkt im `href`. Der Test prüft deshalb jetzt die echten
// Navigations-Einträge statt der weggefallenen Attribute — das deckt mehr ab
// als vorher, weil auch die Untermenü-Links und alles aus `navigation.json`
// mitlaufen.

const pagesDir = path.resolve('./src/pages');

// Aus den dynamischen Routen [skill].astro und [landing].astro entstehen Seiten,
// zu denen es keine gleichnamige Datei gibt. Sie kommen aus denselben Quellen,
// die die Seiten selbst benutzen — deshalb hier dieselben Funktionen.
const erzeugteSlugs = new Set<string>([
  ...getSkillSlugs(),
  ...getLandingSlugs(),
  ...getEventSlugs(),
]);

/** Prüft case-sensitiv, ob zu einem URL-Pfad eine Astro-Route existiert. */
function routeExists(urlPath: string): boolean {
  const seg = urlPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!seg) return fs.existsSync(path.join(pagesDir, 'index.astro'));
  if (erzeugteSlugs.has(seg)) return true;
  const candidates = [`${seg}.astro`, path.join(seg, 'index.astro')];
  return candidates.some((rel) => {
    const abs = path.join(pagesDir, rel);
    if (!fs.existsSync(abs)) return false;
    // Case-sensitiver Abgleich: realer Dateiname muss exakt passen,
    // damit der Test auch auf case-insensitiven Dateisystemen greift.
    return fs.readdirSync(path.dirname(abs)).includes(path.basename(abs));
  });
}

/** Alle Ziele der Navigation, Untermenüs eingeschlossen. */
function alleZiele(): string[] {
  const urls: string[] = [];
  const sammle = (items: ReturnType<typeof getNavigationItems>) => {
    for (const item of items) {
      if ('children' in item) sammle(item.children as never);
      else urls.push(item.url);
    }
  };
  sammle(getNavigationItems());
  return urls;
}

// Nur interne Ziele; externe Links und Dateien prüft dieser Test nicht.
const interneZiele = [...new Set(alleZiele().map(sprungmarkeZuSeite))]
  .filter((u) => u.startsWith('/'))
  .map((u) => u.split('#')[0])
  .filter((u) => u !== '' && !/\.[a-z0-9]{2,4}$/i.test(u));

describe('Navigations-Ziele zeigen auf existierende Routen (WEB-001)', () => {
  it('findet überhaupt interne Ziele', () => {
    expect(interneZiele.length).toBeGreaterThan(0);
  });

  it('keine nackte Sprungmarke bleibt als Ziel stehen', () => {
    const roh = alleZiele().map(sprungmarkeZuSeite);
    expect(roh.filter((u) => u.startsWith('#'))).toEqual([]);
  });

  it.each(interneZiele)('Ziel %s hat eine passende Route', (p) => {
    expect(routeExists(p)).toBe(true);
  });
});
