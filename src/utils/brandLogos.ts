import fs from 'fs';
import path from 'path';

export type BrandLogo = {
  src: string;
  label: string;
};

const allowedExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);
const logosRoot = path.resolve('./public/img/referenzenLogos');

/**
 * Anzeigenamen, die sich aus dem Dateinamen NICHT sauber ableiten lassen.
 *
 * Bewusst kurz gehalten: Quelle ist und bleibt der Dateiname. Hier stehen nur
 * Fälle, die er nicht ausdrücken kann – ein Tippfehler im Dateinamen oder ein
 * Umlaut, den man in einer URL lieber vermeidet. Seit `/referenzen/` die Namen
 * als Gitter ANZEIGT (vorher nur Tooltip im Laufstreifen), fällt so etwas auf.
 *
 * Schlüssel = kleingeschriebener, umlautfreier Rohname (siehe `korrekturKey`).
 */
const NAME_KORREKTUREN: Record<string, string> = {
  samsung: 'Samsung', // Datei heißt "SAmsung.svg"
  'europaeische zentral bank': 'Europäische Zentralbank',
  'nestle textlogo blue': 'Nestlé', // Datei heißt "nestle_textlogo_blue.svg.webp"
};

const korrekturKey = (label: string): string =>
  label
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase();

/**
 * Dateiname → Anzeigename. Endung weg, Trennzeichen zu Leerzeichen, ein
 * angehängtes „logo" entfernt (`Deutsche_Bundesbank_logo.svg` → „Deutsche
 * Bundesbank"). Groß-/Kleinschreibung bleibt wie im Dateinamen, damit
 * Abkürzungen wie `CDU` nicht zu „Cdu" werden.
 */
/**
 * Entfernt die Bild-Endung – und zwar so oft, wie am Ende eine steht.
 *
 * Der Grund ist eine DOPPELTE Endung: `nestle_textlogo_blue.svg.webp`. Der
 * Bild-Optimierer wandelt Hochgeladenes nach `.webp` und hängt die neue Endung
 * an, statt die alte zu ersetzen. Mit nur einem Schnitt blieb „nestle textlogo
 * blue.svg" stehen – und seit `/referenzen/` die Namen als Gitter ANZEIGT,
 * stand das als Markenname auf einer indexierten Seite.
 *
 * Sicherheitsnetz: nur bekannte Bild-Endungen werden geschnitten. Eine Marke,
 * die tatsächlich einen Punkt im Namen trägt, bleibt damit unangetastet.
 */
const ohneBildEndungen = (name: string): string => {
  let out = name;
  // Höchstens ein paar Runden – eine Schleife ohne Deckel über einem Dateinamen
  // ist eine Falle, die man nur einmal baut.
  for (let i = 0; i < 4; i += 1) {
    const punkt = out.lastIndexOf('.');
    if (punkt <= 0) break;
    if (!allowedExtensions.has(out.slice(punkt).toLowerCase())) break;
    out = out.slice(0, punkt);
  }
  return out;
};

export const buildBrandLabel = (fileName: string): string => {
  const roh = ohneBildEndungen(decodeURIComponent(fileName))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+logo$/i, '')
    .trim();

  return NAME_KORREKTUREN[korrekturKey(roh)] ?? roh;
};

export const getBrandLogos = (): BrandLogo[] => {
  if (!fs.existsSync(logosRoot)) {
    console.warn(`Brand logos directory not found: ${logosRoot}`);
    return [];
  }

  try {
    const files = fs.readdirSync(logosRoot);

    const logos = files
      .filter((file) => {
        const lowerCaseName = file.toLowerCase();
        const extension = lowerCaseName.slice(lowerCaseName.lastIndexOf('.'));
        return allowedExtensions.has(extension);
      })
      .map((file) => ({
        src: `/img/referenzenLogos/${file}`,
        label: buildBrandLabel(file),
      }))
      .sort((a, b) => a.src.localeCompare(b.src));

    return logos;
  } catch (error) {
    console.error('Error reading brand logos:', error);
    return [];
  }
};
