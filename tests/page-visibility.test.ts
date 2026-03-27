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

