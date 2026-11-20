/**
 * `decodeURIComponent`, das bei einem einzelnen `%` im Dateinamen nicht wirft.
 *
 * Dateinamen auf der Platte sind nicht URL-kodiert. Ein Upload wie
 * `50%-rabatt.webp` ließ `decodeURIComponent` mit „URI malformed" werfen – und
 * damit den ganzen Build; live blieb der alte Stand stehen. Dann eben roh.
 */
export const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    // Kein gültiges %-Escape: der Name wird unverändert benutzt (gewollt, kein Fehler).
    return value;
  }
};
