import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Regressionsschutz für WEB-003: Ein kaputtes/fehlendes events.json darf den
// Sync (und damit Build/pre-commit) NICHT hart abbrechen, sondern muss tolerant
// warnen und mit Exit 0 weiterlaufen – konsistent zu den anderen sync-Scripts.

const scriptPath = path.resolve('./scripts/sync-events.mjs');

function runInTempCwd(eventsJson: string | null) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-events-'));
  if (eventsJson !== null) {
    fs.mkdirSync(path.join(dir, 'public', 'events'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public', 'events', 'events.json'), eventsJson);
  }
  try {
    return spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf-8' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('sync-events Fehlertoleranz (WEB-003)', () => {
  it('bricht bei kaputtem events.json NICHT hart ab (exit 0) und warnt sichtbar', () => {
    const res = runInTempCwd('{ das ist : kaputt');
    expect(res.status).toBe(0);
    expect(`${res.stderr}${res.stdout}`).toMatch(/events\.json/i);
  });

  it('läuft bei fehlendem events.json sauber durch (exit 0)', () => {
    const res = runInTempCwd(null);
    expect(res.status).toBe(0);
  });

  it('verarbeitet gültiges events.json ohne Fehler (exit 0)', () => {
    const res = runInTempCwd(JSON.stringify({ events: [] }));
    expect(res.status).toBe(0);
  });
});
