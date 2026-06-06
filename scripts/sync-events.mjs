/**
 * sync-events.mjs
 *
 * Liest public/events/events.json und erstellt für jeden Event:
 *   - public/img/slides/events/{slug}/      (Slideshow-Ordner)
 *   - public/img/Titelbild/events/{slug}/   (Titelbild-Ordner)
 *   - public/events/{slug}/content.json     (Default-Content, wird NIE überschrieben)
 *
 * Das Script läuft als Teil von sync:content vor dev und build.
 * Bestehende content.json-Dateien werden nicht angefasst – der User/Admin
 * soll den Content ohne Angst vor Überschreiben pflegen können.
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const eventsRoot = path.join(projectRoot, 'public', 'events');
const eventsJsonPath = path.join(eventsRoot, 'events.json');
const slidesEventsRoot = path.join(projectRoot, 'public', 'img', 'slides', 'events');
const titelbildEventsRoot = path.join(projectRoot, 'public', 'img', 'Titelbild', 'events');

// ─── Helfer ────────────────────────────────────────────────────────────────────

/** Erstellt Verzeichnis (rekursiv) falls nicht vorhanden. Gibt true zurück wenn neu angelegt. */
const ensureDirectory = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }
  return false;
};

/**
 * Slugifiziert einen Text: NFD, lowercase, kebab-case.
 * Identisch mit der Logik in events.ts damit Slugs konsistent sind.
 */
const slugify = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Standard-content.json Template für neue Events (ohne bisherige Daten zu überschreiben) */
const buildDefaultContent = (event) => ({
  ablauf: {
    enabled: true,
    title: `So läuft Ihr Event ab`,
    steps: [
      {
        title: 'Anfrage & Planung',
        text: 'Kontaktieren Sie uns mit Datum, Ort und Gästeanzahl. Wir besprechen gemeinsam das passende Programm.',
        icon: 'chat',
      },
      {
        title: 'Aufbau vor Ort',
        text: 'Wir kommen rechtzeitig an und bauen alles diskret auf.',
        icon: 'setup',
      },
      {
        title: 'Live-Kunst',
        text: 'Während Ihre Gäste feiern entstehen individuelle Kunstwerke live vor ihren Augen.',
        icon: 'star',
      },
      {
        title: 'Persönliche Erinnerungen',
        text: 'Jeder Gast nimmt ein einzigartiges Kunstwerk mit nach Hause.',
        icon: 'gift',
      },
    ],
  },
  pakete: {
    enabled: true,
    title: 'Unsere Pakete',
    items: [
      {
        title: 'Basis',
        duration: '2 Stunden',
        price: 'Auf Anfrage',
        features: ['1 Künstler', 'Live-Kunst', 'Material inklusive'],
      },
      {
        title: 'Standard',
        duration: '4 Stunden',
        price: 'Auf Anfrage',
        features: ['1 Künstler', 'Live-Kunst', 'Material inklusive', 'Pause inklusive'],
      },
    ],
  },
  skills: {
    enabled: true,
    title: `Unsere Künstler für Ihr Event`,
  },
  referenzen: {
    enabled: false,
    title: 'Das sagen unsere Kunden',
    text: '',
    logos: [],
  },
});

// ─── Haupt-Sync ────────────────────────────────────────────────────────────────

const run = () => {
  // events.json lesen
  if (!fs.existsSync(eventsJsonPath)) {
    console.warn('sync-events: public/events/events.json nicht gefunden, überspringe.');
    return;
  }

  let events;
  try {
    const raw = fs.readFileSync(eventsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw);
    events = Array.isArray(parsed) ? parsed : (parsed.events ?? []);
  } catch (err) {
    // WEB-003: tolerant wie der Rest des Scripts (fehlende Datei → return).
    // Ein kaputtes events.json soll Sync/Build/Commit NICHT hart abbrechen,
    // sondern sichtbar warnen und den letzten gültigen Stand behalten.
    console.warn(`sync-events: events.json unlesbar/kaputt (${err.message}) – überspringe Event-Sync, behalte letzten Stand.`);
    return;
  }

  if (events.length === 0) {
    console.log('sync-events: Keine Events in events.json – nichts zu tun.');
    return;
  }

  // Übergeordnete events/-Ordner sicherstellen
  ensureDirectory(slidesEventsRoot);
  ensureDirectory(titelbildEventsRoot);

  const stats = { slidesCreated: [], titelbildCreated: [], contentCreated: [] };

  for (const event of events) {
    const title = String(event.title ?? '').trim();
    if (!title) continue;

    // Slug: aus JSON oder automatisch generiert
    const slug = String(event.slug ?? '').trim() || slugify(title);

    // 1) Slides-Ordner anlegen
    const slidesDir = path.join(slidesEventsRoot, slug);
    if (ensureDirectory(slidesDir)) {
      stats.slidesCreated.push(slug);
      console.log(`sync-events: Slides-Ordner angelegt: public/img/slides/events/${slug}/`);
    }

    // 2) Titelbild-Ordner anlegen
    const titelbildDir = path.join(titelbildEventsRoot, slug);
    if (ensureDirectory(titelbildDir)) {
      stats.titelbildCreated.push(slug);
      console.log(`sync-events: Titelbild-Ordner angelegt: public/img/Titelbild/events/${slug}/`);
    }

    // 3) content.json anlegen falls nicht vorhanden (NIEMALS überschreiben!)
    const contentDir = path.join(eventsRoot, slug);
    const contentPath = path.join(contentDir, 'content.json');

    if (!fs.existsSync(contentPath)) {
      ensureDirectory(contentDir);
      const defaultContent = buildDefaultContent(event);
      fs.writeFileSync(contentPath, JSON.stringify(defaultContent, null, 2), 'utf-8');
      stats.contentCreated.push(slug);
      console.log(`sync-events: content.json angelegt: public/events/${slug}/content.json`);
    }
  }

  // Summary
  const totalNew = stats.slidesCreated.length + stats.titelbildCreated.length + stats.contentCreated.length;
  if (totalNew === 0) {
    console.log(`sync-events: Alle ${events.length} Events bereits synchronisiert, nichts Neues.`);
  } else {
    console.log(`sync-events: Fertig. ${events.length} Events verarbeitet.`);
    if (stats.slidesCreated.length) console.log(`  Neue Slides-Ordner:    ${stats.slidesCreated.join(', ')}`);
    if (stats.titelbildCreated.length) console.log(`  Neue Titelbild-Ordner: ${stats.titelbildCreated.join(', ')}`);
    if (stats.contentCreated.length) console.log(`  Neue content.json:     ${stats.contentCreated.join(', ')}`);
  }
};

run();
