/**
 * events.ts
 *
 * Utility-Funktionen für das Event-Seiten-System.
 *
 * Events sind Veranstaltungstypen (Firmenfeier, Messe, Hochzeit, Private Feier)
 * und funktionieren analog zu Skills – mit eigenem Layout, eigenen Slides und
 * event-spezifischem Content (Ablauf, Pakete, Referenzen).
 *
 * Datenpfade:
 *   - public/events/events.json        → Event-Registry (Liste aller Events)
 *   - public/events/{slug}/content.json → Reicher Content pro Event (Sektionen)
 *   - public/img/slides/events/{slug}/ → Event-spezifische Slides
 *   - public/img/Titelbild/events/{slug}/ → Event-Titelbilder
 */

import fs from 'fs';
import path from 'path';
import { isPageHiddenByPath } from './pageVisibility';
import { getSlidesByTag } from './slideImages';

// ─── Pfad-Konstanten ──────────────────────────────────────────────────────────
const eventsRoot = path.resolve('./public/events');
const eventsJsonPath = path.join(eventsRoot, 'events.json');
const eventSlidesRoot = path.resolve('./public/img/slides/events');
const eventTitelbildRoot = path.resolve('./public/img/Titelbild/events');
const slidesMetadataPath = path.resolve('./public/img/slides/slides.meta.json');

const allowedImageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp']);
const fallbackImage = '/img/samples/sample1.webp';

// ─── Typen ────────────────────────────────────────────────────────────────────

/** Ein einzelner Event-Typ (z.B. Firmenfeier, Messe) */
export type EventItem = {
  title: string;
  /** URL-Slug, z.B. "firmenfeier" */
  slug: string;
  /** Kanonischer Link, z.B. "/firmenfeier/" */
  link: string;
  /** Optionales Vorschaubild (z.B. fuer Homepage-Eventstripe) */
  image?: string;
  /** Überschrift im Hero-Block */
  heroTitle?: string;
  /** Meta-Description für SEO */
  description?: string;
  /**
   * Skill-Kategorien die für diesen Event relevant sind.
   * Steuert welche Skills in EventSkills angezeigt werden.
   */
  categories?: string[];
};

/** Ein Schritt im Ablauf-Timeline */
export type EventAblaufStep = {
  title: string;
  text: string;
  /** Icon-Kennung (chat | setup | star | gift) – für CSS-Icons */
  icon?: string;
};

/** Ein Buchungspaket */
export type EventPaket = {
  title: string;
  duration: string;
  price: string;
  features: string[];
};

/** Logo-Eintrag für Referenzen */
export type EventLogo = {
  src: string;
  alt: string;
};

/**
 * Reicher Content pro Event aus public/events/{slug}/content.json.
 * Jede Sektion hat ein `enabled`-Flag – damit kann das Admin-Tool
 * Sektionen aktivieren/deaktivieren ohne den Code zu ändern.
 */
export type EventContent = {
  ablauf?: {
    enabled: boolean;
    title?: string;
    steps: EventAblaufStep[];
  };
  pakete?: {
    enabled: boolean;
    title?: string;
    items: EventPaket[];
  };
  skills?: {
    enabled: boolean;
    title?: string;
  };
  referenzen?: {
    enabled: boolean;
    title?: string;
    text?: string;
    logos: EventLogo[];
  };
};

/** Slide-Item (analog zu SlideItem in slideImages.ts) */
export type EventSlideItem = {
  src: string;
  alt: string;
  title?: string;
  categories?: string[];
  priority?: number;
};

// ─── Interne Helfer ───────────────────────────────────────────────────────────

/**
 * Slugifiziert einen Text: NFD-Normalisierung, Kleinbuchstaben, Bindestriche.
 * Identische Logik wie in skills.ts.
 */
const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * URL-encodes einen Pfad-Abschnitt – teilweise, nicht am Stück. Am Stück würde ein
 * verschachtelter Schlüssel zu %2F werden, und %2F ist kein Pfadtrenner (siehe slideImages.ts).
 */
const encodePathSegment = (segment: string): string =>
  segment.split('/').map((part) => encodeURIComponent(part)).join('/');

/** Normalisiert Metadata-Keys (Backslashes → Forward Slashes, führende/trailing Slashes entfernen) */
const normalizeMetadataKey = (value: string): string =>
  value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

/** Alt-Text aus Dateinamen ableiten (Zahlen-Prefix entfernen, Underscores zu Leerzeichen) */
const normalizeAlt = (fileName: string): string =>
  decodeURIComponent(fileName)
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[_-]+/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

// ─── Events laden ─────────────────────────────────────────────────────────────

/**
 * Liest events.json und gibt die normalisierte Event-Liste zurück.
 *
 * Normalisierung: Fehlende `slug`-Felder werden aus `title` generiert,
 * fehlende `link`-Felder aus dem Slug.
 */
export const getEvents = (): EventItem[] => {
  if (!fs.existsSync(eventsJsonPath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(eventsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    // Unterstützt sowohl Array-Format als auch { events: [...] } Format
    const rawList: unknown[] = Array.isArray(parsed)
      ? parsed
      : (parsed as Record<string, unknown>).events
        ? ((parsed as Record<string, unknown>).events as unknown[])
        : [];

    return rawList
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map((item): EventItem | null => {
        const title = (item.title as string | undefined)?.trim();
        if (!title) return null;

        // Slug aus JSON oder automatisch aus title generieren
        const slug = ((item.slug as string | undefined)?.trim()) || slugify(title);
        const link = `/${slug}/`;

        return {
          title,
          slug,
          link,
          image: (item.image as string | undefined)?.trim() || undefined,
          heroTitle: (item.heroTitle as string | undefined)?.trim() || undefined,
          description: (item.description as string | undefined)?.trim() || undefined,
          categories: Array.isArray(item.categories)
            ? (item.categories as string[]).filter((c): c is string => typeof c === 'string')
            : undefined,
        };
      })
      .filter((item): item is EventItem => item !== null);
  } catch {
    return [];
  }
};

/**
 * Gibt alle Event-Slugs zurück.
 * Wird in getStaticPaths() von [landing].astro und [...kombi].astro genutzt.
 */
export const getEventSlugs = (): string[] => getEvents().map((e) => e.slug);

export const getVisibleEvents = (): EventItem[] =>
  getEvents().filter((e) => !isPageHiddenByPath(e.link));

export const getVisibleEventSlugs = (): string[] =>
  getVisibleEvents().map((e) => e.slug);

/**
 * Gibt ein einzelnes Event anhand seines Slugs zurück, oder null wenn nicht gefunden.
 */
export const getEventBySlug = (slug: string): EventItem | null =>
  getEvents().find((e) => e.slug === slug) ?? null;

/**
 * Prüft ob ein Slug ein Event-Slug ist (und kein Stadt-Slug).
 * Nützlich um in getStaticPaths() zwischen den beiden zu unterscheiden.
 */
export const isEventSlug = (slug: string): boolean => getEventSlugs().includes(slug);

// ─── Event-Content ────────────────────────────────────────────────────────────

/**
 * Liest den reichen Content eines Events aus public/events/{slug}/content.json.
 *
 * Gibt leeres Objekt zurück wenn die Datei nicht existiert – die Komponenten
 * müssen damit umgehen (graceful degradation).
 */
export const getEventContent = (slug: string): EventContent => {
  const contentPath = path.join(eventsRoot, slug, 'content.json');

  if (!fs.existsSync(contentPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(contentPath, 'utf-8');
    return JSON.parse(raw) as EventContent;
  } catch {
    return {};
  }
};

// ─── Event-Slides ─────────────────────────────────────────────────────────────

/**
 * Liest Slides aus public/img/slides/events/{slug}/.
 *
 * Slides werden analog zu getCitySlides() gelesen, aber aus dem events/-Unterordner.
 * Die slides.meta.json wird ebenfalls ausgewertet – Metadaten-Key-Format:
 * "events/{slug}/dateiname.webp"
 */
export const getEventSlides = (slug: string): EventSlideItem[] =>
  // Seit 2026-07-28 über den TAG statt über den Ordner `events/{slug}/`.
  //
  // Der Gewinn ist hier am größten: die Firmenfeier-Seite hatte GENAU EIN
  // eigenes Bild, obwohl 27 weitere Firmenfeier-Motive im Repo lagen – nur eben
  // in Stadtordnern, weil ein Bild nicht in zwei Ordnern liegen kann. Mit Tags
  // trägt dasselbe Bild Ort UND Anlass und erscheint auf beiden Seiten, ohne
  // dass eine Kopie im Repo dafür nötig wäre.
  //
  // EventSlideItem ist strukturgleich zu SlideItem; die frühere Eigenimplementierung
  // hat nur dieselbe Metadaten-Auswertung ein zweites Mal nachgebaut.
  getSlidesByTag('events', slug);

// ─── Event-Titelbild ──────────────────────────────────────────────────────────

/**
 * Gibt das Titelbild eines Events zurück.
 *
 * Sucht in public/img/Titelbild/events/{slug}/ nach dem ersten verfügbaren Bild.
 * Fehlt ein Event-Titelbild, wird das STANDARD-Titelbild der Default-Seite genutzt
 * (weniger „Magie": kein zufälliges Sample als Hero). Erst wenn auch das fehlt,
 * greift der harte Sample-Fallback.
 */
const firstImageInDir = (dir: string): string | undefined =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => allowedImageExtensions.has(path.extname(name).toLowerCase()))
        .sort((a, b) => a.localeCompare(b))[0]
    : undefined;

// Standard-Titelbild der Default-Seite (public/img/Titelbild/default/).
export const resolveDefaultTitleImage = (): string => {
  const image = firstImageInDir(path.resolve('./public/img/Titelbild/default'));
  return image ? `/img/Titelbild/default/${encodePathSegment(image)}` : fallbackImage;
};

export const resolveEventTitleImage = (slug: string): string => {
  const image = firstImageInDir(path.join(eventTitelbildRoot, slug));
  return image
    ? `/img/Titelbild/events/${encodePathSegment(slug)}/${encodePathSegment(image)}`
    : resolveDefaultTitleImage();
};
