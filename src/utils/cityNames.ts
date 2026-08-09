/**
 * cityNames.ts
 *
 * Slugs in `public/landings/landings.md` sind bewusst ASCII-transliteriert
 * (ü→ue, ß→ss, keine Sonderzeichen) – gut für URLs, aber schlecht für
 * SEO-Titel/H1: Google (und Nutzer) suchen nach „Düsseldorf", nicht
 * „Duesseldorf". Diese Map liefert den korrekten Anzeigenamen mit Umlauten
 * und richtiger Mehrwort-Schreibweise.
 *
 * Verwendung: Titel, Meta-Description, H1, Breadcrumb-Namen der Stadt- und
 * Skill+Stadt-Seiten. NICHT für URLs/Slugs.
 *
 * Neue Stadt? Slug in landings.md eintragen und – falls der Name Umlaute,
 * mehrere Wörter oder eine andere Schreibweise als „Slug groß" hat – hier
 * einen Eintrag ergänzen. Fehlt der Eintrag, greift `titleCaseSlug()` als
 * brauchbarer Fallback (jedes Bindestrich-Wort großgeschrieben).
 */

const CITY_DISPLAY_NAMES: Record<string, string> = {
  // Umlaute / ß
  duesseldorf: 'Düsseldorf',
  koeln: 'Köln',
  muenchen: 'München',
  tuebingen: 'Tübingen',
  giessen: 'Gießen',
  saarbruecken: 'Saarbrücken',
  // Regionen / Mehrwort (korrekte amtliche Schreibweise)
  bw: 'Baden-Württemberg',
  'nord-rhein-westfalen': 'Nordrhein-Westfalen',
  'rheinland-pfalz': 'Rheinland-Pfalz',
  'rhein-main-gebiet': 'Rhein-Main-Gebiet',
  'main-taunus-kreis': 'Main-Taunus-Kreis',
  // Länder – deutsche Bezeichnung auf der deutschen Seite
  belgique: 'Belgien',
  luxembourg: 'Luxemburg',
  schweiz: 'Schweiz',
};

/**
 * Fallback: jedes durch Bindestrich getrennte Wort großschreiben.
 * „hanau" → „Hanau", „bad-homburg" → „Bad-Homburg".
 */
const titleCaseSlug = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');

/**
 * Korrekter Anzeigename einer Stadt/Region für Titel, H1 & Breadcrumbs.
 * @param slug URL-Slug aus landings.md (z.B. "duesseldorf")
 * @returns Anzeigename (z.B. "Düsseldorf")
 */
export const getCityDisplayName = (slug: string): string => {
  const key = (slug ?? '').trim().toLowerCase();
  if (!key) return '';
  return CITY_DISPLAY_NAMES[key] ?? titleCaseSlug(key);
};
