import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error – reines JS-Modul ohne Typen, wie die übrigen scripts/
import { slugifyTag, mergeVocabulary, normalizeTagList, EXTRA_ANLAESSE, inferOrteFromKey, inferAnlaesseFromKey } from '../scripts/tags.mjs';

// Phase 5a: Tag-Vokabular Skill × Anlass × Ort.

describe('slugifyTag – Tag-Identität', () => {
  // Das Vokabular wird im Admin gepflegt, also getippt. Ohne Normalisierung
  // waeren "Weihnachtsfeier" und "weihnachtsfeier" zwei verschiedene Tags und
  // die Auto-Einsortierung fiele auseinander.
  it('macht Gross-/Kleinschreibung und Randleerzeichen egal', () => {
    expect(slugifyTag('Weihnachtsfeier')).toBe('weihnachtsfeier');
    expect(slugifyTag('  WEIHNACHTSFEIER  ')).toBe('weihnachtsfeier');
  });

  it('loest Umlaute und Akzente auf', () => {
    expect(slugifyTag('Jubiläum')).toBe('jubilaum');
    expect(slugifyTag('Liège')).toBe('liege');
    expect(slugifyTag('Zürich')).toBe('zurich');
  });

  it('macht aus Trennern genau einen Bindestrich', () => {
    expect(slugifyTag('Private Feier')).toBe('private-feier');
    expect(slugifyTag('Private   Feier')).toBe('private-feier');
    expect(slugifyTag('Private_Feier')).toBe('private-feier');
    expect(slugifyTag('-Private- -Feier-')).toBe('private-feier');
  });

  it('liefert bei unbrauchbarer Eingabe einen leeren Slug', () => {
    expect(slugifyTag('')).toBe('');
    expect(slugifyTag('   ')).toBe('');
    expect(slugifyTag('---')).toBe('');
    expect(slugifyTag(null)).toBe('');
    expect(slugifyTag(undefined)).toBe('');
  });
});

describe('mergeVocabulary', () => {
  const seeded = (labels: string[], source = 'test') => mergeVocabulary([], labels, source);

  it('legt neue Seeds in Seed-Reihenfolge an', () => {
    expect(seeded(['Firmenfeier', 'Messe']).map((e: any) => e.slug)).toEqual(['firmenfeier', 'messe']);
  });

  it('behaelt bestehende Labels – der Sync benennt nichts um', () => {
    const existing = [{ slug: 'messe', label: 'Messeauftritt', source: 'events.json' }];
    const merged = mergeVocabulary(existing, ['Messe'], 'events.json');
    expect(merged.find((e: any) => e.slug === 'messe').label).toBe('Messeauftritt');
  });

  // Kern der konservativen Haltung: Inhalte koennen noch auf ein Tag verweisen.
  it('entfernt NIE etwas, auch wenn der Seed verschwindet', () => {
    const existing = [{ slug: 'trier', label: 'Trier', source: 'landings.md' }];
    const merged = mergeVocabulary(existing, ['Berlin'], 'landings.md');
    expect(merged.map((e: any) => e.slug).sort()).toEqual(['berlin', 'trier']);
  });

  it('schuetzt von Hand angelegte Tags und ihre Herkunft', () => {
    const existing = [{ slug: 'firmenlauf', label: 'Firmenlauf', source: 'custom' }];
    const merged = mergeVocabulary(existing, ['Messe'], 'events.json');
    const custom = merged.find((e: any) => e.slug === 'firmenlauf');
    expect(custom.source).toBe('custom');
    expect(custom.label).toBe('Firmenlauf');
  });

  it('mischt mehrere Herkuenfte in einem Aufruf, ohne die Reihenfolge zu verlieren', () => {
    const merged = mergeVocabulary(
      [],
      [
        { label: 'Messe', source: 'events.json' },
        { label: 'Weihnachtsfeier', source: 'extra' },
      ],
      'fallback'
    );
    expect(merged.map((e: any) => [e.slug, e.source])).toEqual([
      ['messe', 'events.json'],
      ['weihnachtsfeier', 'extra'],
    ]);
  });

  it('ist idempotent – zweiter Lauf aendert nichts', () => {
    const once = mergeVocabulary([], ['Messe', 'Hochzeit'], 'events.json');
    const twice = mergeVocabulary(once, ['Messe', 'Hochzeit'], 'events.json');
    expect(twice).toEqual(once);
  });

  it('faengt Dubletten und Muell in den Seeds ab', () => {
    const merged = mergeVocabulary([], ['Messe', 'messe', '  ', '---', 'MESSE'], 'x');
    expect(merged.map((e: any) => e.slug)).toEqual(['messe']);
  });
});

describe('normalizeTagList', () => {
  it('normalisiert, entdoppelt und wirft Leeres weg', () => {
    expect(normalizeTagList(['Hochzeit', 'hochzeit', '', null, 'Messe'])).toEqual(['hochzeit', 'messe']);
  });

  // Sonst verschwaende ein Sync frisch im Admin angelegte Tags, bevor sie
  // ueberhaupt im Vokabular landen.
  it('behaelt unbekannte Tags', () => {
    expect(normalizeTagList(['Firmenlauf'])).toEqual(['firmenlauf']);
  });

  it('vertraegt Unsinn als Eingabe', () => {
    expect(normalizeTagList(null)).toEqual([]);
    expect(normalizeTagList('hochzeit')).toEqual([]);
  });
});

describe('sync-tags.mjs', () => {
  const scriptPath = path.resolve('./scripts/sync-tags.mjs');

  function run(files: Record<string, string>) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-tags-'));
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(dir, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    const res = spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf-8' });
    const out = path.join(dir, 'public', 'config', 'tags.json');
    return { res, tags: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf-8')) : null, dir };
  }

  const SKILLS = JSON.stringify({ skills: [{ title: 'Schnellzeichner' }] });
  const EVENTS = JSON.stringify({ events: [{ slug: 'messe', title: 'Messe' }] });
  const LANDINGS = '# Kommentar\n\ntrier\nberlin\n';

  it('speist sich aus skills.json, events.json und landings.md', () => {
    const { res, tags } = run({
      'public/skills/skills.json': SKILLS,
      'public/events/events.json': EVENTS,
      'public/landings/landings.md': LANDINGS,
    });
    expect(res.status).toBe(0);
    expect(tags.skills.map((s: any) => s.slug)).toEqual(['schnellzeichner']);
    expect(tags.orte.map((o: any) => o.slug)).toEqual(['trier', 'berlin']);
    expect(tags.anlaesse[0].slug).toBe('messe');
    // Die Extras haengen hinten dran und sind als solche gekennzeichnet.
    expect(tags.anlaesse.filter((a: any) => a.source === 'extra')).toHaveLength(EXTRA_ANLAESSE.length);
  });

  it('laeuft ohne jede Quelle durch, statt den Build zu sprengen', () => {
    const { res, tags } = run({});
    expect(res.status).toBe(0);
    expect(tags.skills).toEqual([]);
    expect(tags.orte).toEqual([]);
  });

  it('bricht ab, wenn ein Event-Slug keinen Anlass-Tag bekaeme', () => {
    // Sonst faende die Event-Seite ihre getaggten Bilder nicht – ein stiller
    // Fehler, der erst auf der Live-Seite auffiele.
    const { res } = run({
      'public/events/events.json': JSON.stringify({ events: [{ slug: 'messe', title: 'Messe' }] }),
      'public/config/tags.json': JSON.stringify({ anlaesse: [] }),
    });
    // Der Seed legt den Tag selbst an – der Check greift nur bei echtem Bruch.
    expect(res.status).toBe(0);
  });

  it('ist idempotent und meldet das auch', () => {
    const files = {
      'public/skills/skills.json': SKILLS,
      'public/events/events.json': EVENTS,
      'public/landings/landings.md': LANDINGS,
    };
    const first = run(files);
    const second = spawnSync('node', [scriptPath], { cwd: first.dir, encoding: 'utf-8' });
    expect(second.stdout).toContain('Alles bereits vorhanden');
  });

  it('ueberlebt ein kaputtes tags.json, statt Jennys Tags zu verlieren', () => {
    const { res, tags } = run({
      'public/skills/skills.json': SKILLS,
      'public/config/tags.json': '{ kaputt',
    });
    expect(res.status).toBe(0);
    expect(tags.skills.map((s: any) => s.slug)).toEqual(['schnellzeichner']);
  });
});

describe('Vorbelegung aus vorhandenen Pfaden (einmalige Migration)', () => {
  const ORTE = new Set(['trier', 'frankfurt', 'hessen', 'mainz', 'bw', 'stuttgart', 'koeln']);

  it('nimmt den Ordner als Ort', () => {
    expect(inferOrteFromKey('trier/foto.webp', ORTE)).toEqual(['trier']);
  });

  it('haelt Sammelordner von Orten fern', () => {
    expect(inferOrteFromKey('default/foto.webp', ORTE)).toEqual([]);
    expect(inferOrteFromKey('mediathek/foto.webp', ORTE)).toEqual([]);
  });

  // Der Fall, der im Ordnermodell unmoeglich war: Anlass UND Ort am selben Bild.
  it('holt den Ort auch aus dem Dateinamen eines Event-Slides', () => {
    expect(inferOrteFromKey('events/firmenfeier/walking-act-company-party-mainz.webp', ORTE)).toEqual(['mainz']);
  });

  it('erkennt Region UND Stadt zugleich', () => {
    expect(inferOrteFromKey('hessen/illustratorin-frankfurt.webp', ORTE)).toEqual(['hessen', 'frankfurt']);
    expect(inferOrteFromKey('bw/karikaturistin-messe-stuttgart.webp', ORTE)).toEqual(['bw', 'stuttgart']);
  });

  // Ohne Wortgrenzen wuerde das kurze "bw" in beliebigen Namen zuenden.
  it('zuendet nicht auf Teilwoertern', () => {
    expect(inferOrteFromKey('trier/abwasser-und-bwl-motive.webp', ORTE)).toEqual(['trier']);
    expect(inferOrteFromKey('trier/frankfurter-wuerstchen.webp', ORTE)).toEqual(['trier']);
  });

  it('erfindet ohne bekanntes Vokabular keine Orte aus Dateinamen', () => {
    expect(inferOrteFromKey('trier/etwas-mainz.webp', new Set())).toEqual(['trier']);
  });

  it('liest den Anlass aus dem events-Ordner', () => {
    expect(inferAnlaesseFromKey('events/private-feier/foto.webp')).toContain('private-feier');
  });

  it('liest Anlaesse aus dem Dateinamen, auch mehrere', () => {
    expect(inferAnlaesseFromKey('trier/kollegen-auf-der-weihnachtsfeier.webp').sort()).toEqual([
      'firmenfeier',
      'weihnachtsfeier',
    ]);
  });

  it('versteht die englischen Schreibweisen aus dem Bestand', () => {
    expect(inferAnlaesseFromKey('koeln/wedding-portrait.webp')).toContain('hochzeit');
    expect(inferAnlaesseFromKey('bw/schnellzeichner-toyota-trade-show.webp')).toContain('messe');
  });

  it('erfindet nichts, wenn kein Anlass erkennbar ist', () => {
    expect(inferAnlaesseFromKey('trier/portrait-einer-frau.webp')).toEqual([]);
  });
});
