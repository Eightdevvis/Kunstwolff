/**
 * cinema.ts
 *
 * Lädt die CinemaWelcome-Konfiguration aus public/cinema/cinema.json.
 *
 * Kompositions-Modell:
 * - Jeder Satellit hat eigene Default-Textbausteine (titlePart, text, offerItems)
 * - Das Ergebnis wird zur Laufzeit aus den 3 Auswahlen zusammengesetzt:
 *   Titel:       "{geschmack.titlePart} auf {event.titlePart} für {muse.titlePart}"
 *   Text:        geschmack.text + muse.text + event.text  (feste Reihenfolge)
 *   OfferItems:  [...event.offerItems, ...muse.offerItems, ...geschmack.offerItems]
 *   Bild:        geschmack.defaults.image (Skill-Default)
 * - Overrides: Komplett-Ersatz für eine bestimmte Kombination
 *
 * Datenpfad: public/cinema/cinema.json
 */

import fs from 'fs';
import path from 'path';

// ─── Pfad-Konstante ──────────────────────────────────────────────────────────
const cinemaJsonPath = path.resolve('./public/cinema/cinema.json');

// ─── Typen ───────────────────────────────────────────────────────────────────

/** Default-Textbausteine eines Satelliten für die Ergebnis-Komposition */
export type SatelliteDefaults = {
  /** Anteil am zusammengesetzten Titel (z.B. "Szenenmalerin", "Firmenfeier", "Spezialperson(en)") */
  titlePart: string;
  /** Text-Baustein für die Beschreibung (wird mit den anderen 2 Sektionen konkateniert) */
  text: string;
  /** Listenpunkte für das Angebot (werden mit den anderen 2 Sektionen zu einer Bullet-Liste verkettet) */
  offerItems: string[];
  /** Default-Bild – nur bei Geschmack-Satelliten (Skill-Default-Bild) */
  image?: string;
};

/** Ein einzelner Satellit (kleiner Kreis um den Hauptkreis) */
export type CinemaSatellite = {
  /** Anzeigename im Kreis / Hover-Label */
  title: string;
  /** Logischer Wert für die Auswahl (z.B. "firmenfeier", "schnellzeichner", "50-100") */
  value: string;
  /** Pfad zum Bild – nur bei Bild-Satelliten (Event, Geschmack) */
  image?: string;
  /** Alt-Text fürs Bild */
  alt?: string;
  /** "text" = goldener Text auf dunklem Kreis (Muse). Default = Bild-Kreis */
  displayMode?: 'text';
  /** Default-Textbausteine für die Ergebnis-Komposition */
  defaults: SatelliteDefaults;
  /**
   * AutoSelect: Bei Auswahl dieses Satelliten werden andere Sektionen automatisch gesetzt.
   * Key = Sektions-ID, Value = Satelliten-Value der automatisch gewählt wird.
   * Bsp.: { "muse": "stand-attraktion" } → Muse-Sektion wird übersprungen.
   */
  autoSelect?: Record<string, string>;
};

/** Der große Hauptkreis in der Mitte */
export type CinemaMainCircle = {
  image: string;
  alt: string;
  hint?: string;
};

/** Eine Orbit-Sektion (davon gibt es 3) */
export type CinemaSection = {
  id: string;
  title: string;
  subtitle: string;
  mainCircle: CinemaMainCircle;
  satellites: CinemaSatellite[];
};

/** Intro-Block */
export type CinemaIntro = {
  title: string;
  subtitle: string;
};

/** Ein vollständig aufgelöstes Ergebnis (komponiert oder Override) */
export type CinemaResult = {
  image: string;
  imageAlt: string;
  title: string;
  description: string;
  offerItems: string[];
};

/** Gesamtstruktur der cinema.json */
export type CinemaData = {
  intro: CinemaIntro;
  sections: CinemaSection[];
  /** Overrides für bestimmte Kombinationen. Key: "{geschmack}-{event}-{muse}" */
  overrides: Record<string, CinemaResult>;
};

// ─── Fallback-Daten ──────────────────────────────────────────────────────────

const FALLBACK_MAIN: CinemaMainCircle = {
  image: '/img/UnsereFähigkeitenBilder/Schnellzeichner/IMG_20240528_143426.webp',
  alt: 'Kunstwolff – Eventkünstler',
  hint: 'Entdecken',
};

const FALLBACK_DATA: CinemaData = {
  intro: {
    title: 'Willkommen',
    subtitle: 'Erzählen Sie uns doch etwas über sich.',
  },
  sections: [
    {
      id: 'event', title: 'Ihr Event', subtitle: 'auf welches Event dürfen\u00a0wir\u00a0Sie begleiten?',
      mainCircle: FALLBACK_MAIN,
      satellites: [
        { title: 'Firmenfeier', value: 'firmenfeier', image: '/img/slides/default/1_schnellzeichner_hq.webp', alt: 'Firmenfeier', defaults: { titlePart: 'Firmenfeier', text: '', offerItems: [] } },
        { title: 'Hochzeit', value: 'hochzeit', image: '/img/slides/default/3_schnellzeichner-schweiz.webp', alt: 'Hochzeit', defaults: { titlePart: 'Hochzeit', text: '', offerItems: [] } },
      ],
    },
    {
      id: 'muse', title: 'Ihre Muse', subtitle: 'Wie groß ist Ihre Gesellschaft?',
      mainCircle: FALLBACK_MAIN,
      satellites: [
        { title: '<25 Gäste', value: 'unter-25', displayMode: 'text', defaults: { titlePart: '<25 Gäste', text: '', offerItems: [] } },
        { title: '50–100 Gäste', value: '50-100', displayMode: 'text', defaults: { titlePart: '50–100 Gäste', text: '', offerItems: [] } },
      ],
    },
    {
      id: 'geschmack', title: 'Ihr Geschmack', subtitle: 'Welche Kunst passt zu\u00a0Ihnen?',
      mainCircle: FALLBACK_MAIN,
      satellites: [
        { title: 'locker', value: 'schnellzeichner', image: '/img/slides/default/1_schnellzeichner_hq.webp', alt: 'lockerer Stil', defaults: { titlePart: 'Schnellzeichner', text: '', offerItems: [], image: '/img/slides/default/1_schnellzeichner_hq.webp' } },
        { title: 'erlesen', value: 'szenenmaler', image: '/img/slides/default/2_karikatur_stadtfest.webp', alt: 'erlesener Stil', defaults: { titlePart: 'Szenenmalerin', text: '', offerItems: [], image: '/img/slides/default/2_karikatur_stadtfest.webp' } },
      ],
    },
  ],
  overrides: {},
};

// ─── Loader ──────────────────────────────────────────────────────────────────

export const getCinemaData = (): CinemaData => {
  if (!fs.existsSync(cinemaJsonPath)) {
    console.warn('[cinema] cinema.json nicht gefunden – verwende Fallback-Daten.');
    return FALLBACK_DATA;
  }

  try {
    const raw = fs.readFileSync(cinemaJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      console.warn('[cinema] cinema.json hat ungültiges Format – verwende Fallback.');
      return FALLBACK_DATA;
    }

    const data = parsed as Record<string, unknown>;

    const intro = parseIntro(data.intro) ?? FALLBACK_DATA.intro;

    const rawSections = Array.isArray(data.sections) ? data.sections : [];
    const sections: CinemaSection[] = [];

    for (let i = 0; i < 3; i++) {
      const parsed = parseSection(rawSections[i]);
      sections.push(parsed ?? FALLBACK_DATA.sections[i] ?? FALLBACK_DATA.sections[0]);
    }

    const overrides = parseOverrides(data.overrides) ?? {};

    return { intro, sections, overrides };
  } catch (err) {
    console.warn('[cinema] Fehler beim Lesen von cinema.json:', err);
    return FALLBACK_DATA;
  }
};

// ─── Interne Parser ──────────────────────────────────────────────────────────

function parseIntro(raw: unknown): CinemaIntro | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const subtitle = typeof obj.subtitle === 'string' ? obj.subtitle.trim() : '';
  if (!title || !subtitle) return null;
  return { title, subtitle };
}

function parseSection(raw: unknown): CinemaSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const subtitle = typeof obj.subtitle === 'string' ? obj.subtitle.trim() : '';
  if (!title) return null;

  const mainCircle = parseMainCircle(obj.mainCircle);
  if (!mainCircle) return null;

  const rawSats = Array.isArray(obj.satellites) ? obj.satellites : [];
  const satellites = rawSats
    .map(parseSatellite)
    .filter((s): s is CinemaSatellite => s !== null)
    .slice(0, 6);

  if (satellites.length === 0) return null;

  return { id, title, subtitle, mainCircle, satellites };
}

function parseMainCircle(raw: unknown): CinemaMainCircle | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const image = typeof obj.image === 'string' ? obj.image.trim() : '';
  const alt = typeof obj.alt === 'string' ? obj.alt.trim() : '';
  if (!image || !alt) return null;
  const hint = typeof obj.hint === 'string' ? obj.hint.trim() : undefined;
  return { image, alt, hint };
}

function parseSatellite(raw: unknown): CinemaSatellite | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const value = typeof obj.value === 'string' ? obj.value.trim() : '';
  if (!title || !value) return null;

  const displayMode = obj.displayMode === 'text' ? 'text' as const : undefined;
  const image = typeof obj.image === 'string' ? obj.image.trim() : undefined;
  const alt = typeof obj.alt === 'string' ? obj.alt.trim() : undefined;

  if (!displayMode && !image) return null;

  const defaults = parseSatelliteDefaults(obj.defaults, title);
  const autoSelect = parseAutoSelect(obj.autoSelect);

  return { title, value, image, alt, displayMode, defaults, ...(autoSelect ? { autoSelect } : {}) };
}

/**
 * AutoSelect-Map { sektionsId: satellitenValue } – nur String→String-Paare.
 * Muss hier explizit geparst werden, sonst fällt das Feld aus der cinema.json
 * heraus und der "Messe überspringt Wunsch-Sektion"-Flow in CinemaWelcome
 * greift nie (Client sieht autoSelect = undefined).
 */
function parseAutoSelect(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) out[key] = val.trim();
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseSatelliteDefaults(raw: unknown, fallbackTitle: string): SatelliteDefaults {
  if (!raw || typeof raw !== 'object') {
    return { titlePart: fallbackTitle, text: '', offerItems: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    titlePart: typeof obj.titlePart === 'string' ? obj.titlePart.trim() : fallbackTitle,
    text: typeof obj.text === 'string' ? obj.text.trim() : '',
    offerItems: parseOfferItems(obj.offerItems),
    image: typeof obj.image === 'string' ? obj.image.trim() : undefined,
  };
}

/** Liest offerItems als Array nicht-leerer Strings; fremde Typen werden ignoriert. */
function parseOfferItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const items: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (trimmed) items.push(trimmed);
  }
  return items;
}

function parseOverrides(raw: unknown): Record<string, CinemaResult> | null {
  if (!raw || typeof raw !== 'object') return null;
  const result: Record<string, CinemaResult> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = parseResult(val);
    if (parsed) result[key] = parsed;
  }
  return result;
}

function parseResult(raw: unknown): CinemaResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const image = typeof obj.image === 'string' ? obj.image.trim() : '';
  const imageAlt = typeof obj.imageAlt === 'string' ? obj.imageAlt.trim() : '';
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const description = typeof obj.description === 'string' ? obj.description.trim() : '';
  const offerItems = parseOfferItems(obj.offerItems);
  if (!title) return null;
  return { image, imageAlt, title, description, offerItems };
}
