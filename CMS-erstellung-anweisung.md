# Admin-Tool Referenz – Kunstwolff

> Dieses Dokument war ursprünglich die Bauanleitung für das Admin-Tool.
> Das Tool ist fertig gebaut. Diese Datei zeigt jetzt wo der aktuelle Stand dokumentiert ist.

---

## Aktueller Stand

Das Admin-Tool liegt unter: `/home/sasha/codicus/Kunstwolff-admin/kunstwolff-admin/`

**Relevante Dateien:**
- `README.md` – vollständige Dokumentation: Architektur, alle Pfade, Dateiformate, Funktionen, Einschränkungen
- `CLAUDE.md` – Claude-spezifische Kurzübersicht + Workflow für Cross-Repo-Features

---

## Für neue Features die beide Repos betreffen

Workflow wenn neue Admin-Felder + Website-Konsumierung gleichzeitig gebaut werden:

1. **Dateiformat festlegen** – Pfad in `public/`, JSON/MD-Format, Fallback-Logik
2. **Website-Seite zuerst** – Utils in `src/utils/` erweitern, Website konsumiert das neue Format
3. **Admin-Seite danach** – neuen Tab/Manager im Admin-Tool bauen der in dieses Format schreibt
4. **Sync-Scripts prüfen** – muss `sync-landings.mjs` o.ä. angepasst werden?
5. **Beide READMEs aktualisieren** – Admin-README + dieses CLAUDE.md

---

## Was das Admin-Tool aktuell schreibt

| Pfad im Website-Repo | Admin-Komponente |
|---|---|
| `public/img/slides/{city}/` + `slides.meta.json` | ImageManager (slides) |
| `public/img/Titelbild/{city}/` | ImageManager (titelbild) |
| `public/img/why/{city}/benefit-{1-4}/` | ImageManager (why) |
| `public/reviews/{city}/review*.md` | ReviewManager |
| `public/faq/default/` + `public/faq/{city}/` | FaqManager |
| `public/landings/landings.md` | CityManager |
| `public/calendar/{jahr}/{monat}.json` | CalendarView |

## Was das Admin-Tool aktuell NICHT kann (muss manuell per Git gepflegt werden)

- `public/why/{city}.json` – Texte der Why-Sektion (Titel, Text, Alt)
- `public/img/Titelbild/title.meta.json` – Categories/Priority für Titelbilder
- `public/skills/skills.json` – Skills-Liste
- Bilder werden nicht zu WebP konvertiert (Pre-Push-Hook greift nur bei lokalem git push)
