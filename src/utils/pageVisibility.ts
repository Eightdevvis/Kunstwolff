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

export function isPageHiddenByPath(pathname: string, hiddenSet?: Set<string>): boolean {
  const normalized = normalizePagePath(pathname);
  if (!normalized) return false;
  const set = hiddenSet ?? getHiddenPagePathSet();
  return set.has(normalized);
}

export function filterVisiblePaths(paths: string[], hiddenSet?: Set<string>): string[] {
  const set = hiddenSet ?? getHiddenPagePathSet();
  return paths.filter((p) => {
    const normalized = normalizePagePath(p);
    if (!normalized) return false;
    return !set.has(normalized);
  });
}

