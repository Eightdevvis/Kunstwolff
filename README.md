# Kunstwolff Website

## Kurzüberblick

- Landings werden über `public/landings/landings.md` gesteuert.
- Slides liegen in `public/img/slides/<stadt>/`.
- Slide-Metadaten (Kategorien) liegen in `public/img/slides/slides.meta.json`.
- Kategorie-Matching-Regeln für Dateinamen liegen in `public/img/slides/category-matching.md`.
- Reviews liegen in `public/reviews/<stadt>/` als Markdown.
- Skill-Bilder werden automatisch aus `public/img/UnsereFähigkeitenBilder/<Skillname>/` geladen.
- Es gibt keine Landing-JSON-Logik mehr.

## Slide-Metadaten

Slides werden weiterhin automatisch aus den Stadtordnern gelesen.
Kategorien pro Bild kommen aus `public/img/slides/slides.meta.json`.
Die Einträge werden automatisch durch `npm run sync:slides` ergänzt.

Format:

```json
{
   "<stadt>/<dateiname>": {
      "categories": ["Schnellzeichner", "Szenenmaler"],
      "altOverride": "Optionaler manueller Alt-Text",
      "priority": 10,
      "enabled": true
   }
}
```

Beispiel mit vorhandenem Bild:

```json
{
   "default/Schnellzeichner Schweiz.jpg": {
      "categories": ["Schnellzeichner", "Szenenmaler"]
   }
}
```

Hinweise:

- Key muss exakt zum relativen Pfad unter `public/img/slides/` passen.
- Ein Bild kann in mehreren Kategorien sein (`categories` als Array).
- `altOverride` ist optional; wenn gesetzt, wird dieser Text als `alt` genutzt.
- `priority` ist optional (Zahl): höhere Werte werden früher angezeigt.
- `enabled` ist optional (Boolean): `false` blendet ein Bild aus.
- Priorität wird primär aus dem Dateinamen gelesen: `<zahl>_<rest>.jpg` (z. B. `42_karikatur_event.jpg`).
- Fehlt die Zahl am Anfang, benennt `sync:slides` die Datei automatisch um und setzt den Prefix.
- Bei mehreren Dateien ohne Prefix im selben Ordner gilt eine Queue: erst ältere Datei, dann neuere; die neueste bekommt dadurch die höchste Zahl.
- Bei identischer Änderungszeit bleibt die Queue trotzdem stabil (zusätzliche Zeitfelder + Name als Tie-Breaker), damit die Reihenfolge reproduzierbar ist.
- Lücken in bestehenden Präfixen werden beim Sync automatisch geglättet, Reihenfolge bleibt gleich (z. B. `9,11,12` -> `9,10,11`).
- Kategorien werden nur beim ersten Anlegen eines neuen Eintrags automatisch aus dem Dateinamen gematcht und danach nicht überschrieben.
- Wenn ein Bild umbenannt wird, verschiebt `sync:slides` den Metadaten-Eintrag automatisch auf den neuen Dateinamen (wenn die Umbenennung eindeutig erkennbar ist: im gleichen Stadtordner genau 1 alter + 1 neuer Dateiname).
- Einträge mit leerer `categories`-Liste werden bei `sync:slides` erneut aus dem Dateinamen gematcht.
- Standard-Alt-Text wird automatisch aus dem Dateinamen erzeugt.
- In Skill-Slideshows werden nur Bilder mit passender Kategorie angezeigt.

Beispiel Priorisierung/Auswahl:

```json
{
   "default/Hochzeit_schnellzeichner_maler.jpg": {
      "categories": ["Schnellzeichner"],
      "priority": 100
   },
   "default/IMG_6657.JPG": {
      "categories": [],
      "enabled": false
   }
}
```

Dateiname-Priorität Beispiele:

```text
1_schnellzeichner_messe.jpg
25_hochzeit_livekarikatur.webp
120_szenenmaler_event.png
```

Bei Umbenennung auf einen neuen Prefix (z. B. `5_...` -> `200_...`) wird `priority` beim nächsten `npm run sync:slides` automatisch in `slides.meta.json` aktualisiert.

## Kategorie-Matching aus Dateinamen

Regeln stehen in `public/img/slides/category-matching.md` in einem einfachen Format:

```md
- Schnellzeichner: schnellzeichner, schnelzeichner, karikatur
- Szenenmaler: szenenmaler, speedpainting
```

Wenn ein Begriff im Dateinamen gefunden wird, wird die Kategorie beim ersten Sync in `slides.meta.json` gesetzt.

## Neue Stadt hinzufügen

1. In `public/landings/landings.md` unter `cities` den Stadtnamen ergänzen (Slug, z. B. `hamburg`).
2. Commit pushen (oder lokal `npm run sync:landings` ausführen).
3. Fehlende Ordner werden automatisch angelegt:
   - `public/img/slides/<stadt>/`
   - `public/reviews/<stadt>/`
4. Inhalte einfügen:
   - Slides als `.jpg/.jpeg/.png/.webp/.avif/.gif`
   - Reviews als `.md` in den Stadtordner

Ergebnis:

- Landing unter `/<stadt>/`
- Skill-Landing unter `/schnellzeichner/<stadt>/`

## Review-Format

Vorlage: `public/reviews/_vorlage.md`

```md
---
author: "Max Mustermann"
categories:
  - Schnellzeichner
  - Szenenmaler
---
Das war ein großartiges Event.
```

- `author` und Text sind Pflicht.
- `categories` steuert die Skill-Zuordnung.
- Optional: `city` (überschreibt Ordner), `rating`.

## Skills hinzufügen

1. Neuen Skill in `public/skills/skills.json` eintragen (`title`, `link`, optional `alt`).
2. `npm run sync:skills` ausführen (oder einfach `npm run dev` / `npm run build`).
3. Der Ordner `public/img/UnsereFähigkeitenBilder/<Skillname>/` wird automatisch angelegt.
4. Bilddatei in diesen Ordner legen (erste Datei alphabetisch wird verwendet).

Hinweis: `image` in `skills.json` ist nicht mehr nötig, da das Bild aus dem Skill-Ordner kommt.

## Automatisierung

- Lokal: `npm run dev` und `npm run build` führen automatisch `npm run sync:content` aus.
- `sync:content` enthält auch `npm run sync:slides` für Slide-Metadaten.
- GitHub: `.github/workflows/sync-landings.yml` läuft bei Änderungen an `public/landings/landings.md` oder `public/skills/skills.json` und committed neue Ordner zurück ins Repo.

## Git Commit Hook (automatischer Sync)

Bei jedem Commit kann automatisch `sync:content` laufen.

Einmalig im lokalen Repo aktivieren:

```bash
npm run setup:hooks
```

Danach führt der Hook in `.githooks/pre-commit` bei jedem `git commit` aus:

- `npm run sync:content`
- `git add public/img/slides public/reviews public/img/UnsereFähigkeitenBilder`

## Befehle

| Command | Zweck |
| :-- | :-- |
| `npm install` | Abhängigkeiten installieren |
| `npm run sync:landings` | Stadtordner für Slides/Reviews erzeugen |
| `npm run sync:skills` | Skill-Bildordner erzeugen |
| `npm run sync:slides` | Slide-Metadaten automatisch ergänzen |
| `npm run sync:content` | Landings + Skills zusammen synchronisieren |
| `npm run dev` | Dev-Server starten |
| `npm run build` | Produktionsbuild |
| `npm run preview` | Build lokal prüfen |
