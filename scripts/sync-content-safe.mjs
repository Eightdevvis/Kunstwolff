import { spawnSync } from 'child_process';

const steps = [
  { name: 'sync:landings', script: 'scripts/sync-landings.mjs' },
  { name: 'sync:skills', script: 'scripts/sync-skills.mjs' },
  // Das Tag-Vokabular MUSS vor den Inhalts-Tags laufen: sync-reviews-tags und
  // sync-faq-tags verwerfen einen Ort, den tags.json nicht kennt. Ohne diesen
  // Schritt bekäme eine neu angelegte Stadt nie Tags – die Inhalte lägen im
  // Ordner und wären auf der Seite unsichtbar, weil die Auswahl seit
  // 2026-07-28 allein über Tags läuft.
  { name: 'sync:tags', script: 'scripts/sync-tags.mjs' },
  { name: 'sync:reviews-tags', script: 'scripts/sync-reviews-tags.mjs' },
  { name: 'sync:faq-tags', script: 'scripts/sync-faq-tags.mjs' },
  { name: 'sync:title-images', script: 'scripts/sync-title-images.mjs' },
  { name: 'sync:slides', script: 'scripts/sync-slides-metadata.mjs' },
  { name: 'sync:why', script: 'scripts/sync-why.mjs' },
  { name: 'sync:events', script: 'scripts/sync-events.mjs' },
  { name: 'sync:erinnerungen', script: 'scripts/sync-erinnerungen.mjs' },
  // Guard läuft hier nur als Warnung (Script bleibt tolerant/exit 0); hart
  // blockiert wird er über `sync:content` im pre-commit-Hook.
  { name: 'validate:images', script: 'scripts/validate-image-refs.mjs' },
];

const failures = [];

for (const step of steps) {
  console.log(`sync-content-safe: starte ${step.name} ...`);

  const result = spawnSync('node', [step.script], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    failures.push(step.name);
    console.warn(`sync-content-safe: Warnung - ${step.name} fehlgeschlagen (exit ${result.status ?? 'unknown'}), fahre fort.`);
  }
}

if (failures.length > 0) {
  console.warn(`sync-content-safe: abgeschlossen mit Teilfehlern: ${failures.join(', ')}`);
  console.warn('sync-content-safe: Letzter gültiger Datenstand bleibt verwendbar.');
} else {
  console.log('sync-content-safe: alle Sync-Schritte erfolgreich.');
}

process.exit(0);
