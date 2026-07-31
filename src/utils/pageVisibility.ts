import fs from 'fs';
import path from 'path';

type PageVisibilityConfig = {
  hidden?: unknown;
};

const visibilityConfigPath = path.resolve('./public/config/page-visibility.json');

export function normalizePagePath(input: string): string | null {
  const raw = String(input ?? '').trim();
  if (!raw) return null;
  const noQuery = raw.split('?')[0]?.split('#')[0] ?? raw;
  if (!noQuery.startsWith('/')) return null;
  const trimmed = noQuery.replace(/\/+$/g, '');
  return trimmed === '' ? '/' : trimmed;
}

export function parsePageVisibilityConfig(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as PageVisibilityConfig;
    const hidden = Array.isArray(parsed?.hidden) ? parsed.hidden : [];
    const unique = new Set<string>();
    for (const item of hidden) {
      if (typeof item !== 'string') continue;
      const normalized = normalizePagePath(item);
      if (!normalized) continue;
      unique.add(normalized);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function getHiddenPagePaths(): string[] {
  if (!fs.existsSync(visibilityConfigPath)) return [];
  try {
    const raw = fs.readFileSync(visibilityConfigPath, 'utf-8');
    return parsePageVisibilityConfig(raw);
  } catch {
    return [];
  }
}

export function getHiddenPagePathSet(): Set<string> {
  return new Set(getHiddenPagePaths());
}

/**
 * Ist diese Seite ausgeblendet — sie selbst ODER eine ihrer Unterseiten?
 *
 * **Präfix, nicht nur exakt** (2026-07-30). Wer `/aquarelle/` ausblendet, meint
 * auch `/aquarelle/berlin/` und `/aquarelle/hochzeit/`: die Kombiseiten werden
 * aus dem Skill erzeugt und haben ohne ihn keinen Sinn. Mit reiner
 * Gleichheitsprüfung blieben von 40 Seiten **39 indexierbar** — man blendet den
 * Skill aus und Google sieht ihn weiter.
 *
 * Greift bewusst NICHT zu weit: Skill×Stadt-Seiten liegen unter dem SKILL
 * (`/schnellzeichner/berlin/`), nicht unter der Stadt. Eine ausgeblendete Stadt
 * blendet also nur sich selbst aus.
 *
 * ⚠️ Dieselbe Regel steckt ein zweites Mal im Sitemap-Filter in
 * `astro.config.mjs` — die Konfig kann dieses TS-Modul nicht importieren. Wer
 * hier etwas ändert, muss dort nachziehen, sonst steht eine Seite mit `noindex`
 * trotzdem in der Sitemap.
 */
export function isPageHiddenByPath(pathname: string, hiddenSet?: Set<string>): boolean {
  const normalized = normalizePagePath(pathname);
  if (!normalized) return false;
  const set = hiddenSet ?? getHiddenPagePathSet();
  if (set.has(normalized)) return true;
  for (const hidden of set) {
    if (hidden !== '/' && normalized.startsWith(`${hidden}/`)) return true;
  }
  return false;
}

export function filterVisiblePaths(paths: string[], hiddenSet?: Set<string>): string[] {
  const set = hiddenSet ?? getHiddenPagePathSet();
  return paths.filter((p) => {
    const normalized = normalizePagePath(p);
    if (!normalized) return false;
    return !isPageHiddenByPath(normalized, set);
  });
}

