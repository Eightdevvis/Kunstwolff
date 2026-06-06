// Positionsbasierte Zuordnung der 4 Why-Karten zu ihren Detailseiten.
// getWhyBenefits() liefert IMMER exakt diese 4 Positionen (Overrides ändern nur
// Feldwerte pro Position, nie Reihenfolge/Anzahl). Why.astro nutzt diese Liste;
// der Test why-detail-links.test.ts hält sie mit getWhyDetailLinkByTitle und den
// echten default.json-Titeln konsistent – driftet eins, schlägt der Test an.
export const WHY_DETAIL_LINKS = [
  '/stimmung-durch-kunst/',
  '/du-bist-kunst/',
  '/branding/',
  '/canvas/',
] as const;

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function getWhyDetailLinkByTitle(title: string): string {
  const key = normalize(title);

  if (key.includes('ihr geschmack')) return '/stimmung-durch-kunst/';
  if (key.includes('kreativ') && key.includes('persoenlich')) return '/du-bist-kunst/';
  if (key.includes('branding')) return '/branding/';
  if (key.includes('format')) return '/canvas/';

  return '';
}

