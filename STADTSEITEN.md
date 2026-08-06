# Stadtseiten freischalten — Stand 2026-08-06

Von 34 Städten sind **12 indexierbar**, 22 stehen auf `noindex` und fehlen in der
Sitemap. Das war am 30.07. richtig entschieden: `/dortmund/` und `/giessen/`
waren 1493 von 1494 Wörtern gleich, Google hätte das als Doorway-Seiten
gewertet. Aber solange es so bleibt, **treten diese Städte im Wettbewerb gar
nicht an**.

Dieses Dokument sagt pro Stadt, was noch fehlt.

## Die Regel, nach der freigeschaltet wird

Eine Stadt darf sichtbar werden, wenn sie **beides** mitbringt:

1. **Eigene Fotos** (mindestens 6, sonst füllt `supplementWithDefaultSlides` mit
   fremden Orten auf — dann stehen fremde Locations unter der eigenen H1)
2. **Eigenen Text**, der nicht auf jede andere Stadt genauso passt

Der Vorspanntext allein reicht **nicht**. Er ist rund 40 Wörter lang auf einer
Seite mit ~1500 — das sind knapp 3 % eigener Anteil. Was eine Stadtseite
wirklich einzigartig macht, sind ihre **eigenen Fotos und eigenen
Kundenstimmen**. Beides kann nur Gabriele liefern.

## Stand je Stadt (erste Welle)

Vorspanntexte sind als Entwurf eingetragen und über den Admin änderbar
(Website-Texte → Stadt-Vorspann). Sie sind **noch nicht geprüft**.

| Stadt | Eigene Fotos | Kundenstimmen | FAQ | Vorspann | Was fehlt zum Freischalten |
| :-- | --: | --: | --: | :-- | :-- |
| `bw` (Baden-Württemberg) | 10 | 1 | 4 | ✅ neu | **Fast fertig** — siehe Sonderfall unten |
| `wiesbaden` | 5 | 5 | 3 | ✅ neu | 1 Foto |
| `koblenz` | 4 | 0 | 3 | ✅ neu | 2 Fotos, Kundenstimmen |
| `main-taunus-kreis` | 4 | 0 | 0 | ✅ ergänzt | 2 Fotos, Kundenstimmen |
| `wuppertal` | 4 | 0 | 2 | ✅ neu | 2 Fotos (eines ist falsch abgelegt, s.u.) |
| `karlsruhe` | 3 | 0 | 4 | ✅ neu | 3 Fotos, Kundenstimmen |
| `rhein-main-gebiet` | 3 | 1 | 2 | ✅ neu | 3 Fotos |
| `rheinland-pfalz` | 3 | 9 | 3 | ✅ neu | 3 Fotos |
| `fulda` | 4 | 0 | 0 | ❌ **keiner** | siehe unten |

**Zweite Welle** (1–2 eigene Fotos): `belgique`, `duesseldorf`, `hanau`,
`mainz`, `mannheim`, `neunkirchen`.

**Ohne ein einziges eigenes Foto** — bleiben versteckt, bis Bilder da sind:
`dortmund`, `giessen`, `hamburg`, `heidelberg`, `neuwied`,
`nord-rhein-westfalen`, `tuebingen`.

## Woher der Ortsbezug in den Texten kommt

Jede genannte Location ist durch ein echtes Foto gedeckt — die Ortsangaben
stecken in den Dateinamen unter `public/img/slides/<stadt>/`:

- **bw** → Messe Stuttgart, Heitlinger Genusswelten (Östringen)
- **wiesbaden** → Domäne Mechthildshausen
- **main-taunus-kreis** → Ölmühle Hattersheim, Wickerbachalm Hochheim
- **rhein-main-gebiet** → Hanau, Domäne Mechthildshausen, Aschaffenburg
- **rheinland-pfalz** → Gasthaus Leidenborn, Veitsrodt
- **karlsruhe** → Landkreis Karlsruhe, Östringen (Hochzeitsmalerei)
- **koblenz**, **wuppertal** → Anlassarten aus den Fotos, keine Ortsnamen

**Erfunden wurde nichts.** Wo mir Belege fehlten, steht nichts.

## Vier Punkte, die eine Entscheidung brauchen

### 1. `fulda` hat keinen Text bekommen — und das mit Absicht

Die vier Fotos heißen `1000018053.webp`, `1000018054.webp`, `1000018273.webp`,
`1000018280.webp`. Daraus lässt sich **kein einziger Ortsbezug** belegen — ich
weiß nicht, was darauf zu sehen ist. Ein Text ohne Substanz wäre genau die
Dopplung, wegen der die Stadt versteckt ist.

**Was hilft:** Gabriele sagt in zwei Sätzen, was auf den Bildern passiert ist
(Anlass, Location) — dann schreibe ich den Text.

Dazu kommt: `title.meta.json` verweist für Fulda auf `fulda/1000018047.webp`,
und **diese Datei existiert nicht**. Die Seite fällt aufs Standard-Titelbild
zurück. (Das ist auch der Grund, warum `tests/bild-adressen.test.ts` rot ist —
schon vor diesen Änderungen.)

### 2. `bw` erfüllt die Freischalt-Regel bereits — warum ist es versteckt?

Baden-Württemberg hat **10 eigene Fotos** und hatte schon vorher einen eigenen
Vorspann. Nach der dokumentierten Regel (≥ 6 eigene Fotos **oder** eigener
Intro) müsste es sichtbar sein. Ich habe es **nicht** eigenmächtig
freigeschaltet — möglicherweise sind nicht alle 10 Bilder über
`slides.meta.json` aktiv, oder es gab einen anderen Grund.

**Zu klären, bevor jemand die Zeile aus `page-visibility.json` streicht.**

### 3. Zwei Fotos liegen im falschen Ordner

- `public/img/slides/wuppertal/paar-lachend-…-veranstaltung-**wiesbaden**.webp`
  liegt unter Wuppertal, heißt aber Wiesbaden.
- `public/img/slides/rheinland-pfalz/karikaturist-schloss-auel-**lohmar**-rheinland-pfalz.webp`
  — Schloss Auel in Lohmar liegt nach meiner Kenntnis in Nordrhein-Westfalen,
  nicht in Rheinland-Pfalz. Bitte prüfen.

Beides zählt doppelt: das Foto fehlt der einen Stadt und verfälscht die andere.

### 4. Dürfen Kundennamen genannt werden?

In den Dateinamen stehen echte Firmen: **Novelis**, **Pro Contur**, **Toyota**,
**Bauern- und Winzerverband**. Namentlich genannte Referenzkunden sind stark —
aber wen man öffentlich als Kunden nennt, ist eine Freigabefrage. Ich habe
deshalb **keinen** Kundennamen in die Texte geschrieben, nur Locations.

Wenn die Freigaben vorliegen: sagen, dann kommen sie rein.

## Der Weg zum Freischalten, Schritt für Schritt

1. Fotos ergänzen, bis die Stadt auf 6 eigene kommt
2. Vorspanntext prüfen und korrigieren (Admin → Website-Texte)
3. Möglichst eine echte Kundenstimme aus der Region ergänzen
4. Erst dann den Pfad aus `public/config/page-visibility.json` streichen
   (im Admin: Sichtbarkeits-Schalter im Seiten-Graph)
5. Nach dem Deploy in der Google Search Console → *URL-Prüfung* →
   *Indexierung beantragen*

## Was bewusst versteckt bleibt

Die **102 Skill×Stadt-Seiten** (`/berlin-schnellzeichner-karikaturist/`). Nicht
wegen dünnem Text, sondern wegen Kannibalisierung: 97 % ihres Textes steht
wörtlich auch auf `/berlin/`, und beide zielen auf dieselbe Suchanfrage. Zwei
eigene Seiten um dieselbe Anfrage konkurrieren zu lassen, schwächt beide. Diese
Entscheidung bleibt.
