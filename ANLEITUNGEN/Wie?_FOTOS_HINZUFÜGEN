DIESE ANLEITUNG LIEGT AUCH IN /public/img/Anleitung<3

-------------------------------------------------------

BILDER EINSORTIEREN – VON „ICH WILL …“ ZU „DANN SO SORTIEREN“

Du willst ein Bild auf der Website einfügen?
Suche hier einfach den passenden Satz:

ICH WILL, DASS ...

1) ... das kleine Hauptlogo oben in der Navigation zu sehen ist.
-> Dann in: /public/img/logo/
-> Für Logos bitte .svg verwenden.

2) ... ein Kunden-/Markenlogo im laufenden Referenz-Streifen erscheint.
-> Dann in: /public/img/referenzenLogos/
-> Möglichst klare, gut lesbare Logo-Dateien.

3) ... ein Bild in der Slideshow auf der Startseite erscheint.
-> Dann in: /public/img/slides/default/

4) ... ein Bild auf einer bestimmten Stadt-Landingpage in der Slideshow erscheint (z. B. Hamburg).
-> Dann in: /public/img/slides/[stadtname]/
-> Beispiel Hamburg: /public/img/slides/hamburg/

5) ... ein Bild auf einer bestimmten Skill-Page in der Slideshow erscheint.
-> Dann in: /public/img/slides/default/ oder /public/img/slides/[stadtname]/
-> Wichtig: Skill-Keyword in den Dateinamen schreiben, z. B. 210_hamburg_schnellzeichner_live.webp
(nur dann wird es einsortiert!)

6) ... ein großes Aufmacher-/Titelbild genutzt wird.
-> Titelbilder liegen jetzt strukturiert unter /public/img/Titelbild/

  A) Default-Titelbilder (global):
  -> /public/img/Titelbild/default/

  B) Landing-spezifische Titelbilder:
  -> /public/img/Titelbild/[stadt-kennung]/
  -> Beispiel: /public/img/Titelbild/berlin/

  C) Kategorisierung wie bei Slides:
  -> Metadaten in /public/img/Titelbild/title.meta.json
  -> Felder: categories, priority, enabled
  -> Beispiel:
    {
      "default/1_hero.webp": {
       "categories": ["Schnellzeichner"],
       "priority": 10,
       "enabled": true
      }
    }

  Reihenfolge der Auflösung:
  -> Landing-Ordner + Fallback default (wie Slides)
  -> Bei Skill-Seiten wird nach categories gefiltert (wie Slides)
  -> Ohne Treffer: höchste Priorität aus Pool

7) ... ein Bild im Skills-Bereich auftaucht.
-> Dann in: /public/img/UnsereFähigkeitenBilder/[skillname]/
-> Beispiel: /public/img/UnsereFähigkeitenBilder/Schnellzeichner/
-> Für neue Skills einfach neuen Unterordner mit Skill-Namen anlegen.

8) ... ein allgemeines Beispielbild / Arbeitsprobe abgelegt wird.
-> Dann in: /public/img/samples/


WICHTIG BEI SLIDES (NUMMERN + KEYWORDS)

Für Bilder in /public/img/slides/... gilt zusätzlich:

1) Priorität über Nummern-Prefix
- Dateiname mit Prefix = Reihenfolge, z. B. 120_event.webp
- Höhere Zahl = höhere Priorität (wird früher angezeigt).
- Wenn kein Prefix da ist, vergibt das Sync-System automatisch einen.
- Lücken bei Nummern werden automatisch geglättet.

2) Automatische Skill-Zuordnung über Keywords im Dateinamen
- Keywords werden automatisch aus den bestehenden Skills gezogen (Skill-Name + Skill-Kurzname aus /public/skills/).
- Beim ersten Einlesen werden Kategorien aus dem Dateinamen erkannt.
- Zusätzliche Synonyme kannst du in /public/img/slides/category-matching.md ergänzen.
- Wichtig: Bei inhaltlicher Umbenennung (anderer Dateiname mit anderen Keywords) wird neu zugeordnet.
- Bei reiner Prefix-/Nummern-Änderung bleibt die bestehende Zuordnung erhalten.


SYNC-HINWEIS TITELBILD-ORDNER

- `npm run sync:title-images` legt fehlende Titelbild-Ordner automatisch an (`default` + alle Landings) und erstellt bei Bedarf `title.meta.json`.
- Der Schritt läuft auch in `sync:content` und `sync:content:safe`.


KURZE REGELN (BITTE EINHALTEN)

- Bevorzugt .webp oder .avif nutzen (schneller).
- .jpg/.png nur wenn nötig.
- Dateinamen sauber halten: kleinbuchstaben, keine leerzeichen, keine sonderzeichen.
  Beispiel: hamburg_event_01.webp


WENN DU UNSICHER BIST

Lieber kurz nachfragen.
Der Ordner entscheidet direkt, wo das Bild auf der Website landet.

