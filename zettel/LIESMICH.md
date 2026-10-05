# Bug-Zettel

Mutti (Jenny) schreibt hier über den Käfer-Knopf im Admin (ganz rechts in der
Tab-Leiste) auf, was kaputt ist. Die Datei liegt bewusst **nicht** unter
`public/`: sonst stünde die Liste öffentlich auf kunstwolff.de.

Format und Logik: `kunstwolff-admin/src/utils/zettel.ts`.

## Ablauf eines Punkts

| status     | wer setzt ihn      | Anzeige im Admin                          |
|------------|--------------------|-------------------------------------------|
| `offen`    | Mutti (neu / „Nein, noch kaputt“) | oben, normal                |
| `gefixt`   | wer repariert      | rot, „Funktioniert jetzt?“ + Ja/Nein      |
| `erledigt` | Mutti („Ja, geht!“) | unten, grau, durchgestrichen             |

## Wer einen Punkt fixt

Im **selben Commit** wie den Fix den Eintrag ändern:

- `"status": "gefixt"`
- `"gefixtAm"`: Zeitpunkt (ISO)
- `"antwort"`: ein, zwei Sätze **in Muttis Sprache**. Was jetzt anders ist,
  keine Technik.

`erledigt` setzt nur Mutti, nie wir. Punkte nicht löschen und `text` nicht
umschreiben.

Steht ein Punkt wieder auf `offen`, nachdem er schon `gefixt` war (er hat ein
`gefixtAm`), hat Mutti „Nein, noch kaputt“ geklickt. Dann noch mal genau
hinschauen.
