# Befehle (npm scripts)

## Standard-Workflow

```bash
npm install             # einmalig
npm run dev             # Dev-Server (predev = sync:content:safe)
npm run build           # Production-Build (prebuild = sync:content:safe)
npm run preview         # Build lokal prüfen
```

**Hinweis:** `predev` und `prebuild` rufen `sync:content:safe` auf (fehlertolerant), **nicht** `sync:content`. Beide führen dieselben Sync-Schritte aus, aber `:safe` isoliert Teilfehler, sodass Dev/Build nicht abbricht wenn ein Sync-Step fehlschlägt.

## Vollständige Befehlsübersicht

| Befehl | Zweck |
| :-- | :-- |
| `npm install` | Abhängigkeiten installieren |
| `npm run dev` | Entwicklungsserver starten (`predev` ruft `sync:content:safe`) |
| `npm run build` | Produktionsbuild (`prebuild` ruft `sync:content:safe`) |
| `npm run preview` | Build lokal prüfen |
| `npm run sync:content` | Alle Content-Syncs nacheinander ausführen |
| `npm run sync:content:safe` | Fehlertolerant (Teilfehler isoliert, Build/Dev läuft weiter) |
| `npm run sync:landings` | Stadtordner für Slides und Reviews anlegen |
| `npm run sync:skills` | Skill-Bildordner anlegen |
| `npm run sync:title-images` | Titelbild-Ordner anlegen, `title.meta.json` initialisieren |
| `npm run sync:slides` | Slide-Dateien und `slides.meta.json` synchronisieren |
| `npm run sync:why` | `public/why/` JSON-Dateien und Why-Bildordner synchronisieren |
| `npm run sync:events` | Event-Ordner anlegen, default `content.json` (bestehende NICHT überschreiben) |
| `npm run sync:erinnerungen` | `public/erinnerungen/{city\|skill}.json` (bestehende NICHT überschreiben) |
| `npm run remove:landing -- <stadt> [archivpfad]` | Archiviert alle Landing-Daten und entfernt Stadt aus `landings.md` |
| `npm run validate:images` | Bild-Referenzen prüfen (`scripts/validate-image-refs.mjs`); letzter Schritt von `sync:content` |
| `npm run optimize:images` | Nur gestagte Bilder zu WebP konvertieren (`scripts/optimize-staged-images.mjs`) |
| `npm run optimize:all` | Alle Bilder in `public/img/` zu WebP konvertieren (manuell) |
| `npm run test:unit` | Unit-Tests ausführen (`vitest run`) |
| `npm run setup:hooks` | Git-Hooks aktivieren (einmalig) |

## Automatik-Reihenfolge

`sync:content` führt aus (siehe `sync-scripts.md` für Details):
1. `sync:landings`
2. `sync:skills`
3. `sync:title-images`
4. `sync:slides`
5. `sync:why`
6. `sync:events`
7. `sync:erinnerungen`
8. `sync:content`, aber auch `sync:content:safe`, hängen `validate:images` als letzten Schritt an (Bild-Referenzen prüfen). In `:safe` läuft er nur als Warnung (bleibt exit 0), hart blockiert er über `sync:content` im pre-commit-Hook.

## VS Code

Projektspezifische Settings liegen in `.vscode/settings.json` (u.a. TypeScript-Plugin für Astro). Im Repo-Root liegen außerdem `extensions.json` und `launch.json`.

## Was (noch) NICHT als Script existiert

- **Kein `typecheck` / `check`-Script.** Astro transpiliert `.astro` ohne harten TS-Check, `.ts`-Fehler werden vom Build durchgewunken. Empfehlung im Health-Check: `"typecheck": "astro check"` in `package.json` ergänzen und im CI laufen lassen (siehe `HEALTH_CHECK_2026-05-05.md` BUG-A2).
- **Kein `lint`-Script.** Manueller Style-Check fehlt entsprechend.
