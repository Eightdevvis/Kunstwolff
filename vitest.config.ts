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
// ⚠️ Dasselbe Rennen gab es auch INNERHALB eines Laufs, und der Ausschluss oben
// hat es nicht behoben: `tests/page-visibility.test.ts` schreibt die echte
// `public/config/page-visibility.json` und stellt sie erst im `afterEach`
// wieder her. Jede Testdatei, die dieselbe Datei liest — `combo-urls`,
// `seo-meta`, `nav-*` — konnte in genau diesem Moment die Fixture-Fassung
// sehen und grundlos rot werden.
//
// Beobachtet am 2026-08-06: `combo-urls.test.ts` fiel in einem von vier Läufen
// aus, mit einer Meldung, die nach einem echten Fehler aussah („kein
// versteckter Skill zieht seine Ort-Kombis noch per Präfix mit"). Die
// Vorhersage im Kommentar oben ist damit eingetreten: eine zusätzliche
// Testdatei (`seo-meta.test.ts`) genügte.
//
// `fileParallelism: false` lässt die Testdateien nacheinander laufen. Kostet
// wenige Sekunden und ist der einzige Weg, der ohne Umbau der Prüflinge
// auskommt — die Lesefunktionen in `src/utils/pageVisibility.ts` lösen ihren
// Pfad fest auf und nehmen keinen Ort entgegen.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**'],
    fileParallelism: false,
  },
});
