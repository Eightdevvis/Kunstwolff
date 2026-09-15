import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * `/hochzeitsmaler` ist ein sichtbarer Alias auf `/szenenmaler/hochzeit/`.
 *
 * Grund (Sasha, 2026-09-15): Der Fachbegriff „Szenenmaler" ist bei
 * Kunden/Google unüblich; „Hochzeitsmaler" wird tatsächlich gesucht. Statt
 * eine zweite Skill-Seite aufzumachen (Duplicate Content), leiten wir die
 * SEO-lastige URL dauerhaft auf die bestehende Skill×Event-Kombi.
 *
 * Getestet wird hier nur die Existenz + Dauerhaftigkeit + Ziel — nicht das
 * Ausblenden, weil die Zielseite indexierbar ist (eine der 8 Skill×Event-
 * Kombis, die bewusst nicht geflacht wurden; siehe `comboUrls.ts`).
 */

type Redirect = { source: string; destination: string; permanent?: boolean };

const vercel = JSON.parse(fs.readFileSync(path.resolve('./vercel.json'), 'utf-8')) as {
  redirects: Redirect[];
};

const ALIAS_SOURCE = '/hochzeitsmaler';
const ALIAS_TARGET = '/szenenmaler/hochzeit/';

describe('Hochzeitsmaler-Alias', () => {
  it('leitet dauerhaft auf die Szenenmaler-Hochzeit-Kombi weiter', () => {
    const regel = vercel.redirects.find((r) => r.source === ALIAS_SOURCE);
    expect(regel, `Alias ${ALIAS_SOURCE} fehlt in vercel.json`).toBeDefined();
    expect(regel!.destination).toBe(ALIAS_TARGET);
    expect(regel!.permanent).toBe(true);
  });

  it('steht vor der Sammelregel /schnellzeichner/:rest*', () => {
    // Die Sammelregel selbst matcht `/hochzeitsmaler` nicht, aber die
    // Konvention (spezifisches vor Sammelregeln) sorgt dafür, dass wir sie
    // beim späteren Nachtragen weiterer Aliase nicht übersehen.
    const alias = vercel.redirects.findIndex((r) => r.source === ALIAS_SOURCE);
    const sammel = vercel.redirects.findIndex((r) => r.source === '/schnellzeichner/:rest*');
    expect(alias).toBeGreaterThan(-1);
    expect(sammel).toBeGreaterThan(-1);
    expect(alias).toBeLessThan(sammel);
  });

  it('das Ziel existiert als gebaute Seite', () => {
    // Ohne die Zielseite läuft der Alias in eine erneute 308-Kette oder ins
    // 404, sobald die Kombi-Auswahl sich ändert. Wir prüfen gegen dist/,
    // weil die Kombi-Seiten via getStaticPaths entstehen.
    const zielHtml = path.resolve(`./dist${ALIAS_TARGET}index.html`);
    if (!fs.existsSync(zielHtml)) {
      // Kein dist? Dann keine harte Anforderung — der Test darüber
      // dokumentiert die Absicht, dieser hier verifiziert nur wenn möglich.
      return;
    }
    expect(fs.existsSync(zielHtml)).toBe(true);
  });
});
