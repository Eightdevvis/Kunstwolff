import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { heroPreloads } from '../src/utils/heroPreload';

/**
 * The preload must name EXACTLY the file the hero CSS will ask for – a
 * different one is a second download of the largest image on the page.
 * See src/utils/heroPreload.ts.
 */
const read = (p: string) => fs.readFileSync(path.resolve(p), 'utf-8');

describe('heroPreloads', () => {
  it('returns nothing without an image', () => {
    expect(heroPreloads('')).toEqual([]);
    expect(heroPreloads(undefined)).toEqual([]);
  });

  it('uses one link without media when there are no variants (AVIF)', () => {
    expect(heroPreloads('/img/Titelbild/default/titelbild.avif')).toEqual([
      { href: '/img/Titelbild/default/titelbild.avif' },
    ]);
  });

  it('covers phone, tablet and desktop with media queries, one link per file', () => {
    const dir = path.resolve('public/img/Titelbild/berlin');
    const file = fs.readdirSync(dir).find((f) => f.endsWith('.webp'));
    if (!file) return; // content can change; the CSS mirror test below still runs
    const links = heroPreloads(`/img/Titelbild/berlin/${file}`);
    expect(new Set(links.map((l) => l.href)).size).toBe(links.length);
    for (const l of links) expect(l.media).toBeTruthy();
    const all = links.map((l) => l.media).join(', ');
    expect(all).toContain('(max-width: 640px)');
    expect(all).toContain('(min-width: 1201px)');
  });

  it('mirrors the media rules of both background heroes', () => {
    // If one of these lines changes in the hero CSS, heroPreload.ts has to follow.
    for (const file of ['src/components/hero/Opener.astro', 'src/components/events/EventHero.astro']) {
      const css = read(file);
      expect(css).toContain('@media (max-width: 640px) and (max-resolution: 1.5dppx)');
      expect(css).toContain('@media (max-width: 640px) and (min-resolution: 1.5dppx)');
      expect(css).toContain('@media (min-width: 641px) and (max-width: 1200px) and (max-resolution: 1.5dppx)');
      expect(css).toContain('var(--hero-m-800, var(--hero-m-image, var(--hero-bg-800, var(--hero-bg-image))))');
      expect(css).toContain('var(--hero-m-1200, var(--hero-m-image, var(--hero-bg-1200, var(--hero-bg-image))))');
    }
  });
});
