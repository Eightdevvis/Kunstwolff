# FAQs

## Ablage

```
public/faq/default/*.md     # allgemeine FAQs – gelten überall (kein Ort-Tag)
public/faq/<stadt>/*.md      # stadtspezifische FAQs
```

**Der Ordner entscheidet seit 2026-07-28 nichts mehr.** Er liefert beim Anlegen den
Start-Tag (`scripts/sync-faq-tags.mjs`), danach ist er reine Ablage – die Auswahl läuft
über die Tags (siehe unten). `getFAQsByCity` / `getFAQsByCategories` / `getFAQsByCategory`
wurden dabei **entfernt**; wer sie sucht, will `getFAQsForContext`.

Vorhandene Stadt-Ordner: `belgique`, `bw`, `duesseldorf`, `frankfurt`, `heidelberg`, `kaiserslautern`, `karlsruhe`, `koblenz`, `koeln`, `ludwigshafen`, `luxembourg`, `mainz`, `mannheim`, `rhein-main-gebiet`, `rheinland-pfalz`, `saarbruecken`, `saarland`, `schweiz`, `trier`, `wiesbaden`, `wuppertal` (21 Städte + `default`; Stand 2026-08-01: 86 Dateien, davon 26 in `default/` – die Zahl wächst mit jeder neuen FAQ, nachzählen mit `find public/faq -name '*.md' | wc -l`). Weitere Stadt-FAQs: einfach den Ordner `public/faq/<stadt>/` anlegen und MD-Files reinschreiben – **kein Sync-Skript legt sie an**.

## Format

```md
---
question: "Wie buche ich einen Schnellzeichner?"
answer: "Sie können uns direkt über das Kontaktformular anfragen..."
categories:
  - Schnellzeichner
  - Szenenmaler
---
```

## Frontmatter-Felder

| Feld | Pflicht | Zweck |
| :-- | :-- | :-- |
| `question` | ja | Die Frage |
| `answer` | ja | Die Antwort |
| `categories` | nein | Array von Skills, für die diese FAQ relevant ist |
| `city` | nein | Überschreibt den Ordnernamen (Stadt-Zuordnung) |
| `tags` | **faktisch ja** | Objekt mit Arrays `events` / `skills` / `landings` – **die** Zuordnung, siehe Auswahl-Logik. Fehlt der Block, ergänzt ihn `scripts/sync-faq-tags.mjs` beim nächsten Build aus Ordner + `categories` |

## Auswahl-Logik (seit 2026-07-28 tag-basiert)

**Eine** Funktion entscheidet: `getFAQsForContext(context, locale)` in `src/utils/faq.ts`.
`FAQ.astro` ruft nur noch die auf – die frühere Vierfach-Verzweigung mit Ordner-Gate
und Fallback-Treppe ist weg.

Geprüft werden drei Dimensionen **einzeln und mit UND** verknüpft:

| Dimension | FAQ-Feld | Regel |
| :-- | :-- | :-- |
| Skill | `tags.skills` + `categories` | leer ⇒ gilt für jeden Skill |
| Anlass | `tags.events` | leer ⇒ gilt für jeden Anlass |
| Ort | `tags.landings` | leer ⇒ gilt für jeden Ort |

Innerhalb einer Dimension heißt **leer = gilt überall**. Das ersetzt den `default/`-Ordner:
„allgemein" ist jetzt eine Eigenschaft des Inhalts, nicht seines Ablageorts.

Sortierung: FAQs, die den Kontext ausdrücklich nennen, stehen vor den allgemeinen.
Sonst entschiede die Lesereihenfolge der Dateien, was in die ersten `maxItems` (Default 4)
rutscht – und die Stadtseite zeigte ausgerechnet ihre eigenen Fragen nicht.

### Warum das vorher nicht ging

`matchesFAQContext` verknüpfte die Teilprüfungen mit **ODER**. Eine FAQ mit passendem
Skill erschien damit auf *jeder* Stadtseite. Deshalb musste `FAQ.astro` vorher über
`getFAQsByCity` nach dem **Ordner** vorfiltern – und deshalb war der Tag-Teil faktisch
wirkungslos. Am 2026-07-28 gemessen: von 71 FAQ-Dateien trug **keine einzige** einen
Ort-Tag. `matchesFAQContext` las Tags, die es nicht gab.

Gemessene Wirkung der Umstellung (dist gegen die Live-Seite verglichen, alle Stadtseiten):
**keine FAQ verschwunden**, und die Seiten füllen sich auf die vorgesehenen 4 Fragen
statt auf 1–2 – die alte Fallback-Treppe griff nie, weil das Ordner-Gate eine
nicht-leere, aber kurze Liste zurückgab.

### Tags kommen per Sync

`scripts/sync-faq-tags.mjs` ergänzt fehlende Tag-Blöcke: Ort aus dem Ordner,
Skills aus `categories`, `default/` bleibt absichtlich ohne Ort-Tag. Vorhandene
`tags:`-Blöcke werden **nie** angefasst. Anlässe rät das Script bewusst **nicht** aus
dem Text (anders als bei Reviews) – ein geratener Anlass würde eine allgemeine Frage
still zu einer Anlass-Frage machen. Anlässe vergibt Jenny im Admin über die Tag-Chips.

Der Schritt läuft in `sync:content:safe`, also bei jedem `dev`/`build` – **nach**
`sync:tags`, weil ein Ort ohne Vokabular-Eintrag verworfen wird.

⚠️ **Bekannte Grenze 1:** `FaqManager.tsx` schreibt den `tags:`-Block nur, wenn mindestens
ein Tag gesetzt ist (gleiche Haltung wie `ReviewManager`). Löscht jemand im Admin *alle*
Tags einer Stadt-FAQ, um sie allgemein zu machen, ergänzt der Sync beim nächsten Build
den Ordner-Tag wieder. „Bewusst allgemein" ist derzeit nicht ausdrückbar.

### Der halbe Tag-Block (Loch gestopft 2026-08-01)

Bis dahin prüfte `sync-faq-tags.mjs` nur, **ob** ein `tags:`-Block da ist
(`/^tags\s*:/m`), nicht welche Dimensionen darin stehen. Schrieb der Admin einen
**teilweisen** Block – nur `skills`, ohne `landings` –, war die Ergänzung damit dauerhaft
abgeschaltet: der Ordner-Tag kam nie nach, und weil „Dimension fehlt = gilt überall"
gilt, wanderte eine Stadt-FAQ still auf **alle** Seiten.

Aufgefallen an `public/faq/bw/wie-kann-ich-einen-event-karikaturisten-buchen.md`
(Commit `d582233`) – der Test „jede FAQ ausserhalb von `default/` trägt den Ort-Tag ihres
Ordners" in `tests/content-tags.test.ts` wurde rot und hat den Fall damit sichtbar
gemacht, statt ihn monatelang laufen zu lassen.

**Jetzt gilt die Regel je Dimension, nicht je Block:**

- Eine Dimension, die im Block **steht**, bleibt unangetastet – auch `landings: []`.
  Das ist eine Entscheidung („gilt überall"), keine Lücke; sonst könnte niemand eine
  Stadt-FAQ je allgemein machen.
- Eine Dimension, die **gar nicht** dasteht, wird aus Ordner bzw. `categories` ergänzt.
- Die Flow-Form (`tags: { … }`, `tags: []`) wird bewusst nicht angefasst: sie lässt sich
  nicht zeilenweise ergänzen, ohne die Datei umzuformatieren – und genau das vermeidet
  das textuelle Einfügen ja.

Die Logik liegt in `scripts/tags.mjs` (`findeTagsBlock`, `ergaenzeFehlendeDimensionen`),
weil `sync-reviews-tags.mjs` dasselbe Loch hatte. Festgehalten in
`tests/tag-dimensionen.test.ts` und `tests/tags.test.ts`.

## Schema.org

FAQs werden als `FAQPage` JSON-LD ausgegeben – aber **nur auf der Archivseite
`/faq/`**: `FAQ.astro` rendert den Block ausschließlich bei `interactive={true}`,
und das setzt allein `src/pages/faq.astro`. Die eingebetteten FAQ-Blöcke auf Stadt-,
Skill- und Anlass-Seiten liefern kein JSON-LD (Hintergrund in `seo.md`). Kann zu
aufklappbaren FAQ-Blöcken direkt in den Google-Suchergebnissen führen.

## Admin-Tool

FaqManager schreibt nach `public/faq/default/` und `public/faq/<city>/`.

## EINE Regel für alle drei Dimensionen (seit 2026-07-31)

Nach `skills`, `events`, `landings` wird überall gleich ausgewählt – und zwar genau so,
wie es die Bilder (`supplementWithDefaultSlides`) und die Reviews
(`landings.length === 0`) schon machten:

1. **Ein Tag gilt dort, wo danach gefragt wird.** Trägt eine FAQ Tags in einer Dimension,
   die der Kontext nicht abfragt, gehört sie nicht hierher. Eine Messe-FAQ hat auf
   `/berlin/` nichts zu suchen, eine Köln-FAQ nicht auf `/trier/`.
2. **Keine Tags in einer Dimension = keine Einschränkung.** Wer in allen drei Dimensionen
   ungetaggt ist, bildet den **Default-Topf**.
3. **Defaults füllen auf**, wo die spezifischen nicht reichen (`maxItems = 4`).

Vorher galt „leer gilt überall" auch in die andere Richtung: fragte ein Kontext eine
Dimension nicht ab, passte **jede** FAQ. Dadurch stand nach dem Anlegen der Anlass-FAQs
plötzlich „Wie viel Platz brauchen Sie auf dem Messestand?" auf `/berlin/`. Der erste
Versuch, das über einen Punktabzug in der Rangfolge zu heilen, war ein Sonderweg und ist
wieder raus.

⚠️ **Die Umstellung deckte auf, dass die Daten übertaggt waren.** `sync-faq-tags.mjs`
hatte fast jeder FAQ einen `skills`-Tag verpasst; unter der sauberen Regel hieß das
„gehört nur auf Skill-Seiten", und Startseite wie Stadtseiten fielen auf **eine** FAQ
zurück. Deshalb wurden die automatisch vergebenen Skill-Tags aus den 14 Standard- und 57
Stadt-FAQs entfernt (`categories` gleich mit). Ein Skill-Tag setzt jetzt nur noch, wer
eine FAQ wirklich nur für einen Skill haben will. `sync-faq-tags.mjs` fasst vorhandene
`tags:`-Blöcke nie an, es kommt also nichts zurück.

Gemessen nach dem Bauen: Startseite/Stadt-/Skill-Seiten 4 Defaults, Köln 2 eigene + 2
Defaults, jede Anlass-Seite 3 eigene + 1 Default.

⚠️ **`/faq/` ist das Archiv, kein Kontext.** Ein leerer Kontext fragt keine Dimension ab
und liefert deshalb nur den Default-Topf. `src/pages/faq.astro` reicht darum ausdrücklich
`getAllFAQs()` als `faqs`-Prop durch – sonst verliert die Übersichtsseite 72 der
86 Fragen (Stand 2026-08-01: 14 FAQs ohne jeden Tag bilden den Default-Topf).

## Anlass-Dimension: eigenes Feld statt Schmuggel durchs city-Feld (seit 2026-07-31)

`FAQFilterContext` hat jetzt `event`. Vorher entstanden `eventKeys` **ausschliesslich**
daraus, dass `city` mit `events/` begann – ein Weg, den kein einziger Aufrufer benutzte:
die Event-Zweige übergaben `faq: {}` bzw. nur den Skill. Folge: auf `/firmenfeier/`,
`/messe/`, `/hochzeit/` und `/private-feier/` passten alle 71 FAQs mit Treffergüte 0, es
entschied die Lesereihenfolge der Dateien, und alle vier zeigten dieselben Fragen wie die
Startseite. Ein im Admin gesetzter Anlass-Tag konnte nie ankommen.

Geändert: `src/utils/faq.ts` (`event` im Kontext), `src/components/FAQ.astro` (nimmt es an
und reicht es weiter), die Event-Zweige in `src/pages/[landing].astro` und
`src/pages/[...kombi].astro`. Der alte Weg `city: 'events/<slug>'` funktioniert im Code
weiter, **wird aber von keiner Datei genutzt** – es gibt keinen Ordner `public/faq/events/`.

Beim Umbau am 2026-07-31 änderte sich auf dem Bildschirm erst einmal nichts, weil damals
alle FAQs `events: []` trugen und „leer gilt überall". Inzwischen tragen **14 der 85
FAQ-Dateien** einen Anlass-Tag (die 12 `anlass--*` in `default/` plus die beiden
`rhein-main-gebiet`-FAQs) – der Anlass-Weg ist also aktiv, nicht mehr bloß vorbereitet.

Test: `tests/faq-anlass.test.ts`, inklusive der Gegenprobe, dass eine Firmenfeier-FAQ auf
`/messe/` NICHT erscheint.

## Anlass-FAQs (seit 2026-07-31)

`public/faq/default/anlass--<anlass>--<thema>.md` – 12 Stück, drei je Anlass, getaggt
über `tags.events` (z.B. `anlass--messe--platzbedarf.md`). Sie liegen bewusst in
`default/`, also **ohne Ort-Tag**; die Auswahl läuft ausschließlich über den Anlass-Tag.
Einen Ordner `public/faq/events/` gibt es nicht.

Gemessen nach dem Bauen: jede der vier Anlass-Seiten zeigt **drei eigene Fragen plus eine
allgemeine**; Startseite und Stadtseiten bleiben unverändert. Das liegt an
`trefferGenauigkeit` – wer den Anlass ausdrücklich trägt, steht vor der allgemeinen FAQ,
und `maxItems = 4` schneidet den Rest ab.

⚠️ Eine Anlass-FAQ ist **nicht** von anderen Seiten ausgeschlossen: fragt ein Kontext die
Anlass-Dimension gar nicht ab (Startseite, Stadtseiten), passt jede FAQ. Praktisch fällt
das nicht auf, weil dort orts- bzw. skillgetaggte FAQs höher ranken. Wer das ändern will,
ändert die Semantik von `dimensionPasst` – und trifft damit auch Skills und Orte.

Inhaltlich gegründet auf die vorhandenen Angaben (3–5 Minuten pro Gast, drei Stühle,
Staffelei wird mitgebracht, digital oder Papier). **Keine erfundenen Preise oder Zeiten** –
wo eine Zahl steht, stammt sie aus einer bestehenden FAQ.


## i18n: Overlays brauchen denselben Sync (2026-07-31)

`sync-faq-tags.mjs` läuft seit 2026-07-31 über **alle** FAQ-Wurzeln:
`public/faq` **und** jedes `public/i18n/<locale>/faq`. Der Ort-Slug entsteht
relativ zur jeweiligen Wurzel.

Vorher lief es nur über die deutsche Wurzel. Die drei französischen FAQs unter
`public/i18n/fr/faq/belgique/` hatten deshalb nie einen `tags`-Block, trugen
weiter nur `categories:` — und `faq.ts:167` mischt `categories` in die
Skill-Dimension, die die FR-Seite gar nicht abfragt. Also fielen alle drei
durch, `getFAQsForContext` lieferte `[]`, und `FAQ.astro` schob den
hartkodierten **deutschen** `DEFAULT_FAQS`-Block nach. Auf einer französischen
Seite. Monatelang unbemerkt, weil der Fallback wie Inhalt aussah.

**Der Fallback greift jetzt nur noch für `DEFAULT_LOCALE`.** Ein leerer
FAQ-Block fällt auf; deutscher Text auf einer FR-Seite nicht.

Dazu bereinigt: `categories` ist bei FAQs faktisch tot (nur 5 von 87 Dateien
trugen es, davon 2 ohne `.md`-Endung). Die drei FR-Dateien haben es verloren,
damit sie wie ihre deutschen Gegenstücke ohne Skill-Einschränkung gelten.

## Zwei Dateien ohne `.md` (erledigt 2026-07-31)

`getAllFAQs` liest nur `/\.md$/i`. `public/faq/kaiserslautern/wann-buchen` und
`public/faq/default/kosten-schnellzeichner` hatten keine Endung und waren damit
für Website **und** Admin unsichtbar. Erstere ist umbenannt (Inhalt war
verloren, steht jetzt auf der Seite), letztere gelöscht — `kosten.md` deckt
dieselbe Frage ab, und die Datei ist per git wiederherstellbar.


## Leer heisst nirgends (2026-07-31, Entscheidung Sasha)

Die Regel in einem Satz: **eine FAQ erscheint nur da, wo ein Tag von ihr sitzt.**
Wer überall gelten soll, liegt ausdrücklich in `public/faq/default/` und trägt
gar keinen Tag — das ist der Auffüll-Topf, dieselbe Rolle wie
`default-selection.json` bei den Bildern.

Vorher galt „kein Tag in dieser Dimension = gilt überall". Wer im Admin eine
Frage anlegte und das Taggen vergaß, veröffentlichte sie versehentlich auf
allen 170 Seiten — und merkte es nicht, weil es wie Absicht aussah.

`matchesFAQContext` stimmt jetzt je Dimension ab:

| Stimme | wann |
| :-- | :-- |
| `treffer` | die FAQ trägt den gesuchten Tag |
| `dagegen` | sie trägt in dieser Dimension einen ANDEREN Tag |
| `enthaltung` | sie trägt hier keinen Tag, oder die Dimension wird nicht abgefragt |

**Mindestens ein Treffer, kein Dagegen.** Enthaltungen müssen erlaubt sein,
sonst verlöre `/schnellzeichner/trier/` seine Trier-FAQs, nur weil die keinen
Skill-Tag tragen.

Gemessen vor der Umstellung: 14 von 86 FAQs tragen keinen Tag, **alle 14 liegen
in `default/`**, keine ungetaggte Datei außerhalb. Die Regel kostet also keinen
Inhalt.

### Der Nebenbefund: `categories` machte FAQs unsichtbar

Unter der alten Regel füllte `categories` die Skill-Dimension. Fragte eine Seite
Skills **nicht** ab — also jede Stadt- und jede Anlass-Seite —, stimmte die FAQ
dagegen und flog raus. Betroffen waren genau die zwei FAQs, die zuletzt über den
Admin veröffentlicht wurden: `rhein-main-gebiet/kosten-2.md` trägt sieben
Anlass-Tags, einen Ort-Tag und `categories: [Schnellzeichner]` — und stand auf
**null von 170 Seiten**, nicht einmal auf ihrer eigenen Stadtseite. Seit der
Umstellung steht sie auf ihren fünf.

Seiten mit identischem FAQ-Satz: 60 → 51 von 158.
