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

Vorhandene Stadt-Ordner: `belgique`, `bw`, `duesseldorf`, `frankfurt`, `heidelberg`, `kaiserslautern`, `karlsruhe`, `koblenz`, `koeln`, `ludwigshafen`, `luxembourg`, `mainz`, `mannheim`, `rheinland-pfalz`, `saarbruecken`, `saarland`, `schweiz`, `trier`, `wiesbaden`, `wuppertal` (20 Städte + `default`). Weitere Stadt-FAQs: einfach den Ordner `public/faq/<stadt>/` anlegen und MD-Files reinschreiben.

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

⚠️ **Bekannte Grenze:** `FaqManager.tsx` schreibt den `tags:`-Block nur, wenn mindestens
ein Tag gesetzt ist (gleiche Haltung wie `ReviewManager`). Löscht jemand im Admin *alle*
Tags einer Stadt-FAQ, um sie allgemein zu machen, ergänzt der Sync beim nächsten Build
den Ordner-Tag wieder. „Bewusst allgemein" ist derzeit nicht ausdrückbar.

## Schema.org

FAQs werden automatisch als `FAQPage` JSON-LD ausgegeben (siehe `seo.md`). Kann zu aufklappbaren FAQ-Blöcken direkt in den Google-Suchergebnissen führen.

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
`getAllFAQs()` als `faqs`-Prop durch – sonst verliert die Übersichtsseite 65 Fragen.

## Anlass-Dimension: eigenes Feld statt Schmuggel durchs city-Feld (seit 2026-07-31)

`FAQFilterContext` hat jetzt `event`. Vorher entstanden `eventKeys` **ausschliesslich**
daraus, dass `city` mit `events/` begann – ein Weg, den kein einziger Aufrufer benutzte:
die Event-Zweige übergaben `faq: {}` bzw. nur den Skill. Folge: auf `/firmenfeier/`,
`/messe/`, `/hochzeit/` und `/private-feier/` passten alle 71 FAQs mit Treffergüte 0, es
entschied die Lesereihenfolge der Dateien, und alle vier zeigten dieselben Fragen wie die
Startseite. Ein im Admin gesetzter Anlass-Tag konnte nie ankommen.

Geändert: `src/utils/faq.ts` (`event` im Kontext), `src/components/FAQ.astro` (nimmt es an
und reicht es weiter), die Event-Zweige in `src/pages/[landing].astro` und
`src/pages/[skill]/[landing].astro`. Der alte Weg `city: 'events/<slug>'` bleibt gültig –
die FAQ-Dateien liegen so im Repo und `cityFromPath` leitet den Wert daraus ab.

⚠️ **Auf dem Bildschirm ändert sich vorerst nichts**, und das ist richtig so: heute haben
**alle 71 FAQs `events: []`**, und „leer gilt überall". Der Fix macht das Zuordnen im
Admin erst möglich – sobald dort ein Anlass gesetzt wird, greift er sofort.

Test: `tests/faq-anlass.test.ts`, inklusive der Gegenprobe, dass eine Firmenfeier-FAQ auf
`/messe/` NICHT erscheint.

## Anlass-FAQs (seit 2026-07-31)

`public/faq/events/<anlass>--<thema>.md` – 12 Stück, drei je Anlass, getaggt über
`tags.events`. Der Ordner ist reine Ablage: die Auswahl läuft ausschließlich über den Tag
(`cityFromPath` würde aus `events/…` ohnehin nur „events" ableiten, das wird für die
Zuordnung nicht benutzt).

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
