import fs from 'fs';
import path from 'path';

/**
 * Zieht Metadaten-Schlüssel mit, wenn ein Bild umbenannt wurde.
 *
 * Die Optimierer machen aus `x.gif` ein `x.webp`. Die Metadaten-Dateien
 * schlüsseln auf den Dateinamen relativ zu ihrem Ordner. Bleibt der alte
 * Schlüssel stehen, zeigt er ins Leere – und das fällt niemandem auf: die Seite
 * rendert klaglos weiter, nur mit Standardwerten. Der im Admin eingestellte
 * Bildausschnitt, der Rahmen, die Reihenfolge und die Stichworte sind dann
 * still verloren. Genau so ist einmal ein frisch gesetzter Titelbild-Rahmen
 * verschwunden, ohne dass irgendwo ein Fehler aufgetaucht wäre.
 */

/** Metadaten-Dateien und der Ordner, auf den ihre Schlüssel sich beziehen. */
export const META_FILES = [
  { file: 'public/img/slides/slides.meta.json', root: 'public/img/slides' },
  { file: 'public/img/Titelbild/title.meta.json', root: 'public/img/Titelbild' },
];

const toKey = (root, filePath) => path.relative(root, filePath).split(path.sep).join('/');

/**
 * @param {string} projectRoot
 * @param {Array<{original: string, optimized: string}>} conversions  Pfade relativ zu projectRoot
 * @param {(file: string) => void} [onWrite]  wird je geänderter Datei aufgerufen (z.B. für `git add`)
 * @returns {number} Anzahl umgeschlüsselter Einträge
 */
export const migrateMetadataKeys = (projectRoot, conversions, onWrite) => {
  let migrated = 0;

  for (const { file, root } of META_FILES) {
    const abs = path.join(projectRoot, file);
    if (!fs.existsSync(abs)) continue;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(abs, 'utf-8'));
    } catch (err) {
      // Lieber laut sein als still die Datei überschreiben.
      console.error(`bild-metadaten: ${file} nicht lesbar (${err.message}) – übersprungen.`);
      continue;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) continue;

    let changed = false;
    for (const conversion of conversions) {
      const { original, optimized } = conversion;
      if (!original || !optimized) continue;
      if (!original.startsWith(`${root}/`)) continue;

      const oldKey = toKey(root, original);
      const newKey = toKey(root, optimized);
      if (oldKey === newKey || !(oldKey in data)) continue;

      // Gibt es zum neuen Namen schon einen Eintrag, gewinnt der – er ist jünger.
      if (!(newKey in data)) data[newKey] = data[oldKey];
      delete data[oldKey];
      changed = true;
      migrated += 1;
    }

    if (changed) {
      fs.writeFileSync(abs, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
      onWrite?.(file);
    }
  }

  return migrated;
};
