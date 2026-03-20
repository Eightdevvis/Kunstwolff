/**
 * cinema.ts
 *
 * Lädt die CinemaWelcome-Konfiguration aus public/cinema/cinema.json.
 *
 * Die JSON-Datei ist die Schnittstelle fürs Admin-Tool:
 * - Jede der 3 Sektionen hat eigene Satelliten + Hauptkreis
 * - Satelliten können hinzugefügt/entfernt werden (1–6 pro Sektion)
 * - Hauptkreis bleibt immer da, aber Bild/Alt/Hint sind editierbar
 * - Intro-Texte (Willkommen-Sektion) sind ebenfalls editierbar
 *
 * Datenpfad: public/cinema/cinema.json
 */

import fs from 'fs';
import path from 'path';

// ─── Pfad-Konstante ──────────────────────────────────────────────────────────
const cinemaJsonPath = path.resolve('./public/cinema/cinema.json');

// ─── Typen ───────────────────────────────────────────────────────────────────

/** Ein einzelner Satellit (kleiner Kreis um den Hauptkreis) */
export type CinemaSatellite = {
  /** Anzeigename im Hover-Label */
  title: string;
  /** Pfad zum Bild (relativ zu public/) */
  image: string;
  /** Ziel-URL beim Klick */
  link: string;
  /** Alt-Text fürs Bild */
  alt?: string;
};

/** Der große Hauptkreis in der Mitte */
export type CinemaMainCircle = {
  /** Pfad zum Bild */
  image: string;
  /** Alt-Text */
  alt: string;
  /** Text der bei Hover erscheint (z.B. "Entdecken") */
  hint?: string;
};

/** Eine Orbit-Sektion (davon gibt es 3) */
export type CinemaSection = {
  /** Titel (z.B. "Ihr Event") – wird als h2 angezeigt */
  title: string;
  /** Untertitel (z.B. "auf welches Event dürfen wir Sie begleiten?") */
  subtitle: string;
  /** Konfiguration des großen Hauptkreises */
  mainCircle: CinemaMainCircle;
  /** Liste der Satelliten (kleine Kreise) – 1 bis 6 Stück */
  satellites: CinemaSatellite[];
};

/** Intro-Block (zentrierter Text vor den Orbit-Sektionen) */
export type CinemaIntro = {
  title: string;
  subtitle: string;
};

/** Gesamtstruktur der cinema.json */
export type CinemaData = {
  intro: CinemaIntro;
  sections: CinemaSection[];
};

// ─── Fallback-Daten ──────────────────────────────────────────────────────────
// Werden verwendet wenn cinema.json fehlt oder ungültig ist.
// Damit die Website nie komplett leer ist, selbst ohne JSON-Datei.

const FALLBACK_SATELLITES: CinemaSatellite[] = [
  {
    title: 'Schnellzeichner',
    image: '/img/slides/default/1_schnellzeichner_hq.webp',
    link: '/schnellzeichner/',
    alt: 'Live Schnellzeichner für Events',
  },
  {
    title: 'Szenenmaler',
    image: '/img/slides/default/2_karikatur_stadtfest.webp',
    link: '/szenenmaler/',
    alt: 'Live Szenenmaler',
  },
];

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
    { title: 'Ihr Event', subtitle: 'auf welches Event dürfen\u00a0wir\u00a0Sie begleiten?', mainCircle: FALLBACK_MAIN, satellites: FALLBACK_SATELLITES },
    { title: 'Ihre Muse', subtitle: 'Wen möchten Sie kunstvoll beschenken?', mainCircle: FALLBACK_MAIN, satellites: FALLBACK_SATELLITES },
    { title: 'Ihr Geschmack', subtitle: 'Welche Kunst passt zu\u00a0Ihnen?', mainCircle: FALLBACK_MAIN, satellites: FALLBACK_SATELLITES },
  ],
};

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Liest und validiert cinema.json.
 *
 * Gibt Fallback-Daten zurück wenn:
 * - Die Datei nicht existiert
 * - Die Datei ungültiges JSON enthält
 * - Die Struktur nicht dem erwarteten Format entspricht
 *
 * Stellt sicher dass immer genau 3 Sektionen existieren
 * (fehlende werden mit Fallback aufgefüllt, überzählige abgeschnitten).
 */
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

    // Intro parsen (oder Fallback)
    const intro = parseIntro(data.intro) ?? FALLBACK_DATA.intro;

    // Sektionen parsen – Array erwartet
    const rawSections = Array.isArray(data.sections) ? data.sections : [];
    const sections: CinemaSection[] = [];

    // Genau 3 Sektionen sicherstellen
    for (let i = 0; i < 3; i++) {
      const parsed = parseSection(rawSections[i]);
      sections.push(parsed ?? FALLBACK_DATA.sections[i] ?? FALLBACK_DATA.sections[0]);
    }

    return { intro, sections };
  } catch (err) {
    console.warn('[cinema] Fehler beim Lesen von cinema.json:', err);
    return FALLBACK_DATA;
  }
};

// ─── Interne Parser ──────────────────────────────────────────────────────────

/** Validiert und parst den Intro-Block */
function parseIntro(raw: unknown): CinemaIntro | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const subtitle = typeof obj.subtitle === 'string' ? obj.subtitle.trim() : '';

  if (!title || !subtitle) return null;
  return { title, subtitle };
}

/** Validiert und parst eine einzelne Sektion */
function parseSection(raw: unknown): CinemaSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const subtitle = typeof obj.subtitle === 'string' ? obj.subtitle.trim() : '';
  if (!title) return null;

  const mainCircle = parseMainCircle(obj.mainCircle);
  if (!mainCircle) return null;

  // Satelliten: Array von Objekten, mindestens 1 nötig
  const rawSats = Array.isArray(obj.satellites) ? obj.satellites : [];
  const satellites = rawSats
    .map(parseSatellite)
    .filter((s): s is CinemaSatellite => s !== null)
    .slice(0, 6); // Maximum 6 Satelliten (CSS-Layout-Limit)

  if (satellites.length === 0) return null;

  return { title, subtitle, mainCircle, satellites };
}

/** Validiert und parst den Hauptkreis */
function parseMainCircle(raw: unknown): CinemaMainCircle | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const image = typeof obj.image === 'string' ? obj.image.trim() : '';
  const alt = typeof obj.alt === 'string' ? obj.alt.trim() : '';
  if (!image || !alt) return null;

  const hint = typeof obj.hint === 'string' ? obj.hint.trim() : undefined;

  return { image, alt, hint };
}

/** Validiert und parst einen einzelnen Satelliten */
function parseSatellite(raw: unknown): CinemaSatellite | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const image = typeof obj.image === 'string' ? obj.image.trim() : '';
  const link = typeof obj.link === 'string' ? obj.link.trim() : '';
  if (!title || !image || !link) return null;

  const alt = typeof obj.alt === 'string' ? obj.alt.trim() : undefined;

  return { title, image, link, alt };
}
