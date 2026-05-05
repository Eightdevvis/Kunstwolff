# Git-Hooks

## Aktivierung (einmalig)

```bash
npm run setup:hooks
```

Setzt `core.hooksPath` auf `.githooks/`.

## Übersicht

| Hook | Wann | Was |
| :-- | :-- | :-- |
| `pre-commit` | Vor jedem Commit | 1. Gestagete Bilder zu WebP optimieren (`optimize:images`)<br>2. `sync:content` ausführen<br>3. generierte Ordner in `public/` stagen |
| `pre-push` | Vor jedem Push | **Alle** nicht-WebP Bilder in `public/img/` konvertieren und als separaten Commit pushen |

## Pre-Commit-Detail

Weil `sync:content` im Hook läuft, können neu generierte Dateien automatisch zum Commit hinzugefügt werden – auch solche die vorher nicht gestaged waren. Das ist gewollt.

## Pre-Push-Detail: Automatische Bildoptimierung

Workflow für Endbenutzer: Bild (`.jpg`, `.jpeg`, `.png`, `.gif`) in beliebige Unterordner von `public/img/` legen → committen → pushen. Der Pre-Push-Hook macht dann automatisch:

1. Scannt alle `public/img/` Unterordner rekursiv
2. Konvertiert gefundene Nicht-WebP-Bilder → `.webp` (max. 1600px, Qualität 75)
3. Löscht die Originaldateien
4. Wenn Slides betroffen: `slides.meta.json` wird automatisch aktualisiert
5. Erstellt einen Commit `chore: optimize images to webp` und pusht ihn mit

## Manuelle Bildoptimierung

```bash
npm run optimize:all
```

Konvertiert alle Bilder in `public/img/` zu WebP (einmalig/manuell). Sinnvoll für initiale Migrationen.

## Wichtig fürs Admin-Tool

Das Admin-Tool **bypassed** die Pre-Push-Hooks (es schreibt direkt via GitHub API). Das heißt: Bilder, die das Admin-Tool hochlädt, werden **nicht** automatisch zu WebP konvertiert. Siehe `admin-tool.md`.
