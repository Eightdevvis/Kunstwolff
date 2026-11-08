import fs from 'fs';
import path from 'path';
import { lookupTitleDimensions, lookupTitleMetadata } from './titleImages';
import { heroHintergrundVarianten } from './responsiveImages';

/**
 * Optional own photo for phones (≤ 640 px), next to a page's title image.
 *
 * Storage: `public/img/Titelbild/<folder>/mobile/<file>` — the `mobile/`
 * subfolder of the folder the DESKTOP image came from. So it belongs to the
 * page's image, not to a page slug: a city without its own folder shows the
 * default image, and therefore also the default's mobile photo. One rule for
 * all three heroes (Opener, EventHero, SkillHero), derived purely from the
 * desktop `src` — no page has to pass anything new.
 *
 * Folder listings for the desktop pool (`readFolderTitleImages`, events'
 * `firstImageInDir`) only take files, so the subfolder never competes with
 * the desktop image. Focus/frame live in `title.meta.json` under
 * `"<folder>/mobile/<file>"`, sizes in `title.dimensions.json` (the sync walks
 * subfolders). If there is no file, everything stays as before.
 */

const publicRoot = path.resolve('./public');
const titlePrefix = '/img/Titelbild/';
const allowedExtensions = new Set(['.avif', '.webp', '.png', '.jpg', '.jpeg', '.gif']);

export type MobileTitleImage = {
  src: string;
  focus: string;
  frame: number;
  /** `"w / h"` or null when the sync has no sizes yet. */
  aspect: string | null;
};

const cache = new Map<string, MobileTitleImage | null>();

export const resolveMobileTitleImage = (desktopSrc: unknown): MobileTitleImage | null => {
  if (typeof desktopSrc !== 'string' || !desktopSrc.startsWith(titlePrefix)) return null;
  if (cache.has(desktopSrc)) return cache.get(desktopSrc) ?? null;

  let result: MobileTitleImage | null = null;
  try {
    // Paths are URL-encoded per segment (umlauts in folder names).
    const segments = desktopSrc.slice(titlePrefix.length).split('/').map((s) => decodeURIComponent(s));
    const folderSegments = segments.slice(0, -1);
    const mobileDir = path.resolve(publicRoot, 'img', 'Titelbild', ...folderSegments, 'mobile');

    if (folderSegments.length > 0 && mobileDir.startsWith(publicRoot + path.sep) && fs.existsSync(mobileDir)) {
      const file = fs
        .readdirSync(mobileDir, { withFileTypes: true })
        .filter((e) => e.isFile() && allowedExtensions.has(path.extname(e.name).toLowerCase()))
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b))[0];

      if (file) {
        const relativeKey = [...folderSegments, 'mobile', file].join('/');
        const meta = lookupTitleMetadata(relativeKey);
        const dims = lookupTitleDimensions(relativeKey);
        result = {
          src: titlePrefix + [...folderSegments, 'mobile', file].map((s) => encodeURIComponent(s)).join('/'),
          focus: meta.focus,
          frame: meta.frame,
          aspect: dims ? `${dims.width} / ${dims.height}` : null,
        };
      }
    }
  } catch {
    result = null;
  }

  cache.set(desktopSrc, result);
  return result;
};

/**
 * CSS variables for the background heroes (Opener, EventHero). The heroes'
 * phone media queries read `--hero-m-*` first and fall back to the desktop
 * variables, so without a mobile photo this returns '' and nothing changes.
 */
export function heroMobileStyle(desktopSrc: unknown): string {
  const mobile = resolveMobileTitleImage(desktopSrc);
  if (!mobile) return '';

  const framed = Number.isFinite(mobile.frame) && mobile.frame > 0;
  const { w800, w1200 } = heroHintergrundVarianten(mobile.src);
  return (
    `--hero-m-image: url('${mobile.src}'); ` +
    (w800 ? `--hero-m-800: url('${w800}'); ` : '') +
    (w1200 ? `--hero-m-1200: url('${w1200}'); ` : '') +
    `--hero-m-pos: ${mobile.focus}; ` +
    `--hero-m-fit: ${framed ? 'contain' : 'cover'}; ` +
    `--hero-m-frame: ${framed ? `${mobile.frame}px` : '0px'}; ` +
    (mobile.aspect ? `--hero-m-aspect: ${mobile.aspect}; ` : '')
  );
}
