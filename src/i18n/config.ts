/**
 * i18n-Fundament (Phase 1) – EINE Quelle für Locale-Definition + Content-Overlay.
 * ============================================================================
 *
 * Ziel: die Website mehrsprachig ausliefern, OHNE das bestehende Deutsch-Verhalten
 * zu verändern. Deutsch (`de`) ist der Default und bleibt UNPRÄFIGIERT
 * (`/belgique/`), Fremdsprachen bekommen ein URL-Präfix (`/fr/belgique/`).
 *
 * Zwei Bausteine:
 *  1. Locale-Registry + URL-Helfer (rein, für Astro-Seiten & Sprach-Umschalter).
 *  2. Content-Overlay-Auflösung (fs, Build-Zeit): übersetzte Inhalte liegen unter
 *     `public/i18n/<locale>/…` und SPIEGELN die bestehende `public/`-Struktur.
 *     Fehlt eine übersetzte Datei, greift automatisch die deutsche Originaldatei
 *     (Fallback → Seite ist nie leer, deutsche Pfade bleiben unberührt).
 *
 * PHASE-2-FUNDAMENT: Neue Sprache = Eintrag in LOCALES + Overlay-Dateien anlegen.
 * Neue übersetzte Seite = Slug in `public/i18n/<locale>/landings.json` + Overlay-
 * Inhalte. KEINE Code-Änderung nötig (die fr-Route liest die Registry).
 */
import fs from 'fs';
import path from 'path';

/** Default-Locale = Deutsch. Bleibt ohne URL-Präfix (Bestandsverhalten). */
export const DEFAULT_LOCALE = 'de' as const;

/**
 * Aktive Locales. `nl` ist für Phase 2 vorgesehen – erst aktivieren, wenn
 * Overlay-Inhalte existieren (sonst leere Routen). Reihenfolge = Anzeige im
 * Sprach-Umschalter.
 */
export const LOCALES = ['de', 'fr'] as const; // Phase 2: 'nl'
export type Locale = (typeof LOCALES)[number];

/** Menschliche Labels + hreflang-Codes für Switcher / <link rel="alternate">. */
export const LOCALE_META: Record<Locale, { label: string; hreflang: string; htmlLang: string }> = {
  de: { label: 'DE', hreflang: 'de', htmlLang: 'de' },
  fr: { label: 'FR', hreflang: 'fr-BE', htmlLang: 'fr' },
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

/** Nicht-Default-Locales (die, die ein URL-Präfix bekommen). */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

// ── URL-Helfer ────────────────────────────────────────────────────────────────

/**
 * Baut den Pfad einer Landing-/Inhaltsseite für eine Locale.
 * de → `/<slug>/` (unverändert), sonst → `/<locale>/<slug>/`.
 */
export const localizePath = (locale: Locale, slug: string): string =>
  locale === DEFAULT_LOCALE ? `/${slug}/` : `/${locale}/${slug}/`;

// ── Content-Overlay-Auflösung (Build-Zeit) ─────────────────────────────────────

/** Wurzel der Inhalte je Locale: de = `public/`, sonst `public/i18n/<locale>/`. */
export const localeContentRoot = (locale: Locale): string =>
  locale === DEFAULT_LOCALE
    ? path.resolve('./public')
    : path.resolve(`./public/i18n/${locale}`);

/**
 * Löst einen relativen Content-Pfad (z.B. `why/belgique.json`) gegen eine Locale
 * auf. Existiert die Overlay-Datei, wird sie genommen; sonst die deutsche
 * Originaldatei (Fallback). So bleibt eine Seite auch teilübersetzt lauffähig.
 */
export const resolveLocalizedFile = (locale: Locale, relPath: string): string => {
  if (locale !== DEFAULT_LOCALE) {
    const overlay = path.join(localeContentRoot(locale), relPath);
    if (fs.existsSync(overlay)) return overlay;
  }
  return path.join(localeContentRoot(DEFAULT_LOCALE), relPath);
};

/**
 * Verzeichnis-Wurzel eines Content-Typs für eine Locale (für Loader, die einen
 * ganzen Ordner scannen, z.B. FAQ). Existiert der Overlay-Ordner nicht, wird das
 * deutsche Original zurückgegeben.
 */
export const resolveLocalizedDir = (locale: Locale, relDir: string): string => {
  if (locale !== DEFAULT_LOCALE) {
    const overlay = path.join(localeContentRoot(locale), relDir);
    if (fs.existsSync(overlay)) return overlay;
  }
  return path.join(localeContentRoot(DEFAULT_LOCALE), relDir);
};

/**
 * Liste der übersetzten Landing-Slugs einer Locale.
 * Quelle: `public/i18n/<locale>/landings.json` (Array oder { landings: [...] }).
 * Das ist der Phase-2-Schalter: hier stehen die Slugs, die die prefix-Route baut.
 */
export const getTranslatedLandingSlugs = (locale: Locale): string[] => {
  if (locale === DEFAULT_LOCALE) return [];
  const file = path.join(localeContentRoot(locale), 'landings.json');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as unknown;
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as Record<string, unknown>)?.landings)
        ? ((parsed as Record<string, unknown>).landings as unknown[])
        : [];
    return list
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim().toLowerCase());
  } catch {
    return [];
  }
};

/**
 * Locales, in die ein bestimmter Slug übersetzt ist (inkl. `de`, das immer gilt).
 * Genutzt vom Sprach-Umschalter, um NUR echte Alternativen anzuzeigen.
 */
export const getAvailableLocalesForSlug = (slug: string): Locale[] => {
  const normalized = slug.trim().toLowerCase();
  const out: Locale[] = [DEFAULT_LOCALE];
  for (const locale of PREFIXED_LOCALES) {
    if (getTranslatedLandingSlugs(locale).includes(normalized)) out.push(locale);
  }
  return out;
};
