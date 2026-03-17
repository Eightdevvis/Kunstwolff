# Dokumentations-Abgleich: README vs. tatsächliche Projektstruktur

**Erstellt:** 2026-03-17
**Scope:** Vollständiger Abgleich zwischen `README.md`, `CLAUDE.md`, `ANLEITUNGEN/` und dem realen Projektbestand
**Methode:** Jede Datei einzeln geprüft, jeder Sync-Script inhaltlich analysiert

---

## Übersicht

| Kategorie | Befund |
|:--|:--|
| Lücken im README (kritisch) | 3 |
| Lücken im README (mittel) | 6 |
| Lücken im README (klein) | 4 |
| Ungenauigkeiten / falsche Angaben | 4 |
| Redundanzen / veraltete Dokumente | 2 |
| Gut dokumentierte Bereiche | 11 |

---

## 1. Lücken – Was existiert, aber fehlt im README

### 1.1 KRITISCH

---

#### Admin-Tool Schnittstelle – komplett absent im README

**Was existiert:** Das Projekt hat eine direkte Schnittstelle zu einem separaten Admin-Tool (`/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/`). Dieses Tool schreibt via GitHub REST API direkt in dieses Repo, hauptsächlich nach `public/`. Betroffen sind:
- `public/img/slides/*/slides.meta.json` (Kategorien, Priorität)
- `public/reviews/<stadt>/` (neue Review-Dateien)
- `public/faq/<stadt>/` (neue FAQ-Dateien)
- `public/calendar/<jahr>/<monat>.json` (Kalender-Daten)

**Was im README fehlt:** Kein Wort. Weder Erwähnung des Admin-Tools, noch die Implikationen für Pfadänderungen, noch welche `public/`-Bereiche dadurch "extern gemanagt" werden.

**Risiko:** Jeder der die `public/`-Struktur ändert, ohne diesen Kontext zu kennen, kann das Admin-Tool unbemerkt brechen.

**Empfehlung:** Mindestens einen Abschnitt "Admin-Tool Schnittstelle" im README ergänzen – mit Hinweis auf die relevanten Pfade und den Grundsatz "Pfadänderungen in public/ müssen mit Admin-Tool abgeglichen werden".

---

#### `remove:landing` Workflow – nur Befehlszeile, kein Kontext

**Was existiert:** `scripts/remove-landing.mjs` (398 Zeilen) ist ein vollständiges Archivierungs-Script. Es archiviert alle Landing-Artefakte einer Stadt in `removed_landings/<timestamp>-<kennung>/`, entfernt die Stadt aus `landings.md`, schreibt einen `report.json` ins Archiv. Die Archivierungs-Pfade umfassen:
- `public/img/slides/<stadt-varianten>`
- `public/reviews/<stadt-varianten>`
- `public/faq/<stadt-varianten>`
- `public/img/why/<stadt-varianten>`
- `public/why/<stadt>.json` und `public/why/*-<stadt>.json`

**Was im README steht:** Nur ein einzelner Zeileneintrag in der Befehle-Tabelle: `npm run remove:landing -- <stadt> [archivpfad]`. Keine Erklärung was "archiviert" bedeutet, wo das Archiv landet, was danach noch manuell zu tun ist, was _nicht_ archiviert wird.

**Empfehlung:** Eigener Abschnitt "Stadt entfernen" (analog zu Abschnitt 4 "Neue Stadt hinzufügen"), mit vollständiger Beschreibung des Verhaltens inkl. was archiviert wird, was nicht, und wo das Archiv zu finden ist.

---

#### Validierungsreports – komplett undokumentiert im README

**Was existiert:** `sync-landings.mjs` schreibt nach jedem Lauf einen detaillierten JSON-Report nach `reports/validation/landings/<timestamp>.json`. Dieser enthält:
- Dropped cities (aus der Liste gefallene Städte)
- Merged directories (zusammengeführte Slug-Kollisionen)
- `slideVisibility` (welche Slides auf welchen Seiten sichtbar sind)
- `allImageVisibility` (ALLE Bilder aus `public/img/` mit Seiten-Zuordnung)
- `unreferencedImages` (Bilder die auf keiner Seite genutzt werden)

**Was im README steht:** Gar nichts. Der Report-Ordner existiert, Dateien liegen drin, und sind ein wichtiges Diagnose-Tool – aber kein Nutzer erfährt davon.

**Empfehlung:** Im Automatisierungs-Abschnitt (6) einen Unter-Absatz "Validierungsreports" ergänzen. Mindestens: wo sie liegen, was sie enthalten, wie man sie nutzt um ungenutzte Bilder zu finden.

---

### 1.2 MITTEL

---

#### Navigation-System undokumentiert

**Was existiert:** `public/navigation/navigation.json` steuert die Website-Navigation. `src/utils/navigation.ts` liest diese Datei. Das Format unterstützt sowohl einfache Links als auch Dropdown-Menüs:

```json
[
  { "label": "Start", "url": "/" },
  { "label": "Skills", "children": [{ "label": "Schnellzeichner", "url": "/schnellzeichner/" }] }
]
```

**Was im README steht:** Nichts über das Format. Die `ANLEITUNGEN/Wie?_NAVIGATION.md` existiert zwar, ist aber im README nur als Link aufgeführt – das Format selbst ist nirgends im README erklärt.

**Empfehlung:** Kurzen Abschnitt "3.X Navigation pflegen" mit dem JSON-Format ergänzen, analog zu den anderen Content-Abschnitten.

---

#### Brand-Logos undokumentiert

**Was existiert:** `public/img/referenzenLogos/` enthält Logos für die Referenz-Sektion (`BrandStripe.astro`). `src/utils/brandLogos.ts` liest alle Bilder aus diesem Verzeichnis und generiert automatisch Labels aus den Dateinamen (Unterstrich → Leerzeichen).

**Was im README steht:** Gar nichts. Weder der Ordner, noch wie Labels funktionieren, noch welche Bildformate akzeptiert werden.

**Empfehlung:** Mini-Abschnitt "Referenzlogos pflegen" mit Pfad, Dateinamen-Konvention (Unterstrich = Leerzeichen im Label) und Formathinweis.

---

#### `content.config.ts` undokumentiert

**Was existiert:** `src/content.config.ts` – Astro Content Collections Konfiguration. Wurde vom Projekt-Scan registriert aber inhaltlich nicht aufgerufen.

**Was im README steht:** Nichts. Da Astro Content Collections ein zentrales Framework-Feature sind, sollte zumindest erwähnt werden ob und wie sie genutzt werden (oder explizit dass sie aktuell leer/nicht aktiv sind).

**Empfehlung:** Kurzen Hinweis in Abschnitt 2 (Aktuelle Funktionsweise): "Content Collections werden aktuell nicht verwendet – Content kommt direkt aus `public/` via Utils."

---

#### Slideshow Lightbox-Feature undokumentiert

**Was existiert:** `Slideshow.astro` enthält eine vollständig selbst implementierte Lightbox mit:
- Click-to-zoom (2.5×)
- Mouse-Drag-Pan (nur im gezoomten Zustand)
- Touch-Pinch-Zoom (1–4×)
- Swipe-Navigation (wenn zoom = 1)
- Keyboard-Navigation (Esc, Pfeiltasten)

**Was im README steht:** Nur "Slides" als Konzept. Kein Wort über Lightbox, Zoom, Touch-Gesten.

**Empfehlung:** Kurze Notiz in Abschnitt 3.2 oder einem neuen Abschnitt "Slideshow-Verhalten": was die Lightbox kann, damit Content-Entscheidungen (z.B. Bildqualität, Bildformate) im Kontext dieser Funktion getroffen werden können.

---

#### `public/img/samples/` Fallback undokumentiert

**Was existiert:** `public/img/samples/` enthält Fallback-Bilder (z.B. `sample1.jpeg`). Diese werden als letzter Fallback in `titleImages.ts` verwendet, wenn weder stadtspezifische noch default-Titelbilder gefunden werden.

**Was im README steht:** Nichts. Der Ordner ist ein stiller Teil des Fallback-Systems.

**Empfehlung:** Zumindest in Abschnitt 3.8 (Titelbild) erwähnen: "Wenn auch `default/` leer ist, greift ein System-Fallback auf `/img/samples/sample1.jpeg` zurück."

---

#### `MIN_LANDING_SLIDES = 6` Schwellwert undokumentiert

**Was existiert:** In `slideImages.ts` gibt es eine Konstante `MIN_LANDING_SLIDES = 6`. Wenn eine Stadt weniger als 6 stadtspezifische Slides hat, werden automatisch Default-Slides aufgefüllt bis 6 Slides erreicht sind.

**Was im README steht:** "Slides kommen aus Stadtordnern + Fallback aus `default`." – korrekt, aber der konkrete Schwellwert fehlt.

**Empfehlung:** Im Abschnitt 3.2 ergänzen: "Wenn eine Stadt weniger als 6 eigene Slides hat, werden automatisch Slides aus `default/` ergänzt bis mindestens 6 Slides angezeigt werden."

---

### 1.3 KLEIN

---

#### `public/fonts/` undokumentiert

Ordner `public/fonts/mayonice/` enthält den Custom-Font der Website. Nicht erwähnt.
**Empfehlung:** Notiz in Abschnitt 2 oder Abschnitt 3 für Font-Änderungen.

---

#### `.vscode/settings.json` undokumentiert

Enthält projektspezifische VS Code Konfiguration. Nicht erwähnt.
**Empfehlung:** Kurzer Hinweis im Schnellstart (Abschnitt 1): "VS Code Nutzer: projektspezifische Settings liegen in `.vscode/settings.json`."

---

#### `SEO-Planung.md` nicht verlinkt

Das Dokument `SEO-Planung.md` (480 Zeilen, vollständige SEO-Strategie) liegt im Root, ist aber weder im README verlinkt noch im Inhaltsverzeichnis erwähnt. Es deckt sich inhaltlich stark mit README Abschnitt 8 (SEO-Technische Grundlagen).
**Empfehlung:** Entweder im README verlinken ("strategische Hintergründe in `SEO-Planung.md`"), oder explizit als "veraltet/archiviert" markieren.

---

#### Git Hook Details undokumentiert

Das README erwähnt `.githooks/pre-commit` und `.githooks/pre-push` nur in einer Tabelle. Was die Hooks konkret tun (Skript-Inhalt, Fehlerverhalten, was passiert wenn der Hook schlägt) ist nicht dokumentiert.
**Empfehlung:** Kurze Bullet-Liste der tatsächlichen Hook-Schritte ergänzen.

---

## 2. Ungenauigkeiten – Was im README falsch oder irreführend ist

### 2.1 `sync:title-images` – Befehle-Tabelle falsch

**README Befehle-Tabelle (Abschnitt 7):**
> `sync:title-images` → "Titelbild-Ordner für default, Landings, **Skills und Skill+Landing-Kombis** anlegen"

**Tatsächliches Verhalten** (`sync-title-images.mjs`, 141 Zeilen):
Das Script erstellt:
- `public/img/Titelbild/default/` ✓
- `public/img/Titelbild/<stadt>/` für jede Stadt in `landings.md` ✓
- `public/img/Titelbild/title.meta.json` (falls fehlend) ✓

**Skill-Ordner und Skill+Stadt-Ordner werden NICHT erstellt.** Das ist eine fehlerhafte Beschreibung in der Tabelle.

**Empfehlung:** Tabellenzeile korrigieren: "Titelbild-Ordner für default und alle Landingpage-Städte anlegen; `title.meta.json` initialisieren"

---

### 2.2 `robots.txt` Sitemap-URL – Inkonsistenz

**`SEO-Planung.md` Abschnitt 11:**
> `Sitemap: https://kunstwolff.de/sitemap.xml`

**README Abschnitt 8 (Sitemap):**
> "Ausgabe: `dist/sitemap-index.xml` und `dist/sitemap-0.xml`"
> "erreichbar unter: `https://kunstwolff.de/sitemap-index.xml`"

Beide Dokumente widersprechen sich. Die tatsächliche generierte Sitemap durch `@astrojs/sitemap` heißt `sitemap-index.xml`. Das README ist korrekt, SEO-Planung.md ist veraltet.

**Empfehlung:** In `SEO-Planung.md` korrigieren, oder das Dokument als "historisch/veraltet" markieren.

---

### 2.3 Pre-Commit Hook – "Content-Sync" zweifelhaft

**README Abschnitt 6 (Git-Hooks-Tabelle):**
> `pre-commit` → "Gestagete Slides optimieren, Content-Sync"

Der "Content-Sync" Teil ist unklar. Ein vollständiger `sync:content` vor jedem Commit (inkl. sync-slides-metadata.mjs das Prefix-Umbenennung und git-add-relevante Dateien ändert) wäre ungewöhnlich und potenziell problematisch. Tatsächlich macht der pre-commit Hook wahrscheinlich nur die Bildoptimierung (via `optimize-staged-images.mjs`).

**Empfehlung:** Hook-Inhalt verifizieren und README entsprechend korrigieren. Falls "Content-Sync" tatsächlich dort läuft: erklären warum, und welche Nebenwirkungen das hat (veränderte Dateien die nicht gestaged waren können unbeabsichtigt eingeschlossen werden).

---

### 2.4 Review-Mindestanzahl nicht explizit dokumentiert

**Was existiert:** `reviews.ts` hat eine implizite Ziel-Mindestanzahl von 7 Reviews pro Seite. Das Fallback-System greift solange bis mindestens 7 Reviews vorhanden sind (erst eigene Stadt, dann default, dann andere Städte alphabetisch).

**README Abschnitt 2:**
> "Reviews kommen zuerst aus der Stadt, dann aus `default`, dann aus anderen Städten (bis Mindestanzahl erreicht ist)."

Die "Mindestanzahl" wird nie als konkrete Zahl (7) genannt. Das ist kein schwerwiegender Fehler, aber für Content-Entscheidungen relevant ("wieviele Reviews brauche ich damit eigene überhaupt angezeigt werden?").

**Empfehlung:** In Abschnitt 3.5 ergänzen: "Das System zielt auf mindestens 7 Reviews pro Seite – weniger eigene Reviews werden mit Fallbacks aufgefüllt."

---

## 3. Redundanzen und veraltete Dokumente

### 3.1 `SEO-Planung.md` vs. README Abschnitt 8

`SEO-Planung.md` (480 Zeilen) ist ein früh geschriebenes Strategiedokument. Es deckt sich inhaltlich stark mit README Abschnitt 8, enthält aber veraltete Information (falsche Sitemap-URL, Relaunch-Ablauf der längst abgeschlossen ist, Netlify-Stage-URL als Entwicklungsziel).

README Abschnitt 8 ist deutlich aktueller und detaillierter. `SEO-Planung.md` hat keinen klaren Mehrwert mehr als eigenständiges Dokument.

**Empfehlung:** Datei entweder löschen und Link aus README entfernen (es gibt keinen Link), oder explizit als `SEO-Planung-ARCHIV.md` umbenennen.

---

### 3.2 `ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md` vs. README Abschnitt 2/6

`UNDEFINED_BEHAVIOR_TIDY_UPS.md` dokumentiert Edge Cases und Fallback-Verhalten des Systems sehr detailliert. Teile davon überlappen mit README Abschnitt 2 und Abschnitt 6 (z.B. Slug-Normalisierung, Duplikat-Handling, Fallback-Reihenfolge). Die Datei ist wertvoll als Referenz für technische Edge Cases, aber nicht im README verlinkt.

**Empfehlung:** Im README einen Verweis ergänzen: "Edge Cases und Sonderfälle: `ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md`"

---

## 4. Was gut dokumentiert ist

Zur Vollständigkeit: Folgende Bereiche sind im README korrekt und ausreichend detailliert dokumentiert:

1. **Schnellstart** (npm install + npm run dev) ✓
2. **Städte-System** (landings.md Format, Normalisierung, Fallback-Quellen) ✓
3. **Slides-System** (Ordnerstruktur, erlaubte Formate, Priority-Prefix) ✓
4. **Slide-Metadaten** (slides.meta.json Format, alle Felder erklärt) ✓
5. **Kategorie-Matching** (category-matching.md Format, automatische Basis) ✓
6. **Reviews** (Markdown-Format, Pflicht/Optional-Felder, Fallback-Logik) ✓
7. **Skills** (skills.json Format, automatische Seitengenerierung) ✓
8. **Why-Sektion** (Prioritätslogik der key-Auflösung, JSON-Format, Automatik) ✓
9. **Titelbild** (Ordnerstruktur, title.meta.json Format, Fallback) ✓
10. **FAQs** (Markdown-Format, Filterung, Pflicht/Optional) ✓
11. **GitHub Action** (`sync-landings.yml` Trigger + Verhalten) ✓
12. **Bildoptimierung** (WebP-Konvertierung, Pre-Push-Hook) ✓
13. **SEO Schema.org** (Seitentyp → Schema-Typ Tabelle) ✓
14. **Meta-Tags / Canonical / OG** (vollständige Erklärung) ✓
15. **Neue Stadt hinzufügen** (vollständiger 5-Schritte-Workflow) ✓

---

## 5. Handlungsempfehlungen (priorisiert)

### Priorität 1 – Sofort

| # | Was | Warum |
|:--|:--|:--|
| 1 | Admin-Tool Abschnitt ins README | Kritisches Wissen fehlt; Pfadänderungen ohne diesen Kontext können das Admin-Tool brechen |
| 2 | `sync:title-images` Tabelleneintrag korrigieren | Aktiv falsche Information in README |
| 3 | `robots.txt` Sitemap-URL in SEO-Planung.md korrigieren (oder Datei archivieren) | Widersprüchliche URLs in zwei Dokumenten |

### Priorität 2 – Bald

| # | Was | Warum |
|:--|:--|:--|
| 4 | `remove:landing` Workflow-Abschnitt ergänzen | Nur Befehlszeile ohne Kontext ist unzureichend für ein Script das Daten verschiebt |
| 5 | Validierungsreports dokumentieren | Wertvolles Diagnose-Tool das niemand kennt |
| 6 | Navigation-System (navigation.json) dokumentieren | Komplett fehlend für einen Content-Pflegeprozess |
| 7 | `UNDEFINED_BEHAVIOR_TIDY_UPS.md` im README verlinken | Wertvolle Referenz die nicht auffindbar ist |
| 8 | Pre-Commit Hook Inhalt verifizieren und korrigieren | "Content-Sync" klingt problematisch, sollte klar beschrieben sein |

### Priorität 3 – Optional / Bei Gelegenheit

| # | Was | Warum |
|:--|:--|:--|
| 9 | MIN_LANDING_SLIDES = 6 dokumentieren | Hilft bei Content-Entscheidungen |
| 10 | Review-Mindestanzahl (7) dokumentieren | Hilft bei Content-Entscheidungen |
| 11 | Brand-Logos Abschnitt | Kleines, fehlendes Feature |
| 12 | `samples/` Fallback erwähnen | Vollständiges Bild des Fallback-Systems |
| 13 | SEO-Planung.md archivieren/löschen | Redundanz reduzieren |
| 14 | Lightbox-Feature in Slideshow erwähnen | Hintergrundinformation für Bild-Auswahl |
| 15 | `content.config.ts` Hinweis | Kleine Transparenz-Lücke für Framework-Nutzer |

---

## Anhang: Dateien im Projekt nicht im README erwähnt

| Datei/Ordner | Status |
|:--|:--|
| `src/content.config.ts` | Fehlt |
| `src/utils/navigation.ts` | Fehlt |
| `src/utils/brandLogos.ts` | Fehlt |
| `public/navigation/navigation.json` (Format) | Fehlt |
| `public/img/referenzenLogos/` | Fehlt |
| `public/img/samples/` | Fehlt |
| `public/fonts/` | Fehlt |
| `public/calendar/` | Bewusst ausgelassen (nur Admin-Tool) – OK |
| `SEO-Planung.md` | Nicht verlinkt |
| `reports/validation/` | Fehlt |
| `.vscode/settings.json` | Fehlt |
| `.githooks/` (Details) | Fehlt |
| `ANLEITUNGEN/UNDEFINED_BEHAVIOR_TIDY_UPS.md` | Nicht verlinkt im README |
| Slideshow Lightbox (Feature von `Slideshow.astro`) | Fehlt |
