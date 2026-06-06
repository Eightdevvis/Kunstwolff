import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// WEB-005/P3-5: Der resize-Handler muss global EINMAL gebunden werden (Guard-Flag
// auf window), nicht einmal pro Slider in initSliders – sonst akkumulieren die
// Listener bei Astro-View-Transitions und referenzieren detachten DOM.

const src = fs.readFileSync(
  path.resolve('./src/components/slideshows/Slideshow.astro'),
  'utf-8',
);

describe('Slideshow resize-Handler (WEB-005)', () => {
  it('bindet resize global über ein Guard-Flag', () => {
    expect(src).toContain('__kwSlideshowResizeBound');
  });

  it('registriert resize NICHT pro Slider', () => {
    expect(src).not.toMatch(/addEventListener\("resize",\s*recalcUniformHeight\)/);
  });
});
