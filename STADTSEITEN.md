# Stadtseiten freischalten — Stand 2026-08-09

Von 34 Städten sind **14 indexierbar** (seit heute: `bw` und `wiesbaden`), 20 stehen auf
`noindex` und fehlen in der Sitemap. Die Ausblendung vom 30.07. war richtig: `/dortmund/`
und `/giessen/` waren 1493 von 1494 Wörtern gleich, Google hätte das als Doorway-Seiten
gewertet. Aber solange es so bleibt, **treten diese Städte im Wettbewerb gar nicht an**.

> **Gabriele hat am 2026-08-06 selbst Vorspanntexte für elf Städte eingepflegt**
> (frankfurt, schweiz, kaiserslautern, trier, wiesbaden, mainz, luxembourg, koeln,
> giessen, ludwigshafen und einen `_default`). Diese Texte gelten. Ergänzte Entwürfe
> stehen nur dort, wo sie keinen geschrieben hat.

---

## ⚠️ Korrektur zur Vorversion dieses Dokuments

Die Tabelle vom 06.08. zählte Bilddateien **pro Ordner**. Das war das falsche Maß.

Seit dem Tag-System wählt die Website Bilder über `tags.landings` in
`public/img/slides/slides.meta.json` aus — **der Ordner ist nur noch Ablage und
Upload-Ziel** (`memory/index.md`, `memory/tag-system.md`). Ein Bild im Ordner `wuppertal/`
kann für Wiesbaden getaggt sein und erscheint dann dort.

Zwei Folgen:

1. **Keine versteckte Stadt liegt unter 7 getaggten Bildern.** Die Auffüll-Schwelle
   `MIN_LANDING_SLIDES = 6` (`src/utils/slideImages.ts:54`) greift damit **nirgends**.
   Die früher beschriebene Gefahr „fremde Locations unter der eigenen H1" gibt es so
   nicht — sie war ein Artefakt der Ordner-Zählung.
2. **Das echte Maß ist die Spalte „exklusiv":** Bilder, die *nur* dieser einen Stadt
   zugeordnet sind. Sie allein unterscheiden eine Stadtseite von den anderen.

---

## Die Regel, nach der freigeschaltet wird

Eine Stadt darf sichtbar werden, wenn sie **beides** mitbringt:

1. **Exklusive Bilder** — mindestens 3, die keiner anderen Stadt zugeordnet sind
2. **Eigenen Text**, der nicht auf jede andere Stadt genauso passt

Der Vorspanntext allein reicht **nicht**. Er ist 20–45 Wörter lang auf einer Seite mit
~1500 — rund 2 % eigener Anteil. Was eine Stadtseite wirklich einzigartig macht, sind
**exklusive Fotos und eigene Kundenstimmen**. Beides kann nur Gabriele liefern.

Seit es einen `_default`-Vorspann gibt, hat **jede** Stadt einen Text — aber Städte ohne
eigenen zeigen alle denselben. Für die Dopplung ändert das nichts.

---

## Stand je versteckter Stadt

Sortiert nach exklusiven Bildern — das ist die Reihenfolge, in der freigeschaltet werden
sollte.

| Stadt | getaggt | **exklusiv** | Stimmen | Vorspann | Was fehlt |
| :-- | --: | --: | --: | :-- | :-- |
| `karlsruhe` | 17 | **5** | 0 | 39 W | **nichts** – nächster Kandidat |
| `koblenz` | 13 | **4** | 0 | 43 W | Kundenstimmen |
| `rheinland-pfalz` | 11 | **4** | 9 | 32 W | **nichts** – aber Tag-Fehler klären, s.u. |
| `fulda` | 10 | **4** | 0 | — | eigener Text (siehe Sonderfall 1) |
| `wuppertal` | 12 | 3 | 0 | 33 W | Kundenstimmen |
| `duesseldorf` | 14 | 2 | 1 | — | eigener Text |
| `hanau` | 12 | 2 | 0 | — | eigener Text, Kundenstimmen |
| `main-taunus-kreis` | 8 | 2 | 0 | 44 W | 1 exklusives Bild, Kundenstimmen |
| `mannheim` | 9 | 2 | 1 | — | eigener Text, 1 exklusives Bild |
| `rhein-main-gebiet` | 17 | 2 | 1 | 37 W | 1 exklusives Bild |
| `belgique` | 12 | 1 | 0 | — | eigener Text, 2 exklusive Bilder |
| `mainz` | 15 | 1 | 2 | 28 W | 2 exklusive Bilder |
| `neunkirchen` | 12 | 1 | 0 | — | eigener Text, 2 exklusive Bilder |
| `dortmund` | 10 | 0 | 0 | — | **alles** |
| `giessen` | 10 | 0 | 1 | 14 W | **alle** exklusiven Bilder |
| `hamburg` | 12 | 0 | 0 | — | **alles** |
| `heidelberg` | 7 | 0 | 1 | — | **alles** |
| `neuwied` | 10 | 0 | 0 | — | **alles** |
| `nord-rhein-westfalen` | 9 | 0 | 0 | — | **alles** |
| `tuebingen` | 8 | 0 | 0 | — | **alles** |

### Heute freigeschaltet

| Stadt | getaggt | exklusiv | Stimmen | Vorspann |
| :-- | --: | --: | --: | :-- |
| `bw` | 19 | 4 | 1 | 42 W |
| `wiesbaden` | 16 | 3 | 5 | 21 W |

`bw` war ohne erkennbaren Grund versteckt: alle 10 Dateien in `public/img/slides/bw/`
tragen `landings: ["bw"]`, keine ist deaktiviert. Der Eintrag stammte aus der
Pauschal-Ausblendung vom 30.07. (Fürs Protokoll: `bw/1_schnellzeichner_hq.webp` ist
dieselbe Datei wie in `default/`, also ein Allgemeinbild — echte bw-Aufnahmen sind es
neun.)

---

## Woher der Ortsbezug in den ergänzten Entwürfen kommt

Jede genannte Location ist durch ein echtes Foto gedeckt — die Ortsangaben stecken in den
Dateinamen unter `public/img/slides/<stadt>/`:

- **bw** → Messe Stuttgart, Heitlinger Genusswelten (Östringen)
- **main-taunus-kreis** → Ölmühle Hattersheim, Wickerbachalm Hochheim
- **rhein-main-gebiet** → Hanau, Domäne Mechthildshausen, Aschaffenburg
- **rheinland-pfalz** → Gasthaus Leidenborn, Veitsrodt
- **karlsruhe** → Landkreis Karlsruhe, Östringen (Hochzeitsmalerei)
- **koblenz**, **wuppertal** → Anlassarten aus den Fotos, keine Ortsnamen

**Erfunden wurde nichts.** Wo Belege fehlten, steht nichts.

---

## ✅ Korrigierte Tippfehler (2026-08-09)

| Wo | war | ist jetzt |
| :-- | :-- | :-- |
| `_default` | Ihr **Evrent** | Ihr **Event** |
| `_default` | Schnellzeichner**.** Event-Illustratoren | Schnellzeichner**,** Event-Illustratoren |
| `frankfurt` | in Frankfurt. **I** | „I" gestrichen |
| `frankfurt` | **verweigen** wir Ihre Mitarbeiter | **verewigen** |
| `kaiserslautern` | Karikaturisten, **liver-painter** | **Live-Painter** |
| `kaiserslautern` | gute Darstellung**, ** (Absatzende) | gute Darstellung**.** |
| `wiesbaden` | für **Iher** Gäste | **Ihre** |
| `wiesbaden` | mit **enem** Schnellzeichner | **einem** |

## 🟡 Bewusst NICHT korrigiert

Freigegeben war nur „Tippfehler". Diese drei sind Grammatik bzw. Schreibweise und
brauchen Gabrieles Zustimmung:

| Wo | Steht da | Anmerkung |
| :-- | :-- | :-- |
| `saarland` *(indexiert)* | „mit einem **Karikaturist**" | Dativ: „Karikaturist**en**" |
| `schweiz`, `_default` | „**live-Kunst**" | im Deutschen groß: „Live-Kunst" |
| `ludwigshafen` | „**live-painting**" | im Deutschen groß: „Live-Painting" |

Dazu: `ludwigshafen` endet mit einem überzähligen Zeilenumbruch (unsichtbar, harmlos).

---

## Punkte, die eine Entscheidung brauchen

### 1. `fulda` hat 4 exklusive Bilder, aber keinen Text — mit Absicht

Die Fotos heißen `1000018053.webp`, `1000018054.webp`, `1000018273.webp`,
`1000018280.webp`. Daraus lässt sich **kein einziger Ortsbezug** belegen — unbekannt, was
darauf zu sehen ist. Ein Text ohne Substanz wäre genau die Dopplung, wegen der die Stadt
versteckt ist.

**Was hilft:** zwei Sätze von Gabriele, was auf den Bildern passiert ist (Anlass,
Location) — daraus lässt sich ein Text schreiben. Nach der korrigierten Zählung ist Fulda
sonst freischaltreif.

### 2. Ein Bild ist der falschen Region zugeordnet

`slides/rheinland-pfalz/karikaturist-schloss-auel-lohmar-rheinland-pfalz.webp` ist
ausschließlich `landings: ["rheinland-pfalz"]` getaggt. **Schloss Auel in Lohmar liegt in
Nordrhein-Westfalen.** Damit steht ein NRW-Motiv unter der Rheinland-Pfalz-Überschrift,
und `nord-rhein-westfalen` (0 exklusive Bilder) geht leer aus.

Zu ändern wäre der **Tag**, nicht der Ordner. Nur Gabriele weiß, wo die Aufnahme entstand.

### 3. Ein Bild liegt unordentlich — ohne Auswirkung

`slides/wuppertal/paar-lachend-…-veranstaltung-wiesbaden.webp` heißt Wiesbaden und liegt
unter Wuppertal. Es ist für **beide** Städte getaggt und erscheint auf beiden Seiten. Rein
kosmetisch. (Die Vorversion dieses Dokuments behauptete, das Foto „fehle der einen Stadt"
— das war falsch und eine Folge der Ordner-Zählung.)

### 4. Dürfen Kundennamen genannt werden?

In den Dateinamen stehen echte Firmen: **Novelis**, **Pro Contur**, **Toyota**,
**Bauern- und Winzerverband**. Namentlich genannte Referenzkunden sind stark — aber wen
man öffentlich als Kunden nennt, ist eine Freigabefrage. Deshalb steht **kein**
Kundenname in den Texten, nur Locations.

Wenn die Freigaben vorliegen: Bescheid geben, dann kommen sie rein.

---

## Der Weg zum Freischalten, Schritt für Schritt

1. Bilder so taggen, dass die Stadt auf mindestens 3 **exklusive** kommt
   (Admin → Bild → Orte; nicht der Ordner entscheidet, sondern der Tag)
2. Vorspanntext prüfen und ergänzen (Admin → Website-Texte)
3. Möglichst eine echte Kundenstimme aus der Region ergänzen
4. Erst dann den Pfad aus `public/config/page-visibility.json` streichen
   (im Admin: Sichtbarkeits-Schalter im Seiten-Graph)
5. Nach dem Deploy in der Google Search Console → *URL-Prüfung* →
   *Indexierung beantragen*

---

## Was bewusst versteckt bleibt

Die **102 Skill×Stadt-Seiten** (`/berlin-schnellzeichner-karikaturist/`). Nicht wegen
dünnem Text, sondern wegen Kannibalisierung: 97 % ihres Textes steht wörtlich auch auf
`/berlin/`, und beide zielen auf dieselbe Suchanfrage. Zwei eigene Seiten um dieselbe
Anfrage konkurrieren zu lassen, schwächt beide. Diese Entscheidung bleibt — auch für
`/bw-aquarelle/`, `/bw-szenenmaler/` & Co., die trotz Freischaltung von `/bw/` versteckt
bleiben.
