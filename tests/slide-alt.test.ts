import { describe, expect, it } from 'vitest';
import { slideAltFallback } from '../src/utils/slideImages';

// WEB-011/P3-7: Rein numerische Dateinamen (z.B. 1000018280.webp) ergaben einen
// leeren oder reinen Zahl-Alt-Text – wertlos für A11y/SEO. Fallback muss greifen.

describe('slideAltFallback (WEB-011)', () => {
  it('behält sinnvolle Alt-Texte unverändert', () => {
    expect(slideAltFallback('Schnellzeichner auf Messe')).toBe('Schnellzeichner auf Messe');
    expect(slideAltFallback('Karikatur Berlin')).toBe('Karikatur Berlin');
  });

  it('ersetzt leere und rein numerische Alt-Texte durch einen Default', () => {
    expect(slideAltFallback('')).toBe('Live-Kunst von Kunstwolff');
    expect(slideAltFallback('1000018280')).toBe('Live-Kunst von Kunstwolff');
    expect(slideAltFallback('42')).toBe('Live-Kunst von Kunstwolff');
  });
});
