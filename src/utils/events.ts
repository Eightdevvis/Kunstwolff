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

/** URL-encodes einen einzelnen Pfad-Abschnitt */
const encodePathSegment = (segment: string): string => encodeURIComponent(segment);

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
 * Wird in getStaticPaths() von [landing].astro und [skill]/[landing].astro genutzt.
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
export const getEventSlides = (slug: string): EventSlideItem[] => {
  const folderPath = path.join(eventSlidesRoot, slug);

  if (!fs.existsSync(folderPath)) {
    return [];
  }

  // slides.meta.json lesen (geteilte Datei mit Stadt-Slides)
  let metadata: Record<string, Record<string, unknown>> = {};
  if (fs.existsSync(slidesMetadataPath)) {
    try {
      const raw = fs.readFileSync(slidesMetadataPath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        metadata = parsed as Record<string, Record<string, unknown>>;
      }
    } catch {
      // Fehler ignorieren, leeres Metadata-Objekt bleibt
    }
  }

  // Ordner-Pfad relativ zur slides.meta.json: "events/{slug}"
  const folderKey = `events/${slug}`;

  const fileNames = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedImageExtensions.has(path.extname(name).toLowerCase()))
    // WebP-Deduplication: wenn .webp vorhanden ist, andere Formate rausfiltern
    .filter((fileName, _, all) => {
      const ext = path.extname(fileName).toLowerCase();
      if (ext === '.webp') return true;
      return !all.includes(`${path.basename(fileName, ext)}.webp`);
    });

  // Interner Hilfstyp: priority ist intern IMMER gesetzt (Default 0), wird aber
  // am Ende weggemappt. Außerdem: title/categories werden hier explizit als
  // `T | undefined` modelliert (statt optional `T?`), damit der Type-Guard im
  // .filter() unten ohne `exactOptionalPropertyTypes`-Reibung greift.
  type InternalEventSlide = {
    src: string;
    alt: string;
    title: string | undefined;
    categories: string[] | undefined;
    priority: number;
  };

  return fileNames
    .map((fileName): InternalEventSlide | null => {
      // Metadata-Key: "events/{slug}/dateiname.webp"
      const metaKey = normalizeMetadataKey(`${folderKey}/${fileName}`);
      const meta = metadata[metaKey] as Record<string, unknown> | undefined;
      const enabled = meta?.enabled !== false;

      // enabled === false → Slide komplett ausblenden (per .filter unten weg)
      if (!enabled) return null;

      const categories = Array.isArray(meta?.categories)
        ? (meta.categories as string[]).filter((c): c is string => typeof c === 'string')
        : [];
      const priority = typeof meta?.priority === 'number' ? meta.priority : 0;
      const alt = typeof meta?.altOverride === 'string' && meta.altOverride.trim()
        ? meta.altOverride.trim()
        : normalizeAlt(fileName);
      const title = typeof meta?.title === 'string' && meta.title.trim()
        ? meta.title.trim()
        : undefined;

      return {
        // Öffentlicher URL-Pfad: /img/slides/events/{slug}/{dateiname}
        src: `/img/slides/events/${encodePathSegment(slug)}/${encodePathSegment(fileName)}`,
        alt,
        title,
        categories: categories.length > 0 ? categories : undefined,
        priority,
      };
    })
    // Type-Guard greift jetzt sauber: Predicate-Typ === Map-Output-Typ
    .filter((item): item is InternalEventSlide => item !== null)
    // .priority ist hier garantiert number, kein `?? 0` nötig
    .sort((a, b) => b.priority - a.priority || a.src.localeCompare(b.src))
    // priority aus Rückgabe entfernen (intern only); Rest erfüllt EventSlideItem
    .map(({ priority: _priority, ...slide }) => slide);
};

// ─── Event-Titelbild ──────────────────────────────────────────────────────────

/**
 * Gibt das Titelbild eines Events zurück.
 *
 * Sucht in public/img/Titelbild/events/{slug}/ nach dem ersten verfügbaren Bild.
 * Fallback: /img/samples/sample1.webp
 */
export const resolveEventTitleImage = (slug: string): string => {
  const folderPath = path.join(eventTitelbildRoot, slug);

  if (!fs.existsSync(folderPath)) {
    return fallbackImage;
  }

  const image = fs
    .readdirSync(folderPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => allowedImageExtensions.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0];

  if (!image) {
    return fallbackImage;
  }

  return `/img/Titelbild/events/${encodePathSegment(slug)}/${encodePathSegment(image)}`;
};
