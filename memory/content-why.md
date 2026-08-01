# Why-Sektion

Die Why-Sektion zeigt 4 Benefit-Blöcke (Titel, Text, Bild) auf jeder Landing-/Skill-Seite.

Jede Karte ist dabei mehr als Anzeige: sie **verlinkt positionsbasiert** auf ihre
Detailseite (`WHY_DETAIL_LINKS[i]` in `whyDetailLinks.ts`). Ist die Zielseite über
`isPageHiddenByPath()` ausgeblendet, rendert `Why.astro` die Karte als `<div>` statt als
`<a>` – kein toter Link auf eine `noindex`-Seite. Überschrift und Intro der Sektion
kommen aus `getSiteTexts(locale).why`. `tests/why-detail-links.test.ts` hält Positions-
liste, titelbasierte Auflösung und die echten `default.json`-Titel zusammen.

## Ablage

```
public/why/default.json
public/why/<stadt>.json                 # auto von sync:why
public/why/<skill>.json                 # auto von sync:why
public/why/<skill>-<stadt>.json         # manuell für spezifischste Variante

public/img/why/<key>/benefit-{1-4}/     # Bilder, key = `default`, <stadt> ODER <skill>
public/i18n/<locale>/why/<key>.json     # Overlay für Fremdsprachen (aktuell nur `fr`)
```

`img/why/default/` ist die **Vorlage**: `sync:why` liest dessen Unterordner
(`getDefaultBenefitFolders()`) und legt genau diese unter jedem anderen Key an. Dort
liegen auch die vier Bilder der ausgelieferten `default.json`. Die Zahl 4 selbst ist
zusätzlich fest verdrahtet – in `why.ts` (`Array.from({ length: 4 })`), in
`sync-why.mjs` (`benefit-1`..`benefit-4`) und im Admin-`ImageManager`.

## Auflösung in `why.ts` (Priorität absteigend)

1. `{skill}-{stadt}.json` – z.B. `schnellzeichner-berlin.json`
2. `{stadt}.json` – z.B. `berlin.json`
3. `{skill}.json` – z.B. `schnellzeichner.json`
4. `default.json` – globaler Fallback
5. **`fallbackDefault` – eine fest einkompilierte Notfall-Liste** in `why.ts` mit vier
   Karten und den Bildern `/img/samples/sample1-4.webp`. Sie greift, wenn `default.json`
   fehlt, kaputt ist oder keine gültigen Benefits enthält – **und sie füllt einzelne
   Positionen**, die in `default.json` fehlen. Ihre Titel/Texte weichen bewusst von der
   gepflegten `default.json` ab; wer sie auf dem Bildschirm sieht, sieht einen Defekt.

`getWhyBenefits(skill, landing, locale)` hat einen dritten Parameter: bei
`locale !== 'de'` zeigt die Wurzel nicht auf `public/why`, sondern auf
`public/i18n/<locale>/why` (`Why.astro` reicht die Locale durch). Fehlt dort eine Datei,
läuft die Kette leer und endet bei der deutschen `default.json`.

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

⚠️ **`sync:why` erstellt nicht nur, es schreibt bestehende Dateien um.** Anders als
`sync:events` und `sync:erinnerungen`, die vorhandene Dateien nie anfassen, läuft hier
`syncExistingWhyFileImages()` über **jede** Stadt-, Skill- und die Default-Datei und
leert aktiv Felder:

- `title`/`text`/`alt`, die **wortgleich** mit `default.json` sind → `''`
- `image`, wenn der Pfad wie eine Sync-/Sample-Kopie aussieht (`/img/samples/…`,
  `/img/why/default/…`, gleicher Dateiname wie das Default-Bild, `sampleN.*`)

Das ist Absicht: nur so schlagen spätere Änderungen an `default.json` weiter durch.
Echte eigene Werte bleiben stehen. Nebenbei löscht das Script `public/why/_vorlage.json`
und legt `.gitkeep` in leere benefit-Ordner.

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
