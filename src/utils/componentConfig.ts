/**
 * Liest die Component-Visibility-Config aus public/config/components.json.
 * Wird zur Build-Zeit in Astro-Seiten genutzt um Components bedingt zu rendern.
 *
 * Fallback-Kette: page-spezifisch → _default → true
 */

import fs from 'node:fs';
import path from 'node:path';

interface ComponentConfig {
  [category: string]: {
    [pageOrDefault: string]: {
      [componentId: string]: boolean;
    };
  };
}

let _cache: ComponentConfig | null = null;

function loadConfig(): ComponentConfig {
  if (_cache) return _cache;
  try {
    const raw = fs.readFileSync(
      path.join(process.cwd(), 'public/config/components.json'),
      'utf-8',
    );
    _cache = JSON.parse(raw);
    return _cache!;
  } catch {
    return {};
  }
}

export type PageType = 'homepage' | 'landing' | 'event' | 'skill' | 'skill-landing' | 'skill-event';

/**
 * Prüft ob ein Komponent für eine bestimmte Seite aktiviert ist.
 *
 * @param pageType  - Seitentyp ('homepage', 'landing', 'event', 'skill')
 * @param pageSlug  - Slug der konkreten Seite (z.B. 'berlin', 'firmenfeier') oder '' für Homepage
 * @param componentId - ID des Komponenten (z.B. 'opener', 'slideshow', 'faq')
 * @returns true wenn aktiviert (oder nicht konfiguriert), false wenn deaktiviert
 */
export function isComponentEnabled(
  pageType: PageType,
  pageSlug: string,
  componentId: string,
): boolean {
  const config = loadConfig();

  // Seiten-spezifischer Override
  if (pageSlug && config[pageType]?.[pageSlug]?.[componentId] !== undefined) {
    return config[pageType][pageSlug][componentId];
  }

  // Kategorie-Default
  if (config[pageType]?.['_default']?.[componentId] !== undefined) {
    return config[pageType]['_default'][componentId];
  }

  // Fallback: aktiviert
  return true;
}
