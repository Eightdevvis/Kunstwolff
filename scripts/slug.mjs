// Slug-Regeln: EINE Quelle für scripts/ und src/.
//
// Bis 2026-11-20 stand diese Logik als Kopie in neun Dateien. Weicht eine Kopie
// ab, bekommt derselbe Ort/Skill zwei Schlüssel und eine Seite bleibt leer.
// Deshalb: hier ändern, nirgends sonst. Testvektoren (auch für den Admin):
// `tests/fixtures/slug-vectors.json`, geprüft von `tests/slug.test.ts`.
//
// Reine Funktionen ohne Dateisystem-Zugriff, damit vitest, die Sync-Skripte
// (Node) und src/utils (Astro/Vite) dieselbe Datei importieren können.

/**
 * Deutsche Umlaute und ß ausschreiben, BEVOR die Akzente fallen.
 * Ohne diesen Schritt wird „Köln" zu `koln` und „Straße" zu `stra-e` – die
 * Orte im Repo folgen aber der ue-Konvention (`koeln`, `saarbruecken`).
 * Großbuchstaben werden dabei klein ausgeschrieben (Ä → ae).
 *
 * @param {unknown} value
 * @returns {string}
 */
export const transliterateGerman = (value) =>
  String(value)
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');

/**
 * Akzente weg, Kleinbuchstaben, alles außer a–z/0–9 wird `-`, Ränder getrimmt.
 * @param {string} value
 * @returns {string}
 */
const toAsciiSlug = (value) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Der Slug für Orte, Skills, Ordner- und Dateinamen („Köln" → `koeln`,
 * „Graphic recording" → `graphic-recording`).
 * Achtung: null/undefined werden zu 'null'/'undefined' (so war es in allen
 * Kopien) – wer leere Werte erwartet, nimmt `slugifyTag`.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const slugify = (value) => toAsciiSlug(transliterateGerman(value));

/**
 * Tag-Identität: wie `slugify`, aber null/undefined → ''.
 * Muss zeichengleich zu `src/utils/tagSlug.ts` im Admin-Repo bleiben.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const slugifyTag = (value) => slugify(value ?? '');

/**
 * Event-Slug-Ersatz, wenn `events.json` kein `slug` trägt.
 * ⚠️ Schreibt Umlaute NICHT aus („Jubiläum" → `jubilaum`, „Straßenfest" →
 * `stra-enfest`). Bekannte Abweichung von `slugify`, bewusst nicht angeglichen:
 * eine Umstellung könnte Event-URLs ändern. Heute folgenlos, weil jedes Event
 * ein eigenes `slug`-Feld hat.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const slugifyWithoutTransliteration = (value) => toAsciiSlug(String(value));
