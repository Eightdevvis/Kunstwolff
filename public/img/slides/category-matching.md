# Kategorie-Matching für Slide-Dateinamen

Dieses Dokument steuert die automatische Erst-Zuordnung von Kategorien für neue Slide-Bilder.

So funktioniert es:
- Pro Zeile eine Kategorie mit Suchbegriffen.
- Wenn ein Suchbegriff im Dateinamen vorkommt, wird die Kategorie gesetzt.
- Die automatische Zuordnung passiert nur beim ersten Anlegen eines Eintrags in `slides.meta.json`.
- Danach bleibt die Kategorie im JSON fest, bis sie manuell geändert wird.

Format:
- Kategorie: begriff1, begriff2, begriff3

Regeln:
- Schnellzeichner: schnellzeichner, schnelzeichner, karikatur, caricature
- Szenenmaler: szenenmaler, speedpainting, speed-painting, eventmaler
