import fs from 'fs';
import path from 'path';

/**
 * Erinnerungen-Utility
 *
 * Lädt die "Pinnwand-Fotos" für die LandingErinnerungen-Komponente.
 * Jede JSON-Datei enthält ein Array `photos` mit { image, alt }-Einträgen.
 *
 * Fallback-Kette (identisch zum Why-System):
 * 1. {skill}-{landing}.json  → spezifischste Variante (z.B. schnellzeichner-berlin.json)
 * 2. {landing}.json           → stadtspezifisch (z.B. berlin.json)
 * 3. {skill}.json             → skillspezifisch (z.B. schnellzeichner.json)
 * 4. default.json             → globaler Fallback
 *
 * Das Admin-Tool kann später direkt in diese JSON-Dateien schreiben.
 */

// ── Typen ────────────────────────────────────────────────────────────────────

/** Ein einzelnes Pinnwand-Foto mit Bildpfad und Alt-Text */
export type ErinnerungPhoto = {
  image: string;
  alt: string;
};

// ── Konstanten ───────────────────────────────────────────────────────────────

/** Wurzelverzeichnis der Erinnerungen-JSONs */
const erinnerungenRoot = path.resolve('./public/erinnerungen');

/** Fallback-Key wenn keine spezifische Datei gefunden wird */
const defaultKey = 'default';

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Normalisiert einen Slug (trim + lowercase) */
const normalize = (value: string): string => value.trim().toLowerCase();

/**
 * Liest eine Erinnerungen-JSON-Datei und gibt die Fotos zurück.
 * Gibt ein leeres Array zurück wenn die Datei nicht existiert oder ungültig ist.
 */
const readErinnerungenFile = (filePath: string): ErinnerungPhoto[] => {
  // Datei muss existieren
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    // photos-Array muss vorhanden sein
    if (!parsed.photos || !Array.isArray(parsed.photos)) {
      return [];
    }

    // Nur gültige Einträge mit image + alt durchlassen
    return parsed.photos
      .filter(
        (item: any) =>
          item &&
          typeof item.image === 'string' &&
          item.image.trim() !== '',
      )
      .map((item: any) => ({
        image: item.image.trim(),
        alt: typeof item.alt === 'string' ? item.alt.trim() : '',
      }));
  } catch {
    // JSON-Parse-Fehler → leeres Array, kein Crash
    return [];
  }
};

// ── Öffentliche API ──────────────────────────────────────────────────────────

/**
 * Gibt die Erinnerungen-Fotos für eine bestimmte Skill/Landing-Kombination zurück.
 *
 * @param skill  - Skill-Slug (optional, z.B. "schnellzeichner")
 * @param landing - Landing-Slug (optional, z.B. "berlin")
 * @returns Array von ErinnerungPhoto (kann leer sein wenn keine Daten vorhanden)
 */
export const getErinnerungen = (skill?: string, landing?: string): ErinnerungPhoto[] => {
  const skillKey = skill ? normalize(skill) : '';
  const landingKey = landing ? normalize(landing) : '';

  // Kandidaten-Dateien in Prioritätsreihenfolge zusammenstellen
  const candidates: string[] = [];

  // 1. Skill+Landing-Kombi (spezifischste)
  if (skillKey && landingKey) {
    candidates.push(path.join(erinnerungenRoot, `${skillKey}-${landingKey}.json`));
  }

  // 2. Landing-spezifisch (z.B. berlin.json)
  if (landingKey) {
    candidates.push(path.join(erinnerungenRoot, `${landingKey}.json`));
  }

  // 3. Skill-spezifisch (z.B. schnellzeichner.json)
  if (skillKey) {
    candidates.push(path.join(erinnerungenRoot, `${skillKey}.json`));
  }

  // 4. Default-Fallback
  candidates.push(path.join(erinnerungenRoot, `${defaultKey}.json`));

  // Erste Datei mit gültigen Fotos gewinnt
  for (const candidate of candidates) {
    const photos = readErinnerungenFile(candidate);
    if (photos.length > 0) {
      return photos;
    }
  }

  // Kein Content gefunden → leeres Array (Component rendert sich dann nicht)
  return [];
};
