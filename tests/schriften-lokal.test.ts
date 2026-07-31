import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Schriften dürfen nicht von fremden Servern kommen.
 *
 * Bis 2026-07-31 lud jede der 174 Seiten Inter von fonts.googleapis.com und
 * fonts.gstatic.com. Damit ging die IP jedes Besuchers an Google, ohne
 * Einwilligung – die Konstellation aus LG München I, 3 O 17493/20, und das
 * meistabgemahnte Website-Muster in Deutschland. Auf einer .de-Domain mit
 * Impressum ist das ein leicht auffindbares Ziel.
 *
 * Dieser Test hält den Zustand fest, damit die Zeilen nicht versehentlich
 * zurückkommen – etwa beim Kopieren eines Snippets aus einem Tutorial.
 */

const lies = (p: string): string => fs.readFileSync(path.resolve(p), 'utf-8');

const quellDateien = (): string[] => {
  const raus: string[] = [];
  const gehe = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) gehe(p);
      else if (/\.(astro|css|ts|tsx|js|jsx|html)$/.test(e.name)) raus.push(p);
    }
  };
  gehe(path.resolve('./src'));
  return raus;
};

describe('Schriften kommen vom eigenen Server', () => {
  it('lädt nirgends von fonts.googleapis.com oder fonts.gstatic.com', () => {
    // Absichtlich nur echte Verweise (`url(…)`, `href=…`, `src=…`) – die
    // Kommentare daneben nennen die Hosts, weil sonst niemand versteht,
    // warum die Zeilen weg sind.
    const verweis = /(?:url\(|href=|src=)\s*["'(]?\s*https?:\/\/fonts\.(?:googleapis|gstatic)\.com/i;
    const treffer = quellDateien().filter((p) => verweis.test(lies(p)));
    expect(treffer).toEqual([]);
  });

  it('baut keine Verbindung zu Google vor (preconnect)', () => {
    const vorverbindung = /rel=["']?(?:preconnect|dns-prefetch)["']?[^>]*fonts\.(?:googleapis|gstatic)\.com/i;
    const treffer = quellDateien().filter((p) => vorverbindung.test(lies(p)));
    expect(treffer).toEqual([]);
  });

  it('liefert die Inter-Dateien selbst aus', () => {
    // Google gibt Inter als VARIABLE Schrift aus – alle vier früher einzeln
    // angeforderten Gewichte waren byteweise dieselbe Datei. Deshalb zwei
    // Dateien statt acht.
    for (const datei of ['inter-latin.woff2', 'inter-latin-ext.woff2', 'OFL.txt']) {
      const p = path.resolve('./public/fonts/inter', datei);
      expect(fs.existsSync(p), datei).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(1000);
    }
  });

  it('deklariert Inter mit Gewichtsbereich und font-display: swap', () => {
    const css = lies('./src/styles/global.css');
    const bloecke = css.match(/@font-face\s*\{[^}]*Inter[^}]*\}/g) ?? [];
    expect(bloecke).toHaveLength(2);
    for (const b of bloecke) {
      expect(b).toMatch(/font-weight:\s*100 900/);
      expect(b).toMatch(/font-display:\s*swap/);
      expect(b).toMatch(/unicode-range:/);
      expect(b).toMatch(/\/fonts\/inter\//);
    }
  });

  it('lädt die meistgebrauchte Schrift vorab', () => {
    // Die @font-face steht hinter mehreren CSS-@imports und würde sonst erst
    // spät entdeckt – derselbe Grund wie beim Mayonice-Preload daneben.
    const layout = lies('./src/layouts/Layout.astro');
    expect(layout).toMatch(/rel="preload"[^>]*\/fonts\/inter\/inter-latin\.woff2/);
  });
});
