# Git-Hooks

## Aktivierung (einmalig)

```bash
npm run setup:hooks
```

Setzt `core.hooksPath` auf `.githooks/`.

## Übersicht

| Hook | Wann | Was |
| :-- | :-- | :-- |
| `pre-commit` | Vor jedem Commit | 1. Gestagete Bilder zu WebP optimieren + gestagete WebP/AVIF auf Übergröße prüfen (`optimize:images`)<br>2. `sync:content` ausführen<br>3. generierte Ordner in `public/` stagen |
| `pre-push` | Vor jedem Push | **Alle** nicht-WebP Bilder in `public/img/` konvertieren und als separaten Commit pushen. Fasst vorhandene WebP/AVIF **nicht** an – dafür braucht es `--shrink-existing`, siehe unten. |

## Kantendeckel: EINE Quelle

`scripts/image-constraints.mjs` (`MAX_EDGE = 1600`, `WEBP_QUALITY = 75`, `resizeToMaxEdge()`) wird von **beiden** Hooks benutzt und spiegelt `kunstwolff-admin/src/utils/imageWebp.ts` (`MAX_EDGE`/`fitWithinEdge`). Wer den Wert ändert, muss das Admin-Repo mitziehen – sonst laufen Admin-Uploads und lokale Pushes auseinander.

⚠️ **Bis 2026-07-26 deckelten alle drei Stellen nur die BREITE** (`if (width > maxWidth)`). Bei Hochformat 3:4 – dem Normalfall dieser Fotos – wurde daraus 1600×2133 statt der gemeinten Fläche. Ergebnis: 139 von 295 Bildern über 1600px, 71 % des ausgelieferten Volumens, `/trier/` lud 14,5 MB. `resizeToMaxEdge()` setzt jetzt `width` UND `height` mit `fit: 'inside'`, deckelt also die längere Kante.

Zweite Lücke, gleiches Datum geschlossen: `allowedExtensions` kannte nur `jpg/jpeg/png/gif`. Seit die Admin-Uploads browser-seitig als WebP ankommen, umging damit **jedes** Admin-Bild jede weitere Optimierung – so sind 18 Dateien mit 3000×4000 ins Repo gelangt. Beide Hooks prüfen nun zusätzlich `.webp`/`.avif` auf Übergröße (konvertieren sie aber nicht, das wäre nur schlechter).

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

### Altbestand herunterrechnen (`--shrink-existing`)

```bash
node scripts/optimize-all-images.mjs --shrink-existing
```

Rechnet **vorhandene** WebP/AVIF-Dateien über dem Kantendeckel an Ort und Stelle herunter (Format bleibt, nur kleiner; wird das Ergebnis nicht kleiner, bleibt das Original).

**Bewusst NICHT im pre-push-Hook**, obwohl der dieses Skript aufruft. Der Hook committet sein Ergebnis ungefragt – ein automatischer Lauf wäre eine verlustbehaftete Massen-Neucodierung ohne Backup, und die Originale existieren nur im Repo. Zusätzlich bläht jede Neucodierung `.git` auf, weil Git alte Blobs behält. Der Durchgang ist für die **einmalige** Sanierung des Altbestands gedacht (Phase 3 in `reports/plan-bilder-upload-tags-2026-07-26.md`) – vorher Backup außerhalb von `public/` anlegen.

Neu **hinzukommende** Übergrößen braucht das nicht: die fängt der pre-commit-Hook ab, Admin-Uploads deckelt `imageWebp.ts` browser-seitig.

## Wichtig fürs Admin-Tool

Das Admin-Tool **bypassed** die Pre-Push-Hooks (es schreibt direkt via GitHub API). Früher hieß das: Admin-Uploads blieben unkonvertiert als `.jpg`/`.png` im Repo.

**Seit 2026-06-05 geschlossen:** Das Admin-Tool konvertiert Bilder jetzt **browser-seitig vor dem Upload** zu WebP (`kunstwolff-admin/src/utils/imageWebp.ts`, genutzt von allen 4 Bild-Managern + Mediathek – 5 Konsumenten: ImageManager, CinemaManager, PartnerManager, BrandStripeManager, MediaLibrary). Konvertiert nur jpg/png; svg/gif/webp/avif bleiben. Damit landen Admin-Uploads bereits als WebP im Repo, auch ohne Hook.

⚠️ Diese Lösung hatte eine Nebenwirkung, die erst 2026-07-26 auffiel: weil Admin-Uploads seither **immer** als WebP ankommen, griff der Hook (der nur jpg/png/gif kannte) bei ihnen nie mehr. Der einzige Deckel war damit `imageWebp.ts` selbst – und der rechnete nur auf die Breite. Beides ist jetzt gefixt (siehe „Kantendeckel: EINE Quelle"). Details: `kunstwolff-admin/memory/publish-workflow.md`.

Der Pre-Push-Hook (`optimize-all-images`) bleibt als zweites Netz: ein lokaler Push konvertiert nachträglich alle verbliebenen Nicht-WebP-Bilder im gesamten `public/img/`-Baum. Siehe auch `admin-tool.md`.
