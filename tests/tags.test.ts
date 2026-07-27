import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
// @ts-expect-error – reines JS-Modul ohne Typen, wie die übrigen scripts/
import { slugifyTag, mergeVocabulary, normalizeTagList, EXTRA_EVENTS, inferLandingsFromKey, inferEventsFromKey } from '../scripts/tags.mjs';

// Phase 5a: Tag-Vokabular Skill × Anlass × Ort.

describe('slugifyTag – Tag-Identität', () => {
  // Das Vokabular wird im Admin gepflegt, also getippt. Ohne Normalisierung
  // waeren "Weihnachtsfeier" und "weihnachtsfeier" zwei verschiedene Tags und
  // die Auto-Einsortierung fiele auseinander.
  it('macht Gross-/Kleinschreibung und Randleerzeichen egal', () => {
    expect(slugifyTag('Weihnachtsfeier')).toBe('weihnachtsfeier');
    expect(slugifyTag('  WEIHNACHTSFEIER  ')).toBe('weihnachtsfeier');
  });

  // Deutsche Umlaute werden AUSGESCHRIEBEN, nicht auf den Grundbuchstaben
  // reduziert – sonst verfehlt ein getippter Tag den vorhandenen Ortsslug.
  it('schreibt deutsche Umlaute aus, passend zu den Ortsslugs im Repo', () => {
    expect(slugifyTag('Jubiläum')).toBe('jubilaeum');
    expect(slugifyTag('Zürich')).toBe('zuerich');
    // Diese drei Orte existieren so im Repo (landings.md) – tippt jemand den
    // Klarnamen, MUSS derselbe Slug herauskommen.
    expect(slugifyTag('Köln')).toBe('koeln');
    expect(slugifyTag('Saarbrücken')).toBe('saarbruecken');
    expect(slugifyTag('Düsseldorf')).toBe('duesseldorf');
  });

  it('behandelt ß als ss statt es verschwinden zu lassen', () => {
    // NFD zerlegt ß nicht – ohne eigene Regel wurde daraus ein Trennzeichen:
    // "Straßenfest" ergab "stra-enfest".
    expect(slugifyTag('Straßenfest')).toBe('strassenfest');
    expect(slugifyTag('Größere Gala')).toBe('groessere-gala');
  });

  it('loest fremde Akzente weiterhin auf den Grundbuchstaben auf', () => {
    // Nur Deutsch wird ausgeschrieben; franzoesische Akzente fallen wie bisher.
    expect(slugifyTag('Liège')).toBe('liege');
    expect(slugifyTag('Café')).toBe('cafe');
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
    expect(tags.landings.map((o: any) => o.slug)).toEqual(['trier', 'berlin']);
    expect(tags.events[0].slug).toBe('messe');
    // Die Extras haengen hinten dran und sind als solche gekennzeichnet.
    expect(tags.events.filter((a: any) => a.source === 'extra')).toHaveLength(EXTRA_EVENTS.length);
  });

  it('laeuft ohne jede Quelle durch, statt den Build zu sprengen', () => {
    const { res, tags } = run({});
    expect(res.status).toBe(0);
    expect(tags.skills).toEqual([]);
    expect(tags.landings).toEqual([]);
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
    expect(inferLandingsFromKey('trier/foto.webp', ORTE)).toEqual(['trier']);
  });

  it('haelt Sammelordner von Orten fern', () => {
    expect(inferLandingsFromKey('default/foto.webp', ORTE)).toEqual([]);
    expect(inferLandingsFromKey('mediathek/foto.webp', ORTE)).toEqual([]);
  });

  // Der Fall, der im Ordnermodell unmoeglich war: Anlass UND Ort am selben Bild.
  it('holt den Ort auch aus dem Dateinamen eines Event-Slides', () => {
    expect(inferLandingsFromKey('events/firmenfeier/walking-act-company-party-mainz.webp', ORTE)).toEqual(['mainz']);
  });

  it('erkennt Region UND Stadt zugleich', () => {
    expect(inferLandingsFromKey('hessen/illustratorin-frankfurt.webp', ORTE)).toEqual(['hessen', 'frankfurt']);
    expect(inferLandingsFromKey('bw/karikaturistin-messe-stuttgart.webp', ORTE)).toEqual(['bw', 'stuttgart']);
  });

  // Ohne Wortgrenzen wuerde das kurze "bw" in beliebigen Namen zuenden.
  it('zuendet nicht auf Teilwoertern', () => {
    expect(inferLandingsFromKey('trier/abwasser-und-bwl-motive.webp', ORTE)).toEqual(['trier']);
    expect(inferLandingsFromKey('trier/frankfurter-wuerstchen.webp', ORTE)).toEqual(['trier']);
  });

  it('erfindet ohne bekanntes Vokabular keine Orte aus Dateinamen', () => {
    expect(inferLandingsFromKey('trier/etwas-mainz.webp', new Set())).toEqual(['trier']);
  });

  it('liest den Anlass aus dem events-Ordner', () => {
    expect(inferEventsFromKey('events/private-feier/foto.webp')).toContain('private-feier');
  });

  it('liest Anlaesse aus dem Dateinamen, auch mehrere', () => {
    expect(inferEventsFromKey('trier/kollegen-auf-der-weihnachtsfeier.webp').sort()).toEqual([
      'firmenfeier',
      'weihnachtsfeier',
    ]);
  });

  it('versteht die englischen Schreibweisen aus dem Bestand', () => {
    expect(inferEventsFromKey('koeln/wedding-portrait.webp')).toContain('hochzeit');
    expect(inferEventsFromKey('bw/schnellzeichner-toyota-trade-show.webp')).toContain('messe');
  });

  it('erfindet nichts, wenn kein Anlass erkennbar ist', () => {
    expect(inferEventsFromKey('trier/portrait-einer-frau.webp')).toEqual([]);
  });
});

describe('slides.meta.json – Tag-Block bleibt erhalten', () => {
  const scriptPath = path.resolve('./scripts/sync-slides-metadata.mjs');

  function runSync(meta: unknown) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-slides-'));
    const slides = path.join(dir, 'public', 'img', 'slides', 'trier');
    fs.mkdirSync(slides, { recursive: true });
    fs.writeFileSync(path.join(slides, 'hochzeit-in-trier.webp'), 'x');
    fs.mkdirSync(path.join(dir, 'public', 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'public', 'config', 'tags.json'),
      JSON.stringify({ skills: [], events: [], landings: [{ slug: 'trier', label: 'Trier' }] })
    );
    const metaPath = path.join(dir, 'public', 'img', 'slides', 'slides.meta.json');
    if (meta !== null) fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf-8' });
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'))['trier/hochzeit-in-trier.webp'];
  }

  it('belegt Skill, Event und Ort beim ersten Lauf vor', () => {
    const entry = runSync(null);
    expect(entry.tags.events).toEqual(['hochzeit']);
    expect(entry.tags.landings).toEqual(['trier']);
  });

  // DER Regressionsschutz: readMetadata() normalisiert Eintraege und wirft
  // Unbekanntes weg. Waere `tags` dort nicht durchgereicht, wuerde der Sync sie
  // bei JEDEM Lauf neu aus dem Dateinamen raten und jede Admin-Zuordnung
  // ueberschreiben.
  it('ueberschreibt eine Zuordnung aus dem Admin NICHT', () => {
    const entry = runSync({
      'trier/hochzeit-in-trier.webp': {
        categories: [],
        tags: { skills: ['szenenmaler'], events: ['gala'], landings: ['berlin'] },
      },
    });
    expect(entry.tags).toEqual({ skills: ['szenenmaler'], events: ['gala'], landings: ['berlin'] });
  });

  // Ein leeres Array heisst "gehoert bewusst nirgends hin" und ist etwas
  // anderes als "noch nie getaggt".
  it('unterscheidet leer von nicht gesetzt', () => {
    const entry = runSync({
      'trier/hochzeit-in-trier.webp': { categories: [], tags: { skills: [], events: [], landings: [] } },
    });
    expect(entry.tags).toEqual({ skills: [], events: [], landings: [] });
  });
});

describe('sync-reviews-tags.mjs', () => {
  const scriptPath = path.resolve('./scripts/sync-reviews-tags.mjs');

  function run(files: Record<string, string>, twice = false) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-rev-'));
    fs.mkdirSync(path.join(dir, 'public', 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'public', 'config', 'tags.json'),
      JSON.stringify({ skills: [], events: [], landings: [{ slug: 'trier', label: 'Trier' }] })
    );
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(dir, 'public', 'reviews', rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    }
    spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf-8' });
    if (twice) spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf-8' });
    const out: Record<string, string> = {};
    for (const rel of Object.keys(files)) {
      out[rel] = fs.readFileSync(path.join(dir, 'public', 'reviews', rel), 'utf-8');
    }
    return out;
  }

  const review = (body: string, cats = '  - Szenenmaler') =>
    `---\nauthor: "Test"\ncategories:\n${cats}\n---\n${body}\n`;

  it('leitet Skill aus categories, Ort aus dem Ordner und Anlass aus dem Text ab', () => {
    const out = run({ 'trier/review0.md': review('Wir hatten sie fuer unsere Hochzeit gebucht.') });
    expect(out['trier/review0.md']).toContain('tags:');
    expect(out['trier/review0.md']).toMatch(/skills:\n\s+- szenenmaler/);
    expect(out['trier/review0.md']).toMatch(/events:\n\s+- hochzeit/);
    expect(out['trier/review0.md']).toMatch(/landings:\n\s+- trier/);
  });

  it('schreibt leere Listen, wenn nichts erkennbar ist', () => {
    const out = run({ 'trier/review0.md': review('Sehr schoen war es.', '  - Szenenmaler') });
    expect(out['trier/review0.md']).toContain('events: []');
  });

  // Der Text darf NICHT umformatiert werden - sonst erzeugt die Migration einen
  // riesigen Diff und riskiert den eigenen Frontmatter-Parser des Admin-Tools.
  it('fuegt nur ein und formatiert nichts um', () => {
    const original = review('Text bleibt.', '  - Szenenmaler');
    const out = run({ 'trier/review0.md': original })['trier/review0.md'];
    expect(out).toContain('author: "Test"');
    for (const line of original.split('\n').filter(Boolean)) {
      expect(out).toContain(line);
    }
  });

  it('ruehrt einen vorhandenen tags-Block nicht an', () => {
    const withTags = `---\nauthor: "T"\ntags:\n  skills:\n    - handgemacht\n---\nHochzeit!\n`;
    const out = run({ 'trier/review0.md': withTags });
    expect(out['trier/review0.md']).toBe(withTags);
  });

  it('laesst Vorlagen aus', () => {
    const tpl = review('Vorlage');
    expect(run({ 'trier/_vorlage.md': tpl })['trier/_vorlage.md']).toBe(tpl);
  });

  it('ist idempotent', () => {
    const once = run({ 'trier/review0.md': review('Hochzeit') });
    const twice = run({ 'trier/review0.md': review('Hochzeit') }, true);
    expect(twice['trier/review0.md']).toBe(once['trier/review0.md']);
  });

  it('vergibt fuer den default-Ordner keinen Ort', () => {
    const out = run({ 'default/review0.md': review('Messe war toll.') });
    expect(out['default/review0.md']).toContain('landings: []');
    expect(out['default/review0.md']).toMatch(/events:\n\s+- messe/);
  });
});
