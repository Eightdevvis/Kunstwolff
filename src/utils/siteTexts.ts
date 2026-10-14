import fs from 'fs';
import path from 'path';
import { DEFAULT_LOCALE, resolveLocalizedFile, type Locale } from '../i18n/config';

/**
 * Editierbare Abschnitts-Texte (mom-Feedback #7: "allg. Textfelder fehlen").
 * Quelle: public/site-texts/content.json (vom Admin-Tab "Startseiten-Texte" geschrieben).
 *
 * Defaults sind hier hartcodiert und werden mit der JSON gemerged – fehlt die Datei
 * oder ein einzelnes Feld, rendert die Seite unverändert weiter (kein Bruch).
 */
export const SITE_TEXT_DEFAULTS = {
  contact: {
    kicker: 'Kontakt',
    heading: 'Erzählen Sie uns von Ihrem Event',
    intro:
      'Stellen Sie uns jetzt unverbindlich eine Anfrage. Fragen oder Vorschläge nehmen wir gerne direkt entgegen. Für allgemeine Fragen hilft oft schon ein Blick in die FAQ.',
    panelTitle: 'Direkt erreichbar',
    panelText: 'Wir antworten in der Regel innerhalb von 24 Stunden.',
  },
  eventtypes: {
    heading: 'Eventformate',
    subtitle: 'Wähle dein Event und klappe die Details direkt auf.',
  },
  why: {
    heading: 'Warum Kunstwolff?',
    intro:
      'Wir verbinden künstlerische Qualität mit Event-Erfahrung – für Veranstaltungen, die im Gedächtnis bleiben.',
  },
  // Überschriften der Bilder- und FAQ-Sektion – gelten auf allen Seiten, die die
  // Sektion zeigen. Bis 2026-10 fest in Slideshow.astro / FAQ.astro.
  slideshow: {
    heading: 'Unsere Kunst',
  },
  faq: {
    heading: 'Häufige Fragen (FAQ)',
  },
};

export type SiteTexts = typeof SITE_TEXT_DEFAULTS;

const FILE = path.resolve('./public/site-texts/content.json');

/**
 * i18n (Phase 1): Auflösung der content.json je Locale. Default (`de`) liest
 * unverändert die deutsche Datei; Fremdsprachen lesen ihr Overlay
 * (`public/i18n/<locale>/site-texts/content.json`) mit Fallback aufs Deutsche.
 * Alle Reader unten bekommen einen optionalen `locale`-Parameter mit Default
 * `de` – dadurch bleibt jedes bestehende deutsche Call-Site byte-identisch.
 */
const contentFileFor = (locale: Locale): string =>
  locale === DEFAULT_LOCALE ? FILE : resolveLocalizedFile(locale, 'site-texts/content.json');

const fillCity = (text: string, cityName: string): string =>
  text.replace(/\{stadt\}/gi, cityName);

const mergeSection = <T extends Record<string, string>>(def: T, raw: unknown): T => {
  if (!raw || typeof raw !== 'object') return def;
  const out = { ...def };
  for (const key of Object.keys(def)) {
    const v = (raw as Record<string, unknown>)[key];
    if (typeof v === 'string' && v.trim().length > 0) {
      (out as Record<string, string>)[key] = v;
    }
  }
  return out;
};

export const getSiteTexts = (locale: Locale = DEFAULT_LOCALE): SiteTexts => {
  try {
    const raw = JSON.parse(fs.readFileSync(contentFileFor(locale), 'utf-8')) as Record<string, unknown>;
    return {
      contact: mergeSection(SITE_TEXT_DEFAULTS.contact, raw.contact),
      eventtypes: mergeSection(SITE_TEXT_DEFAULTS.eventtypes, raw.eventtypes),
      why: mergeSection(SITE_TEXT_DEFAULTS.why, raw.why),
      slideshow: mergeSection(SITE_TEXT_DEFAULTS.slideshow, raw.slideshow),
      faq: mergeSection(SITE_TEXT_DEFAULTS.faq, raw.faq),
    };
  } catch {
    return SITE_TEXT_DEFAULTS;
  }
};

/**
 * H1-Überschrift der Stadtseiten und der Startseite (im Hero/Opener).
 * Quelle: content.json -> "landingHeadings" – dasselbe Muster wie `landingIntros`:
 *
 *   "landingHeadings": {
 *     "_home":    "Überschrift der Startseite",
 *     "_default": "Eventkünstler in {stadt}",   // Standard für alle Stadtseiten
 *     "berlin":   "Schnellzeichner Berlin"       // nur diese Stadt
 *   }
 *
 * Auflösung Stadtseite: eigener Eintrag → `_default` (mit {stadt}) → übergebener
 * Code-Fallback. Leere Werte zählen nicht – eine H1 darf nie leer sein.
 */
const HOME_HEADING_DEFAULT = 'Event- und Showkünstler seit über 25 Jahren';

const readHeadingMap = (locale: Locale): Record<string, unknown> | null => {
  try {
    const raw = JSON.parse(fs.readFileSync(contentFileFor(locale), 'utf-8')) as Record<string, unknown>;
    const map = raw.landingHeadings;
    return map && typeof map === 'object' ? (map as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const nonEmpty = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;

export const getLandingHeading = (
  slug: string,
  fallback: string,
  locale: Locale = DEFAULT_LOCALE,
  cityName = '',
): string => {
  const map = readHeadingMap(locale);
  const own = nonEmpty(map?.[slug]);
  if (own) return own;
  const def = nonEmpty(map?.['_default']);
  if (def && cityName) return fillCity(def, cityName);
  return fallback;
};

/** H1 der Startseite: `landingHeadings._home` → sonst der bisherige feste Text. */
export const getHomeHeading = (): string =>
  nonEmpty(readHeadingMap(DEFAULT_LOCALE)?.['_home']) ?? HOME_HEADING_DEFAULT;

/**
 * Kleiner Einführungstext direkt unter dem Hero/BrandStripe der Stadtseiten.
 * Quelle: content.json -> "landingIntros": { "_default": "…", "<slug>": "…" }.
 *
 * Auflösung: stadtspezifischer Text → `_default`-Text. KEIN hartcodierter Fallback –
 * steht nichts in der content.json, rendert die Komponente nichts (leerer String).
 * Der Default-Text lebt als ganz normaler `_default`-Eintrag in der content.json
 * (siehe site-texts/content.json) und ist damit voll im Admin editierbar.
 * Der Platzhalter {stadt} wird durch den (formatierten) Stadtnamen ersetzt.
 */

export const getLandingIntro = (slug: string, cityName: string, locale: Locale = DEFAULT_LOCALE): string => {
  try {
    const raw = JSON.parse(fs.readFileSync(contentFileFor(locale), 'utf-8')) as Record<string, unknown>;
    const map = raw.landingIntros;
    if (map && typeof map === 'object') {
      const cityText = (map as Record<string, unknown>)[slug];
      if (typeof cityText === 'string') {
        // Leerer (getrimmter) String = bewusst kein Intro auf dieser Stadt.
        if (cityText.trim().length === 0) return '';
        return fillCity(cityText.trim(), cityName);
      }

      const defaultText = (map as Record<string, unknown>)['_default'];
      if (typeof defaultText === 'string') {
        if (defaultText.trim().length === 0) return '';
        return fillCity(defaultText.trim(), cityName);
      }
    }
  } catch {
    /* ignore – kein Eintrag → nichts rendern */
  }
  return '';
};

/**
 * Einführungstext der Startseite (eigener Eintrag, da ohne Stadt-Bezug).
 * Quelle: content.json -> "landingIntros._home". KEIN hartcodierter Fallback.
 */
export const getHomeIntro = (): string => {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Record<string, unknown>;
    const map = raw.landingIntros;
    if (map && typeof map === 'object') {
      const homeText = (map as Record<string, unknown>)['_home'];
      if (typeof homeText === 'string') {
        return homeText.trim();
      }
    }
  } catch {
    /* ignore – kein Eintrag → nichts rendern */
  }
  return '';
};
