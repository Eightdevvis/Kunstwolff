import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { matchesFAQContext, getFAQsForContext, type FAQItem } from '../src/utils/faq';

/**
 * Die Anlass-Dimension der FAQs kam nie an.
 *
 * `eventKeys` entstand ausschliesslich daraus, dass `city` mit `events/`
 * begann – ein Schmuggelweg, den kein einziger Aufrufer benutzte. Die
 * Event-Seiten übergaben `faq: {}` bzw. nur den Skill. Ergebnis: auf
 * `/firmenfeier/`, `/messe/`, `/hochzeit/` und `/private-feier/` passten alle
 * 71 FAQs mit Treffergüte 0, es entschied die Lesereihenfolge der Dateien, und
 * alle vier zeigten dieselben Fragen wie die Startseite. Ein im Admin
 * gesetzter Anlass-Tag konnte gar nicht wirken.
 *
 * Seit 2026-07-31 hat der Kontext ein eigenes `event`-Feld.
 */

const faq = (tags: Partial<NonNullable<FAQItem['tags']>>): FAQItem => ({
  question: 'F',
  answer: 'A',
  tags: { events: [], skills: [], landings: [], ...tags },
});

describe('Anlass-Tag der FAQs', () => {
  it('zeigt eine Firmenfeier-FAQ auf der Firmenfeier-Seite', () => {
    expect(matchesFAQContext(faq({ events: ['firmenfeier'] }), { event: 'firmenfeier' })).toBe(true);
  });

  it('hält sie von den anderen Anlässen fern – das war der eigentliche Bug', () => {
    const f = faq({ events: ['firmenfeier'] });
    for (const anderer of ['messe', 'hochzeit', 'private-feier']) {
      expect(matchesFAQContext(f, { event: anderer }), anderer).toBe(false);
    }
  });

  it('laesst eine FAQ ganz ohne Tags NICHT ueberall gelten', () => {
    // Umgedreht am 2026-07-31 (Entscheidung Sasha): leer heisst nirgends.
    // Vorher genuegte "kein Tag" als Zustimmung – wer im Admin das Taggen
    // vergass, veroeffentlichte die Frage versehentlich auf allen 170 Seiten.
    // Wer ueberall gelten soll, liegt jetzt ausdruecklich in public/faq/default/
    // und kommt ueber den Auffuell-Topf herein, nicht ueber diese Pruefung.
    expect(matchesFAQContext(faq({}), { event: 'messe' })).toBe(false);
    expect(matchesFAQContext(faq({}), { city: 'berlin' })).toBe(false);
  });

  it('schliesst eine FAQ nicht mehr aus, nur weil sie ein Skill-Label traegt', () => {
    // Der teuerste Nebeneffekt der alten Regel. `categories` fuellte die
    // Skill-Dimension; fragte die Seite Skills nicht ab (also jede Stadt- und
    // jede Anlass-Seite), stimmte die FAQ dagegen und flog raus.
    // Gemessen am 2026-07-31: `rhein-main-gebiet/kosten-2.md` traegt sieben
    // Anlass-Tags, einen Ort-Tag und `categories: [Schnellzeichner]` – und
    // stand auf NULL von 170 Seiten, auch nicht auf ihrer eigenen Stadtseite.
    const mitLabel = { ...faq({ events: ['messe'], landings: ['rhein-main-gebiet'] }), categories: ['Schnellzeichner'] };
    expect(matchesFAQContext(mitLabel, { event: 'messe' })).toBe(true);
    expect(matchesFAQContext(mitLabel, { city: 'rhein-main-gebiet' })).toBe(true);
    // Der Schutz bleibt: auf einer FREMDEN Stadtseite hat sie nichts zu suchen.
    expect(matchesFAQContext(mitLabel, { city: 'berlin' })).toBe(false);
  });

  it('verknüpft Anlass und Skill mit UND', () => {
    const f = faq({ events: ['messe'], skills: ['szenenmaler'] });
    expect(matchesFAQContext(f, { event: 'messe', categories: ['Szenenmaler'] })).toBe(true);
    expect(matchesFAQContext(f, { event: 'messe', categories: ['Schnellzeichner'] })).toBe(false);
    expect(matchesFAQContext(f, { event: 'hochzeit', categories: ['Szenenmaler'] })).toBe(false);
  });

  it('versteht weiterhin den alten Weg über city=events/<slug>', () => {
    // Die FAQ-Dateien liegen als public/faq/events/<slug>/… im Repo, und
    // `cityFromPath` leitet den Wert daraus ab. Der Pfad muss gültig bleiben.
    expect(matchesFAQContext(faq({ events: ['messe'] }), { city: 'events/messe' })).toBe(true);
    expect(matchesFAQContext(faq({ events: ['messe'] }), { city: 'events/hochzeit' })).toBe(false);
  });

  it('verwechselt einen Anlass nicht mit einem Ort', () => {
    // Ohne eigenes Feld landete `firmenfeier` in `landingKeys` – dort wäre es
    // gegen die Orts-Tags geprüft worden und hätte nie gepasst.
    const ortsFaq = faq({ landings: ['berlin'] });
    expect(matchesFAQContext(ortsFaq, { city: 'berlin' })).toBe(true);
    expect(matchesFAQContext(ortsFaq, { event: 'firmenfeier' })).toBe(false);
    expect(matchesFAQContext(ortsFaq, { city: 'firmenfeier' })).toBe(false);
  });
});

describe('die Event-Seiten geben den Anlass auch wirklich mit', () => {
  const lies = (p: string): string => fs.readFileSync(path.resolve(p), 'utf-8');

  it('Anlass-Seite und Skill+Anlass-Seite reichen `event` durch', () => {
    expect(lies('./src/pages/[landing].astro')).toMatch(/faq:\s*\{\s*event:/);
    expect(lies('./src/pages/[skill]/[landing].astro')).toMatch(/faq:\s*\{[^}]*event:/);
  });

  it('FAQ.astro nimmt `event` an und gibt es an die Auswahl weiter', () => {
    const c = lies('./src/components/FAQ.astro');
    expect(c).toMatch(/event\?:\s*string/);
    expect(c).toMatch(/getFAQsForContext\(\{[^}]*event[^}]*\}/);
  });
});

describe('Ein Tag gilt dort, wo danach gefragt wird', () => {
  it('haelt eine Messe-FAQ von Stadt- und Startseite fern', () => {
    // Vorher galt „leer gilt ueberall" auch in die andere Richtung: fragte ein
    // Kontext die Anlass-Dimension gar nicht ab, passte JEDE FAQ. Dadurch
    // stand auf /berlin/ „Wie viel Platz brauchen Sie auf dem Messestand?".
    const messeFaq = faq({ events: ['messe'] });
    expect(matchesFAQContext(messeFaq, { city: 'berlin' })).toBe(false);
    expect(matchesFAQContext(messeFaq, {})).toBe(false);
    expect(matchesFAQContext(messeFaq, { event: 'messe' })).toBe(true);
  });

  it('haelt eine Koeln-FAQ von anderen Staedten fern', () => {
    // Dieselbe Regel, andere Dimension - genau das ist der Punkt: eine Regel.
    const koelnFaq = faq({ landings: ['koeln'] });
    expect(matchesFAQContext(koelnFaq, { city: 'koeln' })).toBe(true);
    expect(matchesFAQContext(koelnFaq, { city: 'berlin' })).toBe(false);
    expect(matchesFAQContext(koelnFaq, { event: 'messe' })).toBe(false);
  });

  it('holt die ungetaggte FAQ ueber den Auffuell-Topf herein, nicht ueber die Pruefung', () => {
    // Der Topf ist jetzt der Ablageort `public/faq/default/`, nicht mehr
    // "hat keine Tags". Die Pruefung selbst sagt nein – aufgefuellt wird
    // danach, in getFAQsForContext. Dieselbe Rolle wie
    // supplementWithDefaultSlides bei den Bildern.
    const default_ = faq({});
    for (const kontext of [{ city: 'berlin' }, { event: 'messe' }, { categories: ['Szenenmaler'] }]) {
      expect(matchesFAQContext(default_, kontext)).toBe(false);
    }
    // Aber sie kommt an: die echten Auffueller liegen in default/ und stehen
    // hinter den eigenen.
    const aufBerlin = getFAQsForContext({ city: 'berlin' });
    expect(aufBerlin.length).toBeGreaterThan(0);
  });

  it('zeigt auf einer Stadtseite keine Anlass-FAQ', () => {
    const ersteVier = getFAQsForContext({ city: 'berlin' }).slice(0, 4);
    expect(ersteVier.filter((f) => (f.tags?.events?.length ?? 0) > 0)).toEqual([]);
    expect(ersteVier.length).toBe(4);
  });

  it('zeigt auf einer Anlass-Seite die eigenen zuerst und fuellt mit Defaults auf', () => {
    const vier = getFAQsForContext({ event: 'messe' }).slice(0, 4);
    const eigene = vier.filter((f) => f.tags?.events?.includes('messe'));
    // Alle vier Plaetze gehen an messe-getaggte FAQs, sobald es genug gibt –
    // aufgefuellt wird nur, was uebrig bleibt. (Vorher stand hier 3: zwei
    // messe-FAQs waren durch ihr Skill-Label ausgeschlossen.)
    expect(eigene.length).toBe(4);
    expect(vier.length).toBe(4);
  });
});
