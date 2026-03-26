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

