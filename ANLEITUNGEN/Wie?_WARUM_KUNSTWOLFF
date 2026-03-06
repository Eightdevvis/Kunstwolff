-------------------------------------------------------

WARUM KUNSTWOLFF – VORTEILE PFLEGEN

Du willst die "Warum Kunstwolff"-Benefits auf der Website anpassen?
Suche hier einfach den passenden Satz:

ICH WILL, DASS ...

1) ... die Standard-Benefits für alle Seiten gelten.
-> Dann in: /public/why/default.json
-> Diese Datei wird überall genutzt, wenn keine spezifische Datei vorhanden ist.
-> Bilder dazu liegen in: /public/img/why/default/

2) ... Benefits nur für eine bestimmte Fähigkeit (z. B. Schnellzeichner) erscheinen.
-> Dann in: /public/why/[skill-kurzname].json
-> Beispiel Schnellzeichner: /public/why/schnellzeichner.json
-> Beispiel Szenenmaler: /public/why/szenenmaler.json
-> Bilder dazu liegen in: /public/img/why/[skill-kurzname]/
-> Diese Datei + Bildordner werden automatisch erzeugt, falls sie fehlen.

3) ... Benefits nur für eine bestimmte Stadt/Landing (z. B. Berlin) erscheinen.
-> Dann in: /public/why/[landing-kurzname].json
-> Beispiel Berlin: /public/why/berlin.json
-> Beispiel Schweiz: /public/why/schweiz.json
-> Bilder dazu liegen in: /public/img/why/[landing-kurzname]/
-> Diese Datei + Bildordner werden beim Commit automatisch erzeugt, falls sie fehlen.

4) ... Benefits nur für eine Kombination (z. B. Schnellzeichner in Berlin) erscheinen.
-> Dann in: /public/why/[skill]-[landing].json
-> Beispiel: /public/why/schnellzeichner-berlin.json
-> Beispiel: /public/why/szenenmaler-schweiz.json


-------------------------------------------------------

SO IST EINE WHY-DATEI AUFGEBAUT

Am einfachsten:
- die passende Datei öffnen (z.B. /public/why/berlin.json)
- Texte, Bilder und Alt-Texte anpassen

Bild-Workflow:
- Pro Ziel gibt es in /public/img/why/[ziel]/ genau 4 Unterordner (aus default kopiert)
- In jedem Unterordner liegt das Bild für eine Benefit-Karte
- Du kannst dort das Bild einfach austauschen (Datei ersetzen)
- Die JSON-Datei enthält den Bildpfad und kann bei Bedarf angepasst werden

Wichtig:
- Immer 4 Benefits (Vorteile) eintragen
- JSON-Struktur beibehalten (Kommas, Klammern, Anführungszeichen)
- Bildpfade müssen mit /img/ beginnen (z. B. /img/why/berlin/benefit-1/sample1.jpeg)
- Alt-Texte für Barrierefreiheit nicht vergessen


-------------------------------------------------------

PRIORITÄT DER DATEIEN

Wenn mehrere Dateien existieren, wird in dieser Reihenfolge geladen:

1. [skill]-[landing].json (z. B. schnellzeichner-berlin.json)
2. [landing].json (z. B. berlin.json)
3. [skill].json (z. B. schnellzeichner.json)
4. default.json (Standard-Fallback)

Die erste gefundene Datei wird verwendet.


-------------------------------------------------------

KURZE REGELN (BITTE EINHALTEN)

- Dateinamen nur kleinbuchstaben, keine Leerzeichen/Sonderzeichen.
- Immer 4 Benefits pro Datei (nicht mehr, nicht weniger).
- JSON-Syntax prüfen (z. B. über jsonlint.com bei Unsicherheit).
- Bilder sollten optimiert sein (WebP bevorzugt, siehe Wie?_FOTOS_HINZUFÜGEN).


-------------------------------------------------------

WICHTIG: AUTOMATISCHER SYNC

Beim Committen wird automatisch geprüft und die Struktur validiert.
Einfach Datei anpassen → Committen → Pushen.

Zusätzlich werden automatisch erzeugt (falls fehlend):
- /public/why/[landing-kurzname].json
- /public/why/[skill-kurzname].json
- /public/img/why/[landing-kurzname]/ (mit 4 Benefit-Unterordnern aus default)
- /public/img/why/[skill-kurzname]/ (mit 4 Benefit-Unterordnern aus default)


-------------------------------------------------------

WENN DU UNSICHER BIST

Lieber kurz nachfragen.
Die Dateinamen entscheiden direkt, auf welcher Seite die Benefits erscheinen.
