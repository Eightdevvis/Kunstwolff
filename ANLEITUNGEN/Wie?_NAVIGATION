DIESE ANLEITUNG GILT FÜR DIE HEADER-NAVIGATION

-------------------------------------------------------

NAVIGATION PFLEGEN (OHNE CODE-ÄNDERUNG)

Die Navigation wird aus dieser Datei gelesen:
-> /public/navigation/navigation.json

Du kannst sichtbare Nav-Elemente dort direkt hinzufügen, löschen oder umsortieren.


STRUKTUR

Die JSON-Datei hat ein Feld `items` mit einer Liste von Einträgen.

1) Einfacher Menüpunkt (ein Link)
{
  "label": "Services",
  "url": "#skills"
}

2) Ausklappbarer Menüpunkt (wie Home)
{
  "label": "Home",
  "children": [
    { "label": "Kunstwolff", "url": "/" },
    { "label": "Schnellzeichner", "url": "/schnellzeichner/" }
  ]
}

Wichtig:
- `label` = sichtbarer Text im Menü
- `url` = Ziel-URL
- `children` = Unterpunkte für Dropdown/Karte


KOMPLETTES BEISPIEL

{
  "items": [
    {
      "label": "Home",
      "children": [
        { "label": "Kunstwolff", "url": "/" },
        { "label": "Schnellzeichner", "url": "/schnellzeichner/" }
      ]
    },
    { "label": "Services", "url": "#skills" },
    { "label": "Work", "url": "#work" },
    { "label": "Contact", "url": "#contact" }
  ]
}


REGELN

- Jeder sichtbare Eintrag braucht ein `label`.
- Link-Einträge brauchen `url`.
- Dropdown-Einträge brauchen `children` mit mindestens 1 gültigem Unterpunkt.
- Unterpunkte im Dropdown sind immer Link-Einträge mit `label` + `url`.
- Trennstriche `|` zwischen Menüpunkten werden automatisch gesetzt.


DESIGN / KARTEN

- Die Dropdown-Karte nutzt exakt dieselben Einstellungen wie bisher.
- Klassen und Verhalten wurden nicht verändert, nur der Inhalt ist jetzt konfigurierbar.


FALLBACK (SICHERHEIT)

Wenn `navigation.json` fehlt oder kaputtes JSON enthält:
- Es wird automatisch auf die Standard-Navigation zurückgefallen.
- Die Seite bleibt nutzbar.


TYPISCHE FEHLER

1) Komma vergessen
- JSON ist dann ungültig.

2) `url` fehlt bei Link-Eintrag
- Eintrag wird ignoriert.

3) `children` leer oder fehlerhaft
- Dropdown-Eintrag wird ignoriert.


KURZER CHECK NACH ÄNDERUNG

1. Datei speichern
2. `npm run dev` oder `npm run build`
3. Im Header prüfen:
   - Menüpunkt sichtbar?
   - Klick führt auf richtige URL?
   - Dropdown klappt auf und Unterpunkte funktionieren?
