import { heroHintergrundVarianten } from './responsiveImages';
import { resolveMobileTitleImage } from './mobileTitleImage';

/**
 * `<link rel="preload">` for the title image of the BACKGROUND heroes
 * (Opener on home/city pages, EventHero on event pages).
 *
 * Why: the hero image is a CSS background. The browser only finds it after
 * the HTML, the CSS and the style calculation — Lighthouse mobile measured
 * LCP 3.8 s (/berlin/) and 4.3 s (/hochzeit/), and the LCP element was this
 * image. A preload in <head> starts the download right away.
 *
 * Why `href` + `media` and not `imagesrcset`/`imagesizes`: the heroes pick
 * their file with media queries (width + pixel density, plus an optional
 * own phone photo), not by `srcset` rules. `imagesrcset` would let the browser
 * choose by its own arithmetic — a different file than the CSS asks for means
 * the image is downloaded TWICE. So the four cases below mirror the four CSS
 * rules in Opener.astro/EventHero.astro one by one. If those rules change,
 * this has to change with them (tests/hero-preload.test.ts).
 *
 * SkillHero is not covered: its image is a real <img> with `srcset`, which
 * the browser's preload scanner already finds.
 */
export type HeroPreload = { href: string; media?: string };

const MEDIA = {
  // CSS: (max-width: 640px) and (max-resolution: 1.5dppx). At exactly 1.5
  // both phone rules match and the later one (1200) wins – hence 1.49 here.
  phoneLow: '(max-width: 640px) and (max-resolution: 1.49dppx)',
  phoneHigh: '(max-width: 640px) and (min-resolution: 1.5dppx)',
  tablet: '(min-width: 641px) and (max-width: 1200px) and (max-resolution: 1.5dppx)',
  // everything no rule catches keeps the original
  desktop: '(min-width: 1201px), (min-width: 641px) and (min-resolution: 1.51dppx)',
} as const;

export function heroPreloads(desktopSrc: unknown): HeroPreload[] {
  if (typeof desktopSrc !== 'string' || desktopSrc.trim() === '') return [];

  const bg = heroHintergrundVarianten(desktopSrc);
  const mobile = resolveMobileTitleImage(desktopSrc);
  const m = mobile ? heroHintergrundVarianten(mobile.src) : {};

  // Same fallback chains as the `var(…, var(…))` in the hero CSS.
  const cases: [string, string][] = [
    [MEDIA.phoneLow, m.w800 ?? mobile?.src ?? bg.w800 ?? desktopSrc],
    [MEDIA.phoneHigh, m.w1200 ?? mobile?.src ?? bg.w1200 ?? desktopSrc],
    [MEDIA.tablet, bg.w1200 ?? desktopSrc],
    [MEDIA.desktop, desktopSrc],
  ];

  // One link per file; its media queries joined with "," (= or).
  const byHref = new Map<string, string[]>();
  for (const [media, href] of cases) byHref.set(href, [...(byHref.get(href) ?? []), media]);

  if (byHref.size === 1) return [{ href: [...byHref.keys()][0] }];
  return [...byHref].map(([href, medias]) => ({ href, media: medias.join(', ') }));
}
