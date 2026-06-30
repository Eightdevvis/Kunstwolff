/**
 * Liest die Component-Visibility- UND Reihenfolge-Config aus
 * public/config/components.json. Wird zur Build-Zeit in Astro-Seiten genutzt,
 * um den Sektions-Stack jeder Seite zu rendern.
 *
 * EINE QUELLE DER WAHRHEIT (geteilt mit dem Admin-Tool):
 *   `<kategorie>.<slug|_default>._order` ist die kanonische, geordnete Liste
 *   der Sektionen. Die Website rendert ausschließlich daraus (siehe
 *   `resolveSectionOrder` + Registry in den Seiten), und das Admin-Tool
 *   (InterfaceView) liest/schreibt exakt denselben `_order`-Key. Dadurch können
 *   Layout, Config und Admin nicht mehr auseinanderlaufen.
 *
 * Sichtbarkeit pro Sektion: page-spezifisch → _default → true (nur für IDs die
 * ohnehin in `_order` stehen – es gibt also keine "Geister"-Sektionen mehr, die
 * unsichtbar im Layout hängen).
 *
 * Format (deckungsgleich mit dem Admin in interface/InterfaceView.tsx):
 *   {
 *     "landing": {
 *       "_default": { "_order": ["opener", …], "cinemaWelcome": false },
 *       "berlin":   { "_order": [...] }            // optionaler Page-Override
 *     }
 *   }
 */

import fs from 'node:fs';
import path from 'node:path';

type FlagValue = boolean | string[];
type FlagMap = { [key: string]: FlagValue };

interface CategoryConfig {
  /** '_default' plus optionale Page-Slugs; je eine Flag-Map (mit optionalem _order). */
  [pageSlugOrDefault: string]: FlagMap | undefined;
}

interface ComponentConfig {
  [category: string]: CategoryConfig | undefined;
}

const ORDER_KEY = '_order';

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
 * Spiegelt `getEnabled` im Admin: page-Override → _default → true.
 *
 * @param pageType  - Seitentyp ('homepage', 'landing', 'event', 'skill', …)
 * @param pageSlug  - Slug der konkreten Seite (z.B. 'berlin') oder '' für _default
 * @param componentId - ID des Komponenten (z.B. 'opener', 'slideshow', 'faq')
 */
export function isComponentEnabled(
  pageType: PageType,
  pageSlug: string,
  componentId: string,
): boolean {
  const cat = loadConfig()[pageType];

  const pageVal = pageSlug ? cat?.[pageSlug]?.[componentId] : undefined;
  if (typeof pageVal === 'boolean') return pageVal;

  const defVal = cat?.['_default']?.[componentId];
  if (typeof defVal === 'boolean') return defVal;

  return true;
}

/**
 * Kanonische, geordnete Sektions-Liste einer Seite (aus `_order`).
 * Spiegelt `getPageOrder` im Admin: page-Override → _default → leer.
 * Diese Liste IST der Stack – Website und Admin lesen denselben Key.
 */
export function getSectionOrder(pageType: PageType, pageSlug = ''): string[] {
  const cat = loadConfig()[pageType];

  const pageOrder = cat?.[pageSlug || '_default']?.[ORDER_KEY];
  if (Array.isArray(pageOrder)) return pageOrder;

  const defOrder = cat?.['_default']?.[ORDER_KEY];
  if (Array.isArray(defOrder)) return defOrder;

  return [];
}

/**
 * Build-Time-Guardrail: stellt sicher, dass jede in `_order` gelistete Sektion
 * auch eine Komponente im Registry der Seite hat. Schlägt der Build hier fehl,
 * sind components.json und das Layout aus dem Tritt – genau das, was wir
 * strukturell verhindern wollen. Gibt die geordnete Liste zurück.
 */
export function resolveSectionOrder(
  pageType: PageType,
  pageSlug: string,
  registry: Record<string, unknown>,
): string[] {
  const order = getSectionOrder(pageType, pageSlug);
  for (const id of order) {
    if (!(id in registry)) {
      throw new Error(
        `[componentConfig] Sektion "${id}" steht in components.json ` +
          `(${pageType}._order), hat aber keine Komponente im Registry dieser ` +
          `Seite. Layout und Config sind aus dem Tritt – beide angleichen.`,
      );
    }
  }
  return order;
}
