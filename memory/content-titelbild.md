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
- Skill-Page `/schnellzeichner/` → `Titelbild/schnellzeichner/`
- Event-Page `/firmenfeier/` → `Titelbild/events/firmenfeier/`
- Skill+Stadt `/schnellzeichner/berlin/` → ggf. Skill-Bilder mit Stadt-Override (Details im Loader)

## Metadaten: `title.meta.json`

Selbes Format wie `slides.meta.json`:

```json
{
  "berlin/titelbild.webp": {
    "categories": ["Schnellzeichner"],
    "priority": 1,
    "enabled": true
  }
}
```

- `categories` – steuert welches Bild bei Skill-Seiten verwendet wird
- `priority` – höhere Zahl = bevorzugt
- `enabled: false` – Bild ausblenden ohne zu löschen

## Fallback-Kette

1. Page-spezifischer Top-Level-Ordner (`<stadt>/`, `<skill>/`, oder `events/<slug>/`)
2. `default/`
3. System-Fallback `/img/samples/sample1.jpeg` (wenn auch `default/` leer ist)

⚠ **Bekannter Pfad-Mismatch (HEALTH_CHECK §VAL-3):** Die `fallbackImage`-Konstante in `titleImages.ts` zeigt auf `.jpeg`, aber im Verzeichnis `public/img/samples/` liegt nur `sample1.webp`. Bei einem echten Fallback-Trigger gibt es daher ein 404-Bild. Fix: entweder Konstante auf `.webp` ändern oder eine `.jpeg`-Datei anlegen.

## Artefakt-Unterordner (NICHT befüllen, NICHT löschen)

`public/img/Titelbild/landings/` und `public/img/Titelbild/skills/` sind Überbleibsel aus einer früheren Struktur. Werden ignoriert. Werden ggf. noch manuell aufgeräumt.

## Sync-Script

`sync:title-images` erstellt `public/img/Titelbild/<stadt>/` für alle Städte und initialisiert `title.meta.json` (aktuell `{}`).

## Admin-Tool

ImageManager schreibt nach `public/img/Titelbild/<stadt>/`. Aber: `title.meta.json` (Categories/Priority) wird vom Admin **nicht** verwaltet – manuell pflegen.
