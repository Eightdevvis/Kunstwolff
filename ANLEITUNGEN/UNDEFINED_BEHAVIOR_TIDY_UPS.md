# Undefined Behaviour & Fallbacks (Tidy-up)

Zweck: dokumentieren, wie das Projekt bei fehlerhaften/uneindeutigen Inputs reagiert und welche Guardrails gelten sollen.

## 0) Was ist YAML?

- YAML ist ein menschenlesbares Datenformat (ähnlich wie JSON, aber mit Einrückung statt vieler Klammern).
- In diesem Projekt steckt YAML im Frontmatter von Markdown-Dateien, z. B. oben in `landings.md` zwischen `---` und `---`.
- Beispiel:

```md
---
cities:
	- berlin
	- hamburg
---
```

- Wenn dieses YAML kaputt ist (falsche Einrückung, fehlende `:`, ungeschlossene Strings), kann Parsing fehlschlagen.
- **Tidy-up (implementiert):** Bei Frontmatter-Parsing-Fehlern fällt das System jetzt auf Body-Bullets zurück, statt hart zu crashen.

## 1) `landings.md` – Eingabevarianten

### Großschreibung (`Berlin` statt `berlin`)
- **Ist-Verhalten:** wird normalisiert zu `berlin`.
- **Grund:** Die Normalisierungsfunktion setzt alles auf lowercase und bildet eine URL-taugliche Kennung.
- **Ergebnis:** funktioniert, kein Absturz.

### Sonderzeichen / Umlaute (`Köln`, `São Paulo`)
- **Ist-Verhalten:** Diakritika werden entfernt und in eine URL-taugliche Kennung überführt (`koeln` nur wenn als `koeln` geschrieben, `köln` wird aktuell zu `koln`).
- **Hinweis:** transliteration ist technisch „ASCII-normalisiert“, nicht sprachspezifisch.
- **Ergebnis:** Seite wird erstellt, aber die Kennung kann von gewünschter Schreibweise abweichen.

### Zahlen (`city-2`, `berlin2026`)
- **Ist-Verhalten:** erlaubt.
- **Ergebnis:** funktioniert.

### Leerzeichen (`new city`)
- **Ist-Verhalten:** wird zu `new-city`.
- **Ergebnis:** funktioniert.

### Präfix mit Bindestrich (`-stadtname`)
- **Ist-Verhalten:** führende Trennzeichen werden entfernt → `stadtname`.
- **Ergebnis:** funktioniert.

### Leerer Eintrag (`-` oder nur Whitespace)
- **Ist-Verhalten:** wird verworfen.
- **Ergebnis:** kein Eintrag, kein Absturz.

### Duplikat (`berlin` mehrfach / `Berlin` + `berlin`)
- **Ist-Verhalten:** dedupliziert nach Normalisierung.
- **Ergebnis:** nur 1 Landing.
- **Neues Tidy-up (implementiert):** Bei Varianten derselben Stadtkennung werden vorhandene City-Ordner automatisch zusammengeführt (Merge statt Löschen) in:
	- `public/img/slides/`
	- `public/reviews/`
	- `public/faq/`
	- `public/img/why/`
- **Kollisionen:** Dateikonflikte werden mit Suffix (`__merged_N`) aufgelöst, damit keine Datei verloren geht.

### Reservierter Name `default`
- **Ist-Verhalten:** wird in `sync-landings.mjs` explizit herausgefiltert.
- **Ergebnis:** keine Stadt-Ordner-Erzeugung für `default`.

## 2) `landings.md` kaputtes Format

### Frontmatter beschädigt (ungültiges YAML)
- **Neues Verhalten (implementiert):** Fehler wird abgefangen (`try/catch`) und als Warnung geloggt.
- **Fallback:** Body-Bullets aus `landings.md` werden weiter ausgewertet.
- **Ergebnis:** kein Hard-Fail nur wegen defektem Frontmatter.

### Falscher Typ (`cities: "berlin"` statt Liste)
- **Ist-Verhalten:** Frontmatter-Liste wird ignoriert, Body-Liste wird versucht.
- **Ergebnis:** funktioniert nur, wenn im Body gültige Bullet-Liste steht.

### Keine verwertbaren Städte gefunden
- **Ist-Verhalten:** `sync-landings` beendet sich sauber mit Hinweis (`Keine Städte ... gefunden`).
- **Ergebnis:** kein Crash, aber keine neuen Stadtordner.

## 3) Stadt-Duplikat als Ordner/Content

### Landings-Registry enthält Duplikate
- **Ist-Verhalten:** dedupliziert.

### Bereits bestehende Ordner
- **Ist-Verhalten:** `sync-landings` ist idempotent; erstellt nur fehlende Ordner/Template-Dateien.

### Stadtname kollidiert nach Normalisierung (`München`, `Munchen`)
- **Ist-Verhalten:** beide normalisieren auf dieselbe Stadtkennung und werden dedupliziert.
- **Ergebnis:** nur eine Ziel-Kennung.

### Reservierte/technische Namen (`_meta`, `default`)
- **Neues Verhalten:** `default` und `_`-präfixierte Einträge werden in Registry-Normalisierung verworfen.
- **Ergebnis:** technische/Template-Namen werden nicht als Landingseite generiert.

### Sehr lange Städtenamen
- **Ist-Verhalten:** werden nicht aktiv begrenzt.
- **Risiko:** sehr lange URLs/Dateipfade.
- **Empfehlung:** optional maximale Kennungs-Länge (z. B. 64 Zeichen) validieren.

### Nur Sonderzeichen (`!!!`, `---`, `___`)
- **Ist-Verhalten:** normalisiert zu leer und wird verworfen.
- **Ergebnis:** kein Absturz, kein Eintrag.

### Gemischte Typen in Frontmatter (`cities: [berlin, 123, true, null]`)
- **Ist-Verhalten:** nur Strings werden übernommen.
- **Ergebnis:** nicht-string Werte werden still ignoriert.

### JSON-Fallback kaputt (`landings.json` ungültig)
- **Ist-Verhalten:** Fehler wird im JSON-Parser abgefangen, Rückgabe `[]`.
- **Ergebnis:** nächster Fallback (Ordner-Merge) greift.

## 4) Slide-Dateinamen (Leerzeichen, Sonderzeichen, Unicode)

### Dateinamen mit Leerzeichen/Sonderzeichen
- **Ist-Verhalten:** URLs werden segmentweise via `encodeURIComponent` gebaut.
- **Ergebnis:** Browser erhält gültige, encodierte URL; Linux-Case-Sensitivity bleibt relevant.

### Dateinamen ohne numerischen Prefix
- **Ist-Verhalten:** `sync-slides-metadata.mjs` vergibt automatisch Prefix (`1_...`, `2_...`).

### Duplikat durch `.jpg` + `.webp` derselben Basis
- **Neues Tidy-up (implementiert):** in `slideImages.ts` wird `.webp` bevorzugt, Original wird nicht zusätzlich als eigener Slide ausgespielt.
- **Zusatz:** Metadaten werden extension-übergreifend aufgelöst (z. B. Metadaten von `.jpg` gelten auch für `.webp`).

### Groß-/Kleinschreibung in Dateinamen (`Bild.jpg` vs `bild.jpg`)
- **Ist-Verhalten:** Linux unterscheidet strikt.
- **Risiko:** lokal auf macOS/Windows scheinbar ok, live auf Linux 404.
- **Empfehlung:** Dateinamen konsistent lowercase halten.

### URL-kritische Zeichen (`#`, `?`, `%`)
- **Ist-Verhalten:** Segmente werden URL-encodiert.
- **Ergebnis:** Browser-URL bleibt korrekt; Dateisystemname muss exakt passen.

### Doppelte Punkte / ungewöhnliche Namen (`foo..bar.jpg`)
- **Ist-Verhalten:** erlaubt, solange Extension erlaubt ist.
- **Ergebnis:** wird geladen; Alt-Text kann „technisch“ wirken.

### Versteckte Dateien (`.DS_Store`, `Thumbs.db`)
- **Ist-Verhalten:** werden ignoriert, da keine erlaubte Bild-Extension.

### Defekte Bilddatei mit korrekter Extension
- **Ist-Verhalten:** Datei wird gelistet, Browser kann Ladefehler zeigen.
- **Empfehlung:** optional Integritätsprüfung im Sync ergänzen.

### Identischer Priority-Prefix in einem Ordner
- **Ist-Verhalten:** `sync-slides` sortiert sekundär stabil; Reihenfolge ist deterministisch aber evtl. nicht intuitiv.
- **Empfehlung:** eindeutige Prefix-Werte bevorzugen.

### Fehlender Prefix
- **Ist-Verhalten:** `sync-slides` vergibt Prefix automatisch.

### Prefix-Lücken (`1_`, `5_`, `9_`)
- **Ist-Verhalten:** `sync-slides` glättet auf fortlaufende Reihen.

## 5) Optimierung (`scripts/optimize-staged-images.mjs`)

### Ist-Verhalten
- erstellt für neu gestagte Slide-Bilder `.webp` (Resize bis max. Breite 1600, Qualität 75)
- staged die erzeugten `.webp` automatisch

### Relevante Beobachtung
- Wenn große JPGs zusätzlich geladen werden, bleibt Seite langsam.
- Mit WebP-Priorisierung im Slide-Loader werden im Frontend jetzt bevorzugt die kleineren Varianten genutzt.

### Praxis-Regel
1. Neue große Slides hinzufügen.
2. `npm run optimize:images` (oder pre-commit Hook) ausführen.
3. Sicherstellen, dass erzeugte `.webp` mit committed/deployed werden.

### Edge Cases beim Optimizer
- Nur **gestagte** Dateien werden optimiert; ungestagte neue Bilder bleiben groß.
- Existiert bereits eine `.webp`, wird keine neue erzeugt.
- Bei sehr kleinen Bildern kann WebP-Ersparnis gering sein.
- Bei Deployments, die untracked Dateien ignorieren, fehlen neu erzeugte Assets live.

## 6) Klare Fallback-Reihenfolge (Soll)

1. Städte aus `landings.md` (Frontmatter `cities|landings`, sonst Body-Bullets)
2. wenn leer: `landings.json`
3. wenn leer: Merge aus Ordnern (`public/landings`, `public/img/slides`, `public/reviews`)
4. alle Inputs: normalisieren, leere Einträge verwerfen, deduplizieren

## 7) Mechanik: `remove_landing` (implementiert)

Ziel: Stadt sauber „entfernen“, aber alle Daten verlustfrei archivieren.

### Aufruf

```bash
npm run remove:landing -- berlin
```

Optionales Archivziel:

```bash
npm run remove:landing -- berlin ../removed_landings
```

### Verhalten
- Normalisiert den übergebenen Namen zu einer Stadtkennung.
- Verschiebt alle passenden Landing-Artefakte in ein timestamped Archiv unter `removed_landings/<timestamp>-<kennung>/`.
- Aktualisiert `public/landings/landings.md` und `public/landings/landings.json` (entfernt die Kennung aus Listen).
- Schreibt einen Laufbericht nach `report.json` im Archivordner.

### Welche Pfade werden archiviert?
- `public/img/slides/<city-varianten>`
- `public/reviews/<city-varianten>`
- `public/faq/<city-varianten>`
- `public/img/why/<city-varianten>`
- `public/why/<city>.json` und `public/why/*-<city>.json`
- `public/landings/<city-varianten>` (falls vorhanden)

### Sicherheit
- Keine Hard-Deletes in produktiven Inhaltsordnern.
- Bei Zielkollisionen im Archiv wird eindeutig umbenannt (`__N`).

## 8) Validierungsreport (erweitert)

- Der Landings-Report enthält jetzt nicht nur `slideVisibility`, sondern auch `allImageVisibility`.
- `allImageVisibility` listet **alle Bilddateien aus `public/img`** mit:
	- Dateinamen-Normalisierung (`normalizedImageKennung`)
	- Prefix-Index (`prefixIndex`, falls vorhanden)
	- URL (`/img/...`)
	- Seitenliste (`visibleOnPages`) für die aktuelle Seiten-/Content-Kombination
- Zusätzlich enthält der Report `unreferencedImages` (alle Bilder, die aktuell auf keiner Seite verwendet werden).
- Damit sind neben Slides auch Why-Bilder, Skill-Bilder und Titelbilder in derselben Report-Logik sichtbar.

## 9) Offene Hardening-Ideen (optional als nächste Schritte)

- Validierungsreport ist implementiert (`reports/validation/landings/`) und wird automatisch auf die letzten 7 Läufe bereinigt.
- Stricter Mode ist derzeit bewusst **nicht** aktiv: Ziel ist hohe Verfügbarkeit, Teilfehler sollen isoliert bleiben.
- Transliteration map ist implementiert (`ä→ae`, `ö→oe`, `ü→ue`, `ß→ss`) in den relevanten Kennungs-Normalisierungen.
- Optional Guardrails für Kennungs-Länge/Blacklist (`api`, `admin`, etc.).
- Optional CI-Check: alle in HTML referenzierten Slide-URLs müssen existieren.
- Optional „toleranter URL-Check“ im Slide-Loader: bei fehlender Datei statt 404-Slide ein kontrollierter Fallback (nur wenn robust testbar).
