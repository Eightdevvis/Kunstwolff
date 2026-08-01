import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// @ts-expect-error – reines JS-Modul ohne Typen
import { migrateMetadataKeys } from '../scripts/bild-metadaten-schluessel.mjs';

/**
 * Wenn der Optimierer aus x.gif ein x.webp macht, muss der Metadaten-Schlüssel
 * mitwandern. Sonst zeigt er ins Leere – und das ist der unangenehme Fall: die
 * Seite rendert weiter, nur mit Standardwerten. Es gibt keine Fehlermeldung,
 * der im Admin eingestellte Bildausschnitt ist einfach weg.
 */

let tmp: string;

const schreibe = (rel: string, inhalt: string) => {
  const p = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, inhalt, 'utf-8');
};

const lies = (rel: string) => JSON.parse(fs.readFileSync(path.join(tmp, rel), 'utf-8'));

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kw-meta-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('migrateMetadataKeys', () => {
  it('zieht den Schlüssel auf den neuen Dateinamen und behält die Werte', () => {
    schreibe(
      'public/img/Titelbild/title.meta.json',
      JSON.stringify({ 'szenenmaler/bild.gif': { focus: '49% 60%', frame: 0 } }, null, 2),
    );

    const anzahl = migrateMetadataKeys(tmp, [
      {
        original: 'public/img/Titelbild/szenenmaler/bild.gif',
        optimized: 'public/img/Titelbild/szenenmaler/bild.webp',
      },
    ]);

    expect(anzahl).toBe(1);
    const daten = lies('public/img/Titelbild/title.meta.json');
    expect(daten['szenenmaler/bild.gif']).toBeUndefined();
    expect(daten['szenenmaler/bild.webp']).toEqual({ focus: '49% 60%', frame: 0 });
  });

  it('meldet die geänderte Datei zurück, damit sie gestaged werden kann', () => {
    schreibe(
      'public/img/slides/slides.meta.json',
      JSON.stringify({ 'events/hochzeit/a.png': { priority: 7 } }, null, 2),
    );

    const gemeldet: string[] = [];
    migrateMetadataKeys(
      tmp,
      [{ original: 'public/img/slides/events/hochzeit/a.png', optimized: 'public/img/slides/events/hochzeit/a.webp' }],
      (f: string) => gemeldet.push(f),
    );

    expect(gemeldet).toEqual(['public/img/slides/slides.meta.json']);
    expect(lies('public/img/slides/slides.meta.json')['events/hochzeit/a.webp']).toEqual({ priority: 7 });
  });

  it('rührt nichts an, wenn nur verkleinert wurde (Name bleibt gleich)', () => {
    const vorher = JSON.stringify({ 'bw/a.webp': { priority: 3 } }, null, 2);
    schreibe('public/img/slides/slides.meta.json', vorher);

    const gemeldet: string[] = [];
    const anzahl = migrateMetadataKeys(
      tmp,
      [{ original: 'public/img/slides/bw/a.webp', optimized: 'public/img/slides/bw/a.webp' }],
      (f: string) => gemeldet.push(f),
    );

    expect(anzahl).toBe(0);
    expect(gemeldet).toEqual([]);
    expect(fs.readFileSync(path.join(tmp, 'public/img/slides/slides.meta.json'), 'utf-8')).toBe(vorher);
  });

  it('überschreibt einen bereits vorhandenen neuen Eintrag nicht', () => {
    // Der Eintrag zum neuen Namen ist jünger – der alte darf ihn nicht verdrängen.
    schreibe(
      'public/img/Titelbild/title.meta.json',
      JSON.stringify({ 'a/b.gif': { frame: 0 }, 'a/b.webp': { frame: 12 } }, null, 2),
    );

    migrateMetadataKeys(tmp, [
      { original: 'public/img/Titelbild/a/b.gif', optimized: 'public/img/Titelbild/a/b.webp' },
    ]);

    const daten = lies('public/img/Titelbild/title.meta.json');
    expect(daten['a/b.webp']).toEqual({ frame: 12 });
    expect(daten['a/b.gif']).toBeUndefined();
  });

  it('lässt Bilder ausserhalb der Metadaten-Ordner in Ruhe', () => {
    schreibe('public/img/Titelbild/title.meta.json', JSON.stringify({ 'a/b.webp': { frame: 1 } }, null, 2));

    const anzahl = migrateMetadataKeys(tmp, [
      { original: 'public/img/hero-bg/x.png', optimized: 'public/img/hero-bg/x.webp' },
    ]);

    expect(anzahl).toBe(0);
  });

  it('bricht bei kaputtem JSON nicht ab', () => {
    schreibe('public/img/Titelbild/title.meta.json', '{ das ist kein JSON');

    expect(() =>
      migrateMetadataKeys(tmp, [
        { original: 'public/img/Titelbild/a/b.gif', optimized: 'public/img/Titelbild/a/b.webp' },
      ]),
    ).not.toThrow();
    // Und die kaputte Datei bleibt unangetastet, statt überschrieben zu werden.
    expect(fs.readFileSync(path.join(tmp, 'public/img/Titelbild/title.meta.json'), 'utf-8')).toBe(
      '{ das ist kein JSON',
    );
  });
});
