import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  filterVisiblePaths,
  isPageHiddenByPath,
  normalizePagePath,
  parsePageVisibilityConfig,
} from '../src/utils/pageVisibility';
import { getLandingSlugs, getVisibleLandingSlugs } from '../src/utils/landings';
import { getEvents, getVisibleEvents } from '../src/utils/events';
import { getSharedSkills, getVisibleSharedSkills } from '../src/utils/skills';

const visibilityPath = path.resolve('./public/config/page-visibility.json');
const originalVisibilityRaw = fs.existsSync(visibilityPath)
  ? fs.readFileSync(visibilityPath, 'utf-8')
  : null;

afterEach(() => {
  if (originalVisibilityRaw === null) {
    if (fs.existsSync(visibilityPath)) fs.unlinkSync(visibilityPath);
  } else {
    fs.writeFileSync(visibilityPath, originalVisibilityRaw, 'utf-8');
  }
});

describe('page visibility primitives', () => {
  it('normalizes page paths safely', () => {
    expect(normalizePagePath('/')).toBe('/');
    expect(normalizePagePath('/berlin/')).toBe('/berlin');
    expect(normalizePagePath('/berlin///?x=1')).toBe('/berlin');
    expect(normalizePagePath('https://example.com/berlin')).toBeNull();
  });

  it('parses hidden entries and drops invalid values', () => {
    const parsed = parsePageVisibilityConfig(
      JSON.stringify({
        hidden: ['/berlin/', '  /berlin  ', '/koeln', 'foo', 123, null],
      }),
    );
    expect(parsed).toEqual(['/berlin', '/koeln']);
  });

  it('checks hidden state against provided set', () => {
    const hidden = new Set(['/berlin', '/schnellzeichner/messe'.replace(/\/+$/g, '')]);
    expect(isPageHiddenByPath('/berlin/', hidden)).toBe(true);
    expect(isPageHiddenByPath('/koeln/', hidden)).toBe(false);
    expect(
      filterVisiblePaths(['/berlin/', '/koeln/', '/schnellzeichner/messe/'], hidden),
    ).toEqual(['/koeln/']);
  });
});

describe('visibility-aware content helpers', () => {
  it('filters landings/events/skills by visibility config', () => {
    const landingSlug = getLandingSlugs()[0];
    const event = getEvents()[0];
    const skill = getSharedSkills()[0];

    expect(landingSlug).toBeTruthy();
    expect(event).toBeTruthy();
    expect(skill).toBeTruthy();
    if (!landingSlug || !event || !skill) {
      throw new Error('Fixture data missing: expected at least one landing, event and skill.');
    }

    const hidden = [
      `/${landingSlug}/`,
      event.link,
      skill.link,
    ];

    fs.writeFileSync(
      visibilityPath,
      `${JSON.stringify({ hidden }, null, 2)}\n`,
      'utf-8',
    );

    const visibleLandingSlugs = getVisibleLandingSlugs();
    const visibleEvents = getVisibleEvents();
    const visibleSkills = getVisibleSharedSkills();

    expect(visibleLandingSlugs).not.toContain(landingSlug);
    expect(visibleEvents.some((x) => x.slug === event.slug)).toBe(false);
    expect(visibleSkills.some((x) => x.link === skill.link)).toBe(false);
  });
});


/**
 * Präfix-Regel (2026-07-30): einen Skill auszublenden muss seine Kombiseiten
 * mitnehmen. Vorher waren von 40 Aquarelle-Seiten **39 weiter indexierbar** —
 * man blendet den Skill aus und Google sieht ihn trotzdem.
 */
describe('Ausblenden wirkt auf Unterseiten', () => {
  const versteckt = new Set(['/aquarelle']);

  it('blendet die Skill-Seite selbst aus', () => {
    expect(isPageHiddenByPath('/aquarelle/', versteckt)).toBe(true);
  });

  it('blendet Skill×Stadt und Skill×Anlass mit aus', () => {
    expect(isPageHiddenByPath('/aquarelle/berlin/', versteckt)).toBe(true);
    expect(isPageHiddenByPath('/aquarelle/hochzeit/', versteckt)).toBe(true);
  });

  it('greift NICHT auf fremde Seiten über', () => {
    expect(isPageHiddenByPath('/schnellzeichner/', versteckt)).toBe(false);
    expect(isPageHiddenByPath('/schnellzeichner/berlin/', versteckt)).toBe(false);
    // Kein Teilstring-Treffer: /aquarelle-xyz/ ist eine andere Seite.
    expect(isPageHiddenByPath('/aquarelle-xyz/', versteckt)).toBe(false);
  });

  it('eine ausgeblendete Stadt blendet keine Skill-Seite aus', () => {
    // Skill×Stadt liegt unter dem SKILL, nicht unter der Stadt.
    expect(isPageHiddenByPath('/schnellzeichner/berlin/', new Set(['/berlin']))).toBe(false);
    expect(isPageHiddenByPath('/berlin/', new Set(['/berlin']))).toBe(true);
  });
});
