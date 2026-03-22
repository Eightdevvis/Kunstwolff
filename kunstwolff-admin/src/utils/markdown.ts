/**
 * Parst Frontmatter aus einem Markdown-String.
 * Erwartet Format: --- \n key: value \n --- \n body
 */
export interface Frontmatter {
  [key: string]: string | string[];
}

export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

  const fm: Frontmatter = {};
  const lines = match[1].split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Array-Wert: Key ohne Wert, nächste Zeilen mit "  - item"
    const arrayKey = line.match(/^(\w+):\s*$/);
    if (arrayKey) {
      const arr: string[] = [];
      i++;
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        arr.push(lines[i].replace(/^\s+-\s+/, '').trim());
        i++;
      }
      fm[arrayKey[1]] = arr;
      continue;
    }
    // Einfacher Key: Value – erst alles nach "key: " erfassen, dann Quotes explizit strippen.
    // Warum nicht "?(.*?)"?: lazy matching + optionale Quotes führt bei inneren Quotes
    // zu falschen Captures. Besser: raw Value nehmen, dann äußerste Quotes entfernen.
    const kv = line.match(/^(\w+):\s+(.+?)\s*$/);
    if (kv) {
      const raw = kv[2];
      // Nur die äußersten Anführungszeichen entfernen (z.B. "Wert" → Wert),
      // innere Quotes ("Wert "mit" Anführung") bleiben erhalten
      fm[kv[1]] = (raw.startsWith('"') && raw.endsWith('"') && raw.length > 1)
        ? raw.slice(1, -1)
        : raw;
    }
    i++;
  }

  return { frontmatter: fm, body: match[2].trim() };
}

/**
 * Serialisiert Frontmatter + Body zurück zu Markdown.
 */
export function serializeFrontmatter(frontmatter: Frontmatter, body: string): string {
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) lines.push(`  - ${item}`);
    } else {
      lines.push(`${key}: "${value}"`);
    }
  }
  lines.push('---');
  if (body) lines.push(body);
  return lines.join('\n') + '\n';
}
