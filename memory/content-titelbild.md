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

`titleImages.ts` löst bei jeder Page den passenden Top-Level-Ordner auf:
- Stadt-Page `/berlin/` → `Titelbild/berlin/`
- Skill-Page `/schnellzeichner-karikaturist/` → `Titelbild/schnellzeichner/`
- Event-Page `/firmenfeier/` → `Titelbild/events/firmenfeier/`
- Skill+Stadt `/berlin-schnellzeichner-karikaturist/` → ggf. Skill-Bilder mit Stadt-Override (Details im Loader)

⚠️ Der Ordner heisst nach dem **Titel** (`skillContentKey`), nicht nach der URL.
Die Seiten übergeben deshalb `skillContentKey(skill.title)`, nicht den
Adress-Slug – sonst fällt die Auflösung still auf `default` zurück
(`content-skills.md`).

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
- `priority` – höhere Zahl = bevorzugt
- `enabled: false` – Bild ausblenden ohne zu löschen
- `focus` – CSS-`background-position` (z.B. `"50% 30%"`) = Bildausschnitt im Hero bei `cover`. Default `50% 50%`.
- `frame` – Dicke des weißen Rahmens in **px** (Default `0` = kein Rahmen). `> 0` legt einen weißen Rand dieser Dicke um das Titelbild UND schaltet den Hero von `cover` auf `contain`, sodass das ganze Bild sichtbar ist (nichts wird beschnitten). So fassen sich kleinere/anders skalierte Bilder automatisch mit weißer Matte ein. Gelesen von `resolveTitleImageFrame()` in `titleImages.ts`, gerendert in `Opener.astro` (CSS-Var `--hero-frame`/`--hero-fit`, `padding` + `background-clip: content-box`). Verdrahtet über `index.astro` (Homepage) und `landings.ts` → `[landing].astro` (Stadt-Seiten).

## Fallback-Kette

1. Page-spezifischer Top-Level-Ordner (`<stadt>/`, `<skill>/`, oder `events/<slug>/`)
2. `default/`
3. System-Fallback `/img/samples/sample1.webp` (wenn auch `default/` leer ist)

Die `fallbackImage`-Konstante in `titleImages.ts` (Zeile 7) zeigt auf `/img/samples/sample1.webp`; die Datei liegt in `public/img/samples/` vor. Kein 404 mehr (früherer §VAL-3-Mismatch behoben).

## Artefakt-Unterordner (NICHT befüllen, NICHT löschen)

`public/img/Titelbild/landings/` und `public/img/Titelbild/skills/` sind Überbleibsel aus einer früheren Struktur. Werden ignoriert. Werden ggf. noch manuell aufgeräumt.

## Sync-Script

`sync:title-images` erstellt `public/img/Titelbild/<stadt>/` für alle Städte und initialisiert `title.meta.json` (aktuell `{}`).

## Admin-Tool

ImageManager schreibt nach `public/img/Titelbild/<stadt>/`. Der Admin verwaltet in `title.meta.json` inzwischen den **Fokuspunkt** (Klick-Picker) und die **weiße Rahmendicke** (Schieber, `frame`, 0–120 px) je Titelbild – Vorschau spiegelt cover/contain + Rahmen. `categories`/`priority` weiterhin manuell pflegen.
