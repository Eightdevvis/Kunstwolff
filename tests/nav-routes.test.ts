import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Regressionsschutz für WEB-001: Der Navigations-Fallback (wenn ein #anchor
// auf der aktuellen Seite fehlt, wird hart auf eine Route navigiert) zeigte
// auf `/faq`, die Route hieß aber `/FAQ` → 404 auf case-sensitivem Hosting.
// Dieser Test stellt sicher, dass JEDER Fallback-Pfad eine echte Route hat.

const navPath = path.resolve('./src/components/header/Navigation.astro');
const pagesDir = path.resolve('./src/pages');

/** Extrahiert alle Fallback-Ziel-Pfade aus Navigation.astro (JSX + JS). */
function extractFallbackPaths(src: string): string[] {
  const paths = new Set<string>();
  // JSX:  data-nav-x-fallback={item.url === '#x' ? '/ziel' : undefined}
  for (const m of src.matchAll(/-fallback=\{[^}]*?\?\s*'([^']+)'/g)) paths.add(m[1]);
  // JS:   getAttribute('data-nav-x-fallback') ?? '/ziel'
  for (const m of src.matchAll(/data-nav-[a-z]+-fallback'\)\s*\?\?\s*'([^']+)'/g)) paths.add(m[1]);
  return [...paths];
}

/** Prüft case-sensitiv, ob zu einem URL-Pfad eine Astro-Route existiert. */
function routeExists(urlPath: string): boolean {
  const seg = urlPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!seg) return fs.existsSync(path.join(pagesDir, 'index.astro'));
  const candidates = [`${seg}.astro`, path.join(seg, 'index.astro')];
  return candidates.some((rel) => {
    const abs = path.join(pagesDir, rel);
    if (!fs.existsSync(abs)) return false;
    // Case-sensitiver Abgleich: realer Dateiname muss exakt passen,
    // damit der Test auch auf case-insensitiven Dateisystemen greift.
    return fs.readdirSync(path.dirname(abs)).includes(path.basename(abs));
  });
}

describe('Navigation-Fallbacks zeigen auf existierende Routen (WEB-001)', () => {
  const src = fs.readFileSync(navPath, 'utf-8');
  const fallbacks = extractFallbackPaths(src);

  it('findet überhaupt Fallback-Pfade', () => {
    expect(fallbacks.length).toBeGreaterThan(0);
  });

  it.each(fallbacks)('Fallback %s hat eine passende Route', (p) => {
    expect(routeExists(p)).toBe(true);
  });
});
