# Kategorie-Matching für Slide-Dateinamen

Dieses Dokument ergänzt die automatische Zuordnung von Kategorien für neue Slide-Bilder.

So funktioniert es:
- Basis-Keywords kommen automatisch aus den bestehenden Skills in `/public/skills/`.
- Pro Skill werden mindestens Skill-Name und Skill-Slug als Keywords verwendet.
- Regeln in dieser Datei sind optional und erweitern nur um zusätzliche Synonyme.
- Die automatische Zuordnung passiert beim Anlegen neuer Einträge in `slides.meta.json`.
- Bei inhaltlicher Umbenennung (anderer Dateiname/Keywords) kann neu zugeordnet werden.
- Bei reiner Prefix-/Nummern-Änderung bleibt die Zuordnung erhalten.

Format:
- Kategorie: begriff1, begriff2, begriff3

Regeln (optionale Synonyme):
- Schnellzeichner: schnelzeichner, karikatur, caricature
- Szenenmaler: speedpainting, speed-painting, eventmaler, live-sketcher, live-sketching, karikaturist, caricaturiste, schnellzeichnerin, karikaturistin, event-artist, hochzeitsmaler, wedding-painter, dessinateur, live-zeichner, event-illustration, Portrait-Artist
