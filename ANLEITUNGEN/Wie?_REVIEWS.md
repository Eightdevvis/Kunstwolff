

REVIEWS PFLEGEN – VON „ICH WILL …“ ZU „DANN SO EINTRAGEN“

Du willst eine Kundenstimme auf der Website einfügen?
Suche hier einfach den passenden Satz:

ICH WILL, DASS ...

1) ... eine Review auf allen Seiten als allgemeine Standard-Review genutzt wird.
-> Dann in: /public/reviews/_vorlage.md
Direkt in die Vorlage reinschreiben! Danach wird eine neue generiert für mehr neue Reviews.

2) ... eine Review nur auf einer bestimmten Landingpage (z. B. Berlin) erscheint.
-> Dann in: /public/reviews/[landing-kurzname]/
-> Beispiel Berlin: /public/reviews/berlin/
-> Beispiel Schweiz: /public/reviews/schweiz/
Direkt in die Vorlage reinschreiben! Danach wird eine neue generiert für mehr neue Reviews.

3) ... ich für eine Landing mehrere Reviews anlegen kann.
-> Dann in: /public/reviews/[landing-kurzname]/
-> Einfach mehrere Dateien anlegen, z. B. review-1.md, review-2.md, review-3.md

4) ... eine neue Landing eigene Reviews bekommen kann.
-> Zuerst Landing in /public/landings/landings.md eintragen. Mehr dazu in Wie?_LANDINGPAGES Anleitung
-> Danach einmal committen + pushen (damit der Landing-Ordner automatisch erzeugt wird).
-> Dann Reviews in /public/reviews/[landing-kurzname]/ anlegen.


-------------------------------------------------------

SO IST EINE REVIEW-DATEI AUFGEBAUT

Am einfachsten:
- Die _vorlage.md im gewünschten Stadtordner öffnen (z. B. /public/reviews/berlin/_vorlage.md)
- Review direkt dort reinschreiben
- Bei mehreren Reviews: _vorlage.md kopieren und z. B. review-1.md, review-2.md anlegen oder nach jeder Review pushen damit eine neue Vorlage generiert wird.
- Text, Name, Ort/Firma anpassen

Falls im Stadtordner keine _vorlage.md vorhanden ist:
- Einfach committen – die Vorlage wird automatisch beim Commit erzeugt und hinzugefügt.
- Danach wie gewohnt pushen.

Wichtig:
- Immer das bestehende Format der Vorlage beibehalten.
- Nur die Inhalte austauschen (nicht die Struktur kaputtmachen).


-------------------------------------------------------

KURZE REGELN (BITTE EINHALTEN)

- Pro Landing saubere Dateinamen nutzen (z. B. review-1.md, review-2.md).
- Keine Leerzeichen/Sonderzeichen in Dateinamen.
- Echte Kundenzitate verwenden, einheitliche Schreibweise bei Namen/Orten.
- Lieber kurz und konkret als zu lang.


-------------------------------------------------------

WENN DU UNSICHER BIST

Lieber kurz nachfragen.
Der Ordner entscheidet direkt, auf welcher Landingpage die Reviews erscheinen.


-------------------------------------------------------

WICHTIG: AUTOMATISCHER SYNC

Beim Committen läuft automatisch ein Sync, der:
- Fehlende _vorlage.md-Dateien neu erzeugt
- Stadt-Ordner für neue Landings anlegt
- Slide-Bilder automatisch nummeriert

Du musst nichts manuell starten – einfach committen + pushen reicht!
