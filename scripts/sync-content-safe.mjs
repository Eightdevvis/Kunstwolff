import { spawnSync } from 'child_process';

const steps = [
  { name: 'sync:landings', script: 'scripts/sync-landings.mjs' },
  { name: 'sync:skills', script: 'scripts/sync-skills.mjs' },
  // Das Tag-Vokabular MUSS vor den Inhalts-Tags laufen: sync-reviews-tags und
  // sync-faq-tags verwerfen einen Ort, den tags.json nicht kennt. Ohne diesen
  // Schritt bekäme eine neu angelegte Stadt nie Tags – die Inhalte lägen im
  // Ordner und wären auf der Seite unsichtbar, weil die Auswahl seit
  // 2026-07-28 allein über Tags läuft.
  { name: 'sync:tags', script: 'scripts/sync-tags.mjs', hart: true },
  { name: 'sync:reviews-tags', script: 'scripts/sync-reviews-tags.mjs' },
  { name: 'sync:faq-tags', script: 'scripts/sync-faq-tags.mjs' },
  { name: 'sync:title-images', script: 'scripts/sync-title-images.mjs' },
  { name: 'sync:slides', script: 'scripts/sync-slides-metadata.mjs' },
  { name: 'sync:why', script: 'scripts/sync-why.mjs' },
  { name: 'sync:events', script: 'scripts/sync-events.mjs' },
  { name: 'sync:erinnerungen', script: 'scripts/sync-erinnerungen.mjs' },
  // MUSS nach landings/skills/events laufen: das Skript liest genau diese drei
  // Register, um zu wissen, welcher Slug eine Stadt, ein Anlass oder ein
  // Können ist. Auf einem Build-Server ohne volle Git-Historie überspringt es
  // sich selbst und lässt die committete lastmod.json stehen.
  { name: 'sync:lastmod', script: 'scripts/sync-lastmod.mjs' },
  // Guard läuft hier nur als Warnung (Script bleibt tolerant/exit 0); hart
  // blockiert wird er über `sync:content` im pre-commit-Hook.
  { name: 'validate:images', script: 'scripts/validate-image-refs.mjs' },
];

/**
 * Schritte, deren Fehlschlag den Build abbrechen MUSS.
 *
 * `sync:tags` bricht ab, wenn ein Event-Slug keinen passenden Anlass-Tag hätte —
 * die Event-Seite fände ihre Bilder dann nicht. Bisher wurde dieser Abbruch hier
 * zu einer Warnung heruntergestuft, mit der Begründung „hart blockiert über den
 * pre-commit-Hook". Die trägt nicht: **das Admin-Tool veröffentlicht über die
 * GitHub-API, dort läuft kein git-Hook.** Ein im Admin angelegtes Event mit
 * abweichendem Slug wäre also durchgerutscht, und der Vercel-Build hätte grün
 * gemeldet, während das Vokabular auf dem alten Stand einfriert — für ALLE drei
 * Dimensionen, auch für gleichzeitig angelegte Städte.
 * (C1 in reports/tagsystem-audit-2026-07-30.md)
 */
const failures = [];
const harteFehler = [];

for (const step of steps) {
  console.log(`sync-content-safe: starte ${step.name} ...`);

  const result = spawnSync('node', [step.script], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    failures.push(step.name);
    if (step.hart) {
      harteFehler.push(step.name);
      console.error(`sync-content-safe: FEHLER - ${step.name} fehlgeschlagen (exit ${result.status ?? 'unknown'}). Das ist ein harter Schritt, der Build bricht ab.`);
      break;
    }
    console.warn(`sync-content-safe: Warnung - ${step.name} fehlgeschlagen (exit ${result.status ?? 'unknown'}), fahre fort.`);
  }
}

if (harteFehler.length > 0) {
  // Kein beruhigender Nachsatz: hier ist NICHTS verwendbar, der Build ist tot.
  console.error(`sync-content-safe: abgebrochen bei: ${harteFehler.join(', ')}`);
} else if (failures.length > 0) {
  console.warn(`sync-content-safe: abgeschlossen mit Teilfehlern: ${failures.join(', ')}`);
  console.warn('sync-content-safe: Letzter gültiger Datenstand bleibt verwendbar.');
} else {
  console.log('sync-content-safe: alle Sync-Schritte erfolgreich.');
}

if (harteFehler.length > 0) {
  console.error(`sync-content-safe: harte Schritte fehlgeschlagen: ${harteFehler.join(', ')}`);
  process.exit(1);
}

process.exit(0);
