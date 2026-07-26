import { defineConfig } from 'vitest/config';

// Ohne diese Konfiguration sammelt vitest auch Tests aus `.claude/worktrees/`
// ein – stehengebliebene Arbeitskopien des Repos. Das ist aus zwei Gründen
// schädlich:
//
// 1. Diese Kopien enthalten ALTEN Code, dessen grüne Tests fälschlich Sicherheit
//    über den aktuellen Stand suggerieren.
// 2. Sie lösen ihre Pfade über `path.resolve('./public/...')` auf, also relativ
//    zum CWD des Laufs – dem HAUPT-Repo. `tests/page-visibility.test.ts` und
//    seine Worktree-Kopie schrieben dadurch dieselbe echte Datei
//    (`public/config/page-visibility.json`) und überschrieben sich je nach
//    Parallelisierung gegenseitig. Die Suite war damit nichtdeterministisch:
//    eine zusätzliche Testdatei genügte, um das Rennen auszulösen.
//
// `.claude/` ist ohnehin gitignored und gehört nicht in den Testlauf.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
  },
});
