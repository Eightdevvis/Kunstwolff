import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Die Startseiten-Auswahl (`default-selection.json`) ist die einzige Liste, die
 * bestimmt, ob die Slideshow auf der Startseite überhaupt erscheint. Sie wird
 * vom Admin geschrieben – auch vom KI-Chat, also ohne Hook und ohne Testlauf.
 *
 * Am 20.08.2026 landeten dort 21 Schlüssel ohne Ordner ("bild.webp" statt
 * "szenenmaler/bild.webp"). Kein Schlüssel traf ein Bild, die Auswahl war
 * effektiv leer – und der Leer-Guard in `Slideshow.astro` ließ die Sektion
 * spurlos verschwinden. Kein Fehler, kein Hinweis, nur weg.
 */

const REPO = process.cwd();
let tmp: string;

const bild = (rel: string) => {
  const p = path.join(tmp, 'public/img/slides', rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // Inhalt egal: die Größe wird optional gelesen, ein Slide entsteht auch ohne.
  fs.writeFileSync(p, 'nicht wirklich webp');
};

const auswahl = (eintraege: string[]) =>
  fs.writeFileSync(
    path.join(tmp, 'public/img/slides/default-selection.json'),
    JSON.stringify(eintraege),
    'utf-8',
  );

/** Modul frisch laden – die Pfade darin stehen ab dem Import fest (cwd). */
const ladeSlides = async () => {
  vi.resetModules();
  return await import('../src/utils/slideImages');
};

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-auswahl-'));
  fs.mkdirSync(path.join(tmp, 'public/img/slides'), { recursive: true });
  process.chdir(tmp);
});

afterEach(() => {
  process.chdir(REPO);
  fs.rmSync(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('getDefaultSlides – Auswahl mit Ordner-Schlüsseln', () => {
  it('nimmt genau die ausgewählten Bilder, in Auswahl-Reihenfolge', async () => {
    bild('default/a.webp');
    bild('szenenmaler/b.webp');
    bild('szenenmaler/c.webp');
    auswahl(['szenenmaler/c.webp', 'default/a.webp']);

    const { getDefaultSlides } = await ladeSlides();
    expect(getDefaultSlides().map((s) => s.src)).toEqual([
      '/img/slides/szenenmaler/c.webp',
      '/img/slides/default/a.webp',
    ]);
  });

  it('fällt auf den default-Ordner zurück, wenn KEIN Eintrag trifft', async () => {
    bild('default/a.webp');
    bild('szenenmaler/b.webp');
    // Genau der Fehler vom 20.08.: Dateinamen ohne Ordner.
    auswahl(['b.webp', 'gibtsnicht.webp']);

    const warnung = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getDefaultSlides } = await ladeSlides();
    const slides = getDefaultSlides();

    expect(slides.map((s) => s.src)).toEqual(['/img/slides/default/a.webp']);
    expect(slides.length).toBeGreaterThan(0); // niemals eine leere Startseite
    expect(warnung).toHaveBeenCalled();
  });

  it('meldet einzelne Fehlgriffe, liefert aber die Treffer aus', async () => {
    bild('default/a.webp');
    bild('szenenmaler/b.webp');
    auswahl(['szenenmaler/b.webp', 'szenenmaler/weg.webp']);

    const warnung = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getDefaultSlides } = await ladeSlides();

    expect(getDefaultSlides().map((s) => s.src)).toEqual(['/img/slides/szenenmaler/b.webp']);
    expect(warnung).toHaveBeenCalled();
  });

  it('leere Auswahl heißt weiterhin: kompletter default-Ordner', async () => {
    bild('default/a.webp');
    bild('default/b.webp');
    bild('szenenmaler/c.webp');
    auswahl([]);

    const { getDefaultSlides } = await ladeSlides();
    expect(getDefaultSlides().map((s) => s.src)).toEqual([
      '/img/slides/default/a.webp',
      '/img/slides/default/b.webp',
    ]);
  });
});

describe('die echte Auswahl im Repo', () => {
  const echt: string[] = JSON.parse(
    fs.readFileSync(path.join(REPO, 'public/img/slides/default-selection.json'), 'utf-8'),
  );

  it('ist nicht leer', () => {
    expect(echt.length).toBeGreaterThan(0);
  });

  it('trägt bei jedem Eintrag den Ordner mit', () => {
    expect(echt.filter((k) => !k.includes('/'))).toEqual([]);
  });

  it('zeigt bei jedem Eintrag auf eine vorhandene Datei', () => {
    const fehlend = echt.filter((k) => !fs.existsSync(path.join(REPO, 'public/img/slides', k)));
    expect(fehlend).toEqual([]);
  });
});
