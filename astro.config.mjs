// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'fs';
import path from 'path';

import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";

const visibilityConfigPath = path.resolve('./public/config/page-visibility.json');

const normalizePagePath = (input) => {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const noQuery = raw.split('?')[0]?.split('#')[0] ?? raw;
  if (!noQuery.startsWith('/')) return null;
  const trimmed = noQuery.replace(/\/+$/g, '');
  return trimmed === '' ? '/' : trimmed;
};

const readHiddenSet = () => {
  if (!fs.existsSync(visibilityConfigPath)) return new Set();
  try {
    const raw = fs.readFileSync(visibilityConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const hidden = Array.isArray(parsed?.hidden) ? parsed.hidden : [];
    const out = new Set();
    for (const item of hidden) {
      if (typeof item !== 'string') continue;
      const normalized = normalizePagePath(item);
      if (!normalized) continue;
      out.add(normalized);
    }
    return out;
  } catch {
    return new Set();
  }
};

const hiddenPaths = readHiddenSet();

// https://astro.build/config
export default defineConfig({
  site: "https://kunstwolff.de",
  integrations: [
    preact(),
    sitemap({
      filter: (page) => {
        const url = typeof page === 'string' ? page : page?.url;
        if (!url) return true;
        try {
          const pathname = new URL(url).pathname;
          const normalized = normalizePagePath(pathname);
          if (!normalized) return true;
          return !hiddenPaths.has(normalized);
        } catch {
          return true;
        }
      },
    }),
  ],
});