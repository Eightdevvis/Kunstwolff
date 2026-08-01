# Validierungsreports

`sync:landings` schreibt nach jedem Lauf einen detaillierten Report nach:

```
reports/validation/landings/<timestamp>.json
```

## Inhalt

- `createdAt` – Zeitstempel des Laufs
- `selectedCities` + `inputCount` – die übernommene Städteliste und wie viele Rohzeilen
  sie gespeist haben
- `normalizedSummary` / `dropped` – jede Rohzeile mit ihrem normalisierten Slug und ob
  sie übernommen wurde. ⚠️ **Kein Vorher-Nachher-Vergleich:** der Report kennt den
  letzten Lauf nicht, „hinzugekommen/entfernt" steht nirgends drin
- `duplicateMerges` – zusammengeführte Slug-Kollisionen (z.B. "Berlin" + "berlin" → "berlin")
- `slideVisibility` – welche Slides auf welchen Seiten sichtbar sind
- `allImageVisibility` – alle Bilder aus `public/img/` mit Seitenzuordnung
- `unreferencedImages` – Bilder die auf keiner Seite genutzt werden (Aufräum-Hilfe)

## Retention

Es werden **maximal 7 Reports** behalten. Ältere werden automatisch gelöscht.

## Wann nutzen?

- Debugging: "Warum erscheint dieses Bild nicht auf der Stadt-Seite?" → `slideVisibility` checken
- Aufräumen: `unreferencedImages` listet ungenutzte Bilder
- Slug-Kollisionen nachvollziehen
