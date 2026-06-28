import fs from 'fs';
import path from 'path';

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
    subtitle: 'Waehle dein Event und klappe die Details direkt auf.',
  },
  why: {
    heading: 'Warum Kunstwolff?',
    intro:
      'Wir verbinden künstlerische Qualität mit Event-Erfahrung – für Veranstaltungen, die im Gedächtnis bleiben.',
  },
};

export type SiteTexts = typeof SITE_TEXT_DEFAULTS;

const FILE = path.resolve('./public/site-texts/content.json');

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

export const getSiteTexts = (): SiteTexts => {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Record<string, unknown>;
    return {
      contact: mergeSection(SITE_TEXT_DEFAULTS.contact, raw.contact),
      eventtypes: mergeSection(SITE_TEXT_DEFAULTS.eventtypes, raw.eventtypes),
      why: mergeSection(SITE_TEXT_DEFAULTS.why, raw.why),
    };
  } catch {
    return SITE_TEXT_DEFAULTS;
  }
};

/**
 * Optionale, pro-Stadt anpassbare H1-Überschrift der Landingpages.
 * Quelle: content.json -> "landingHeadings": { "<slug>": "Eigene H1" }.
 * Fehlt ein Eintrag, gilt der übergebene Default ("Eventkünstler in {Stadt}").
 * So kann die H1 ohne Code-Änderung gepflegt werden (vom KI-Chat / Admin).
 */
export const getLandingHeading = (slug: string, fallback: string): string => {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Record<string, unknown>;
    const map = raw.landingHeadings;
    if (map && typeof map === 'object') {
      const v = (map as Record<string, unknown>)[slug];
      if (typeof v === 'string' && v.trim().length > 0) return v.trim();
    }
  } catch {
    /* ignore – Fallback unten */
  }
  return fallback;
};

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
const fillCity = (text: string, cityName: string): string =>
  text.replace(/\{stadt\}/gi, cityName);

export const getLandingIntro = (slug: string, cityName: string): string => {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf-8')) as Record<string, unknown>;
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
