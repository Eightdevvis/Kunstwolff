import { describe, expect, it } from 'vitest';
import { safeDecode } from '../src/utils/safeDecode';
import { buildBrandLabel } from '../src/utils/brandLogos';

// Ein „%" im Dateinamen ließ decodeURIComponent werfen und damit den Build
// (admin memory/open/filename-sanitizing.md).
describe('safeDecode', () => {
  it('dekodiert gültige Escapes wie bisher', () => {
    expect(safeDecode('k%C3%B6ln.webp')).toBe('köln.webp');
  });

  it('wirft bei einem einzelnen % nicht, sondern gibt den Namen roh zurück', () => {
    expect(safeDecode('50%-rabatt.webp')).toBe('50%-rabatt.webp');
  });

  it('Logo-Label übersteht ein % im Dateinamen', () => {
    expect(buildBrandLabel('100%-kunde.svg')).toBe('100% kunde');
  });
});
