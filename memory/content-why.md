# Why-Sektion

Die Why-Sektion zeigt 4 Benefit-Blöcke (Titel, Text, Bild) auf jeder Landing-/Skill-Seite.

## Ablage

```
public/why/default.json
public/why/<stadt>.json                 # auto von sync:why
public/why/<skill>.json                 # auto von sync:why
public/why/<skill>-<stadt>.json         # manuell für spezifischste Variante

public/img/why/<key>/benefit-{1-4}/     # Bilder, key = <stadt> ODER <skill>
```

## Auflösung in `why.ts` (Priorität absteigend)

1. `{skill}-{stadt}.json` – z.B. `schnellzeichner-berlin.json`
2. `{stadt}.json` – z.B. `berlin.json`
3. `{skill}.json` – z.B. `schnellzeichner.json`
4. `default.json` – globaler Fallback

## JSON-Format

```json
{
  "benefits": [
    {
      "title": "Echte Künstler - keine Agentur",
      "text": "Sie buchen uns direkt ...",
      "image": "/img/why/berlin/benefit-1/sample1.jpeg",
      "alt": "Live Künstler von Kunstwolff beim Zeichnen"
    }
  ]
}
```

## Felder pro Benefit

| Feld | Zweck |
| :-- | :-- |
| `title` | Überschrift des Benefit-Blocks |
| `text` | Beschreibungstext |
| `image` | Pfad zum Bild relativ zu `public/` |
| `alt` | Alt-Text des Bildes (SEO) |

## Bilder

`public/img/why/<key>/benefit-{1-4}/` – Pro Key gibt es 4 Benefit-Ordner. Einfach ein Bild in den jeweiligen Ordner legen. Der `image`-Pfad in der JSON zeigt darauf.

## Sync-Script

`sync:why` erstellt automatisch:
- `{stadt}.json` für alle Städte aus `landings.md`
- `{skill}.json` für alle Skills aus `skills.json`
- `public/img/why/<key>/benefit-{1-4}/` Ordner

Basis: `default.json`. Die generierten Stadt-/Skill-Dateien enthalten **leere Felder** (`title`/`text`/`image`/`alt`); die Website merged fehlende Felder zur Laufzeit aus `default.json` (`why.ts`). Eigene Bilder/Texte entstehen nur durch Admin-Überschreibung. Manuell anlegen muss man nur `{skill}-{stadt}.json` Kombis.

## Admin-Tool

- Der Why-Editor (`ImageManager`, `editorType: 'why'`) verwaltet **Bilder UND Texte**.
- **Bilder** landen unter `public/img/why/<city>/benefit-{1-4}/`.
- **Texte** (`title`/`text`/`alt`) schreibt `saveWhyBenefits()` als Per-Feld-Overrides nach `public/why/<city>.json` (Commit `admin: Why-Texte aktualisiert (<city>)`). Nicht-überschriebene Felder bleiben leer und werden von der Website aus `default.json` gemerged.

## Die vier Why-Detailseiten holen ihre Bilder hier ab (seit 2026-07-30)

`/branding/`, `/canvas/`, `/du-bist-kunst/`, `/stimmung-durch-kunst/` zeigen am
Seitenfuss den Abschnitt „Andere Besonderheiten von Kunstwolff". Das **sind** die
Why-Karten, nur ohne die eigene.

Ihre Bildpfade standen bis 2026-07-30 als **Kopie** in jeder der vier
`public/<slug>/content.json`. Vier Kopien von etwas, das der Admin an einer
einzigen Stelle austauscht: Mom tauschte das Bild der vierten Why-Karte, die alte
Datei wurde gelöscht – und vier Seiten zeigten kaputte Bilder. Gemerkt hat es
niemand, weil diese Seiten selten aufgerufen werden.

Jetzt liefert `src/utils/whyHighlights.ts` → `aufgeloesteHighlights()` das Bild
aus `getWhyBenefits()`, also aus derselben Quelle wie die Startseite. Zuordnung
über `WHY_DETAIL_LINKS[i]` ↔ Karte `i` (`whyDetailLinks.ts`). **Texte** bleiben,
was in der `content.json` steht – die sind dort bewusst gekürzt.

⚠️ Wer `WHY_DETAIL_LINKS` umsortiert, verschiebt damit auch die Bilder dieser
Karten. Der Test `tests/why-detail-bilder.test.ts` schlägt dann an.

Alle übrigen Bildpfade dieser vier `content.json` (Beispiele/Sektionen/Kunstformen)
laufen durch `src/utils/bildAufloesung.ts` → `aufloesenBildpfad()`: existiert die
Datei nicht mehr, nimmt der Build das Bild, das **jetzt** im selben Ordner liegt
(der Ordner ist die gepflegte Einheit, die Datei nur ihr aktueller Inhalt). Ist
auch der Ordner weg, kommt `''` zurück und die Seite lässt das `<img>` weg – ein
`src=""` wäre schlimmer, der Browser lädt damit die Seite selbst nochmal.

**Warum der Build selbst heilen muss:** `validate:images` hängt im
Pre-Commit-Hook. Mom veröffentlicht über den Admin, also ganz ohne Hook. Der
Hook fängt nur, was lokal committet wird.
