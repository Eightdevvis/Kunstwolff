import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Der Alt-Text-Feldnamen-Fehler, festgenagelt.
 *
 * Das Admin-Tool schrieb den Alt-Text jahrelang in das Feld `alt`. Website
 * (slideImages.ts) und Admin (mediaLibrary.ts) lasen es beide als Alias – aber
 * readMetadata/nextEntry hier übernehmen beim Neuschreiben nur eine feste
 * Feldliste, und `alt` stand nicht darauf. Also löschte der pre-commit-Hook
 * bei JEDEM lokalen Commit sämtliche von Hand getippten Alt-Texte, worauf die
 * Anzeige auf den maschinell erzeugten `altOverride` aus
 * migrate-slide-meta.mjs zurückfiel ("automatische Namen").
 *
 * Tückisch war der Zeitversatz: Kaputt ging es nicht beim Tippen, sondern beim
 * nächsten Commit von irgendwem.
 */

const scriptPath = path.resolve('./scripts/sync-slides-metadata.mjs');

const KEY = 'frankfurt/schnellzeichnerin-portraitiert-gaeste-auf-firmenfeier.webp';

/** Minimaler Repo-Abzug: ein Slide auf der Platte + die Metadatei dazu. */
function laufMit(eintrag: Record<string, unknown>) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-slides-alt-'));
  const slides = path.join(dir, 'public', 'img', 'slides');
  fs.mkdirSync(path.join(slides, 'frankfurt'), { recursive: true });
  fs.writeFileSync(path.join(slides, KEY), 'nicht wirklich ein Bild');
  fs.writeFileSync(
    path.join(slides, 'slides.meta.json'),
    JSON.stringify({ [KEY]: { categories: ['Schnellzeichner'], priority: 3, ...eintrag } }, null, 2),
  );
  try {
    const res = spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf-8' });
    const meta = JSON.parse(fs.readFileSync(path.join(slides, 'slides.meta.json'), 'utf-8'));
    return { res, eintrag: meta[KEY] ?? {} };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('sync-slides-metadata wirft keinen Alt-Text mehr weg', () => {
  it('hebt ein vom Admin geschriebenes alt auf altOverride', () => {
    const { res, eintrag } = laufMit({ alt: 'Schnellzeichnerin porträtiert Gäste auf einer Firmenfeier' });
    expect(res.status).toBe(0);
    expect(eintrag.altOverride).toBe('Schnellzeichnerin porträtiert Gäste auf einer Firmenfeier');
  });

  it('behält einen bestehenden altOverride unverändert', () => {
    const { eintrag } = laufMit({ altOverride: 'Von Hand geschrieben' });
    expect(eintrag.altOverride).toBe('Von Hand geschrieben');
  });

  it('lässt altOverride gewinnen, wenn beide Felder dastehen', () => {
    const { eintrag } = laufMit({ alt: 'alter Stand', altOverride: 'aktueller Stand' });
    expect(eintrag.altOverride).toBe('aktueller Stand');
  });

  it('bleibt beim zweiten Lauf stabil – der Text darf nicht wandern', () => {
    const { eintrag } = laufMit({ alt: 'Beschreibung' });
    const zweiter = laufMit(eintrag);
    expect(zweiter.eintrag.altOverride).toBe('Beschreibung');
  });

  it('erfindet keinen Alt-Text, wenn keiner gepflegt ist', () => {
    const { eintrag } = laufMit({});
    expect(eintrag).not.toHaveProperty('altOverride');
  });

  it('ignoriert einen leeren Alt-Text, statt ein leeres Feld zu schreiben', () => {
    const { eintrag } = laufMit({ alt: '   ' });
    expect(eintrag).not.toHaveProperty('altOverride');
  });

  it('behält die übrigen Felder des Eintrags', () => {
    const { eintrag } = laufMit({ alt: 'Beschreibung', title: 'Live-Kunst Frankfurt', enabled: false });
    expect(eintrag.priority).toBe(3);
    expect(eintrag.title).toBe('Live-Kunst Frankfurt');
    expect(eintrag.enabled).toBe(false);
    expect(eintrag.categories).toEqual(['Schnellzeichner']);
  });
});
