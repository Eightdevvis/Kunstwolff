# Titelbild

## Ablage

```
public/img/Titelbild/default/             # Fallback
public/img/Titelbild/<stadt>/             # Stadt-Titelbilder
public/img/Titelbild/<skill>/             # Skill-Titelbilder (z.B. schnellzeichner/, szenenmaler/)
public/img/Titelbild/events/<slug>/       # Event-Titelbilder
public/img/Titelbild/title.meta.json      # Metadaten
```

**Bilder direkt in den Stadt-/Skill-Ordner legen, NICHT in `landings/` oder `skills/` Unterordner.** Diese sind reine Sync-Artefakte aus alter Struktur (siehe unten).

`titleImages.ts` löst den passenden Top-Level-Ordner auf – aber nur für zwei Fälle:
- Stadt-Page `/berlin/` → `Titelbild/berlin/`
- Skill-Page `/schnellzeichner-karikaturist/` → `Titelbild/schnellzeichner/`
- Skill+Stadt `/berlin-schnellzeichner-karikaturist/` → **allein `Titelbild/berlin/`**
  (+ `default/`). Der Skill-Ordner wird auf Kombiseiten **nie** gelesen: `ownSlug` ist
  der Landing-Slug, sobald einer da ist. Der Skill entscheidet nur, welches Bild aus
  diesem Pool über `categories` bevorzugt wird. Ein Bild in `Titelbild/schnellzeichner/`
  erscheint deshalb ausschließlich auf der reinen Skill-Seite.

⚠️ **Event-Seiten laufen gar nicht über `titleImages.ts`.** `/firmenfeier/` →
`Titelbild/events/firmenfeier/` löst `resolveEventTitleImage()` in `src/utils/events.ts`
auf – eine eigene, unabhängige Funktion: alphabetisch erstes Bild im Ordner, sonst
`default/`, sonst `/img/samples/sample1.webp`. Sie wertet `title.meta.json`
**komplett nicht** aus: kein `focus`, kein `frame`, kein `priority`, keine `categories`
und auch kein `enabled: false`. Wer für eine Event-Seite einen Fokuspunkt setzt, wundert
sich sonst, warum nichts passiert.

⚠️ Der Ordner heisst nach dem **Titel** (`skillContentKey`), nicht nach der URL.
Die Seiten übergeben deshalb `skillContentKey(skill.title)`, nicht den
Adress-Slug – sonst fällt die Auflösung still auf `default` zurück
(`content-skills.md`).

## Pixel-Maße: `title.dimensions.json`

Zweite JSON neben `title.meta.json`. **Vom Sync gepflegt, nicht von Hand.**
Schema:

```json
{
  "default/titelbild.avif": { "width": 1180, "height": 818 },
  "berlin/live-painter-trade-fair.webp": { "width": 1600, "height": 1201 }
}
```

Wozu: `Opener.astro` braucht das Bild-Aspect-Ratio, um auf Mobil die
Container-Höhe an das Bild anzupassen (`aspect-ratio: var(--hero-aspect)`),
statt das Bild an einen fast-vollen `dvh`-Container zu drücken und dabei
links/rechts zu croppen. Ohne die Maße bleibt der Hero beim alten Verhalten
(volle Höhe + `cover`, croppt) — der Fallback ist bewusst „lieber croppen als
zusammenklappen", damit ein fehlender Sync-Lauf keine 0-Pixel-Heroes baut.

Erzeugt wird die Datei von `scripts/sync-title-dimensions.mjs` (läuft in
`sync-content-safe` **nach** `sync:title-images`, damit die Ordner schon da
sind). Sharp liest die Maße — funktioniert für WebP UND AVIF, weshalb hier
nicht `readWebpSize` genutzt wird. Idempotent: bestehende Einträge werden
übernommen, neue kommen dazu, verwaiste raus. Wer eine Datei bytegleich
ersetzt und andere Maße meint, muss die JSON löschen oder den Eintrag
manuell entfernen.

Gelesen wird sie synchron in `titleImages.ts` (`readTitleDimensions()`,
gecached wie `readTitleMetadata`). `resolveTitleImageAspect()` liefert einen
`"w / h"`-String oder `null`; die vier Astro-Pages, die Opener direkt oder
über `landings.ts` benutzen (`index.astro`, `[landing].astro`), reichen ihn
als Prop `titleImageAspect` durch.

**Alle Hero-Komponenten sind seit M11 verkabelt.** Drei Komponenten, drei
Auflösungswege, ein Cache:

| Komponente | Genutzt in | Aspect kommt aus |
| :-- | :-- | :-- |
| `Opener.astro` | Homepage + Stadt-Landings + Skill×Stadt-Kombis | `resolveTitleImageAspect({skill?, landing?})` |
| `SkillHero.astro` | Skill-Seiten (`/schnellzeichner-karikaturist/`) + Skill×Stadt-Kombis | `resolveTitleImageAspect({skill})` bzw. `{skill, landing}` |
| `EventHero.astro` | Event-Landings (`/hochzeit/` …) + Skill×Event-Kombis | `resolveEventTitleImageAspect(slug)` in `events.ts` |

`resolveEventTitleImageAspect` läuft nicht über `titleImages.ts` (Events sind
weiterhin außerhalb dieser Auswahl), zieht aber über `lookupTitleDimensions`
denselben Sync-Cache. Wenn das Event-Bild fehlt, fällt es auf die Maße des
Default-Titelbildes zurück — analog dazu, wie `resolveEventTitleImage` beim
Fehlen aufs Default-Bild fällt. Ohne Fallback stünde ein Event-Hero mit
Src=default und Aspect=null da (Media-Query greift nicht, alter Crop-Zustand).

CSS-Var-Namen unterscheiden sich pro Komponente:

- `Opener.astro`, `EventHero.astro` → `--hero-aspect` (auf die ganze Sektion)
- `SkillHero.astro` → `--hero-media-aspect` (nur auf die `.hero-media`-Kachel,
  weil dort das `<img>` sitzt; die Hero-Höhe selbst ist inhaltsgetrieben und
  soll auf Mobil eher schrumpfen als eine Aspect-Ratio erzwingen)

## Metadaten: `title.meta.json`

Selbes Format wie `slides.meta.json`:

```json
{
  "berlin/titelbild.webp": {
    "categories": ["Schnellzeichner"],
    "priority": 1,
    "enabled": true,
    "focus": "50% 30%",
    "frame": 24
  }
}
```

- `categories` – steuert welches Bild bei Skill-Seiten verwendet wird
- `priority` – höhere Zahl = bevorzugt. **Ohne Angabe** bekommt jedes Bild seine
  Leseposition im Ordner (`index + 1`); liegen mehrere Bilder ohne gepflegte
  `priority` im selben Ordner, gewinnt deshalb die **zuletzt** gelesene Datei
- `enabled: false` – Bild ausblenden ohne zu löschen
- `focus` – CSS-`background-position` (z.B. `"50% 30%"`) = Bildausschnitt im Hero bei `cover`. Default `50% 50%`.
- `frame` – Dicke des weißen Rahmens in **px** (Default `0` = kein Rahmen). `> 0` legt einen weißen Rand dieser Dicke um das Titelbild UND schaltet den Hero von `cover` auf `contain`, sodass das ganze Bild sichtbar ist (nichts wird beschnitten). So fassen sich kleinere/anders skalierte Bilder automatisch mit weißer Matte ein. Gelesen von `resolveTitleImageFrame()` in `titleImages.ts`, gerendert in `Opener.astro` (CSS-Var `--hero-frame`/`--hero-fit`, `padding` + `background-clip: content-box`). Verdrahtet über `index.astro` (Homepage) und `landings.ts` → `[landing].astro` (Stadt-Seiten).

⚠️ **`title.meta.json` wird pro Prozess nur EINMAL gelesen** (`metadataCache` in
`titleImages.ts`) – auch ein Lese- oder Parse-Fehler wird als leeres Objekt gecacht.
Nach einer Änderung an der Datei sieht man den neuen Fokus/Rahmen erst nach einem
Neustart von Dev-Server bzw. Build. Und ein kaputtes JSON fällt still auf die Defaults
zurück, statt zu meckern.

## Fallback-Kette

Es ist **keine strikte Stufenkette**, sondern ein gemeinsamer Pool mit Kategorie-Vorrang:

1. Eigener Ordner (`<stadt>/` bzw. `<skill>/`) **und** `default/` bilden EINEN Pool –
   eigene Bilder zuerst, die aus `default/` dahinter. Auch wenn der eigene Ordner
   voll ist, hängen die Default-Bilder mit dran.
2. Gewählt wird zuerst nach passender `categories`-Angabe zum Skill. **Ein
   `default/`-Bild mit passender Kategorie schlägt damit ein eigenes Stadt-Bild ohne
   Kategorie** – das ist der Punkt, an dem die naive Lesart „eigenes gewinnt immer"
   in die Irre führt.
3. Sonst das erste Bild des Pools (nach `priority` absteigend, dann Pfad).
4. Ist der Pool leer: System-Fallback `/img/samples/sample1.webp`.

Die `fallbackImage`-Konstante in `titleImages.ts` (Zeile 7) zeigt auf `/img/samples/sample1.webp`; die Datei liegt in `public/img/samples/` vor. Kein 404 mehr (früherer §VAL-3-Mismatch behoben).

## Artefakt-Unterordner (NICHT befüllen, NICHT löschen)

`public/img/Titelbild/landings/` und `public/img/Titelbild/skills/` sind Überbleibsel aus einer früheren Struktur. Werden ignoriert. Werden ggf. noch manuell aufgeräumt.

## Sync-Script

`sync:title-images` erstellt `public/img/Titelbild/<stadt>/` für alle Städte und legt
`title.meta.json` mit `{}` an, **falls sie noch nicht existiert**. Eine vorhandene Datei
bleibt unangetastet – aktuell stehen dort 6 gepflegte Einträge mit `frame`/`focus`
(default, belgique, dortmund, schnellzeichner-duesseldorf, fulda, mannheim).

## Admin-Tool

ImageManager schreibt nach `public/img/Titelbild/<stadt>/`. Der Admin verwaltet in `title.meta.json` inzwischen den **Fokuspunkt** (Klick-Picker) und die **weiße Rahmendicke** (Schieber, `frame`, 0–120 px) je Titelbild – Vorschau spiegelt cover/contain + Rahmen. `categories`/`priority` weiterhin manuell pflegen.
