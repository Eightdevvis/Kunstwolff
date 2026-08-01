import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { getNavigationItems, istSprungmarke, sprungmarkeZuSeite } from '../src/utils/navigation';

/**
 * Sprungmarken in der Navigation müssen überall ein Ziel haben.
 *
 * Der Fall: `navigation.json` führt „FAQ" auf `#faq` und „Anfrage" auf
 * `#contact`. Diese Abschnitte gibt es aber nur auf einem Teil der Seiten. Auf
 * 13 Seiten — /branding/, /canvas/, /contact/, /datenschutz/, /du-bist-kunst/,
 * /faq/, /galerie/, /impressum/, /partner/, /referenzen/, /stimmung-durch-kunst/,
 * /team/ und der 404 — zeigte der Link ins Leere. Ein Klick tat nichts.
 *
 * Es gab dafür einen Klick-Handler, der auf die richtige Seite umleitete. Der
 * griff aber nur bei einem normalen Linksklick mit aktivem JavaScript: ohne JS,
 * bei Mittelklick, „in neuem Tab öffnen" und für Suchmaschinen blieb `#faq`
 * stehen — ein Selbstverweis.
 *
 * Jetzt steht das echte Ziel im HTML, und das Skript wertet den Link zur
 * Sprungmarke auf, wenn der Abschnitt auf dieser Seite existiert.
 *
 * ⚠️ `navigation.json` wird im Admin gepflegt. Kommt dort ein neuer
 * `#`-Eintrag dazu, muss er automatisch mitgedeckt sein — genau das prüft der
 * letzte Test hier.
 */
describe('Sprungmarken in der Navigation', () => {
  it('erkennt Sprungmarken', () => {
    expect(istSprungmarke('#faq')).toBe(true);
    expect(istSprungmarke('/faq/')).toBe(false);
    expect(istSprungmarke('https://example.com')).toBe(false);
  });

  it('führt #faq und #contact auf ihre eigenen Seiten', () => {
    expect(sprungmarkeZuSeite('#faq')).toBe('/faq/');
    expect(sprungmarkeZuSeite('#contact')).toBe('/contact/');
  });

  it('lässt echte Adressen unangetastet', () => {
    expect(sprungmarkeZuSeite('/team/')).toBe('/team/');
    expect(sprungmarkeZuSeite('/schnellzeichner-karikaturist/')).toBe('/schnellzeichner-karikaturist/');
    expect(sprungmarkeZuSeite('https://www.instagram.com/kunstwolff')).toBe(
      'https://www.instagram.com/kunstwolff',
    );
  });

  it('schickt jede andere Sprungmarke auf die Startseite', () => {
    // Dort liegen die Abschnitte – gilt auch für einen künftig im Admin
    // ergänzten Eintrag, den hier niemand kennt.
    expect(sprungmarkeZuSeite('#skills')).toBe('/#skills');
    expect(sprungmarkeZuSeite('#work')).toBe('/#work');
  });

  it('kein Navigations-Ziel bleibt eine nackte Sprungmarke', () => {
    const urls: string[] = [];
    const sammle = (items: ReturnType<typeof getNavigationItems>) => {
      for (const item of items) {
        if ('children' in item) sammle(item.children as never);
        else urls.push(item.url);
      }
    };
    sammle(getNavigationItems());

    expect(urls.length).toBeGreaterThan(0);
    const nachher = urls.map(sprungmarkeZuSeite);
    expect(nachher.filter((u) => u.startsWith('#'))).toEqual([]);
  });

  it('die Ziele der beiden Sonderfälle existieren wirklich als Seite', () => {
    // Sonst hätten wir den toten Link nur verschoben.
    for (const seite of ['src/pages/faq.astro', 'src/pages/contact.astro']) {
      expect(fs.existsSync(path.resolve(seite)), `${seite} fehlt`).toBe(true);
    }
  });
});
