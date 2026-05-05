# Validierungsreports

`sync:landings` schreibt nach jedem Lauf einen detaillierten Report nach:

```
reports/validation/landings/<timestamp>.json
```

## Inhalt

- Welche Städte hinzugekommen oder entfernt wurden
- Zusammengeführte Slug-Kollisionen (z.B. "Berlin" + "berlin" → "berlin")
- `slideVisibility` – welche Slides auf welchen Seiten sichtbar sind
- `allImageVisibility` – alle Bilder aus `public/img/` mit Seitenzuordnung
- `unreferencedImages` – Bilder die auf keiner Seite genutzt werden (Aufräum-Hilfe)

## Retention

Es werden **maximal 7 Reports** behalten. Ältere werden automatisch gelöscht.

## Wann nutzen?

- Debugging: "Warum erscheint dieses Bild nicht auf der Stadt-Seite?" → `slideVisibility` checken
- Aufräumen: `unreferencedImages` listet ungenutzte Bilder
- Slug-Kollisionen nachvollziehen
