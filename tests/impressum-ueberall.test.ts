import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * Das Impressum muss von JEDER Seite aus erreichbar sein — das ist Pflicht,
 * nicht Kür (§ 5 DDG, früher § 5 TMG: „leicht erkennbar, unmittelbar erreichbar
 * und ständig verfügbar").
 *
 * Getragen wird das vom Fußbereich, und der hängt am Layout. Eine Seite ohne
 * Layout hat also kein Impressum. Am 2026-08-01 gab es genau zwei solche Fälle:
 *
 *   - `public/fonts/mayonice/demo.html` — die Beispielseite des Schriften-
 *     Konverters (Transfonter). Lag unter `public/` und wurde damit 1:1
 *     ausgeliefert, an Astro und am Layout vorbei. Nirgends verlinkt, aber
 *     abrufbar. Entfernt: sie war nie Inhalt der Website.
 *   - `/gallerie/` (mit Schrägstrich) — Astros Weiterleitungs-Stummel. Die
 *     301-Regel in `vercel.json` fing nur `/gallerie` OHNE Schrägstrich ab,
 *     mit Schrägstrich kam der Stummel mit 200 durch. Jetzt sind beide Formen
 *     abgedeckt, der Stummel wird nie ausgeliefert.
 *
 * Die drei Tests hier decken die drei Wege ab, auf denen das wiederkommen kann:
 * eine HTML-Datei unter `public/`, eine Seite ohne Layout, oder ein Fußbereich
 * ohne den Link.
 */

const pagesDir = path.resolve('src/pages');
const publicDir = path.resolve('public');

const sammleDateien = (dir: string, endung: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) sammleDateien(p, endung, out);
    else if (e.name.endsWith(endung)) out.push(p);
  }
  return out;
};

describe('Impressum ist von überall erreichbar', () => {
  it('der Fußbereich verlinkt Impressum und Datenschutz', () => {
    const footer = fs.readFileSync(path.resolve('src/components/Footer.astro'), 'utf-8');
    expect(footer).toMatch(/href="\/impressum"/);
    expect(footer).toMatch(/href="\/datenschutz"/);
  });

  it('unter public/ liegt keine HTML-Datei — die käme am Layout vorbei', () => {
    const gefunden = sammleDateien(publicDir, '.html').map((p) => path.relative(publicDir, p));
    expect(
      gefunden,
      `Diese Dateien werden 1:1 ausgeliefert, ohne Fußbereich und ohne Impressum:\n${gefunden.join('\n')}`,
    ).toEqual([]);
  });

  it('jede Seite steckt in einem Layout', () => {
    const seiten = sammleDateien(pagesDir, '.astro');
    expect(seiten.length).toBeGreaterThan(0);
    const ohne = seiten
      // `<Layout …>` genauso wie `<SkillLayout …>` oder `<EventLayout …>`.
      .filter((p) => !/<[A-Za-z]*Layout[\s>]/.test(fs.readFileSync(p, 'utf-8')))
      .map((p) => path.relative(pagesDir, p));
    expect(ohne, `ohne Layout und damit ohne Fußbereich:\n${ohne.join('\n')}`).toEqual([]);
  });

  it('der Weiterleitungs-Stummel /gallerie/ wird nie ausgeliefert', () => {
    // Astro erzeugt für seine `redirects` eine Meta-Refresh-Seite. Die hat
    // keinen Fußbereich. Sie darf nur existieren, solange die echte 301 sie
    // in BEIDEN Schreibweisen verdeckt.
    const vercel = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf-8')) as {
      redirects?: { source: string; destination: string }[];
    };
    const quellen = new Set((vercel.redirects ?? []).map((r) => r.source));
    for (const form of ['/gallerie', '/gallerie/']) {
      expect(quellen.has(form), `${form} wird von keiner 301-Regel abgefangen`).toBe(true);
    }
  });
});
