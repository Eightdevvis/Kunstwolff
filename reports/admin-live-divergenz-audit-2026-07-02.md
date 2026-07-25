# Admin ↔ Live Divergenz-Audit

**Datum:** 2026-07-02 · **Status:** Teil 1 (manuell verifiziert) — Voll-Sweep offen (siehe §10)

Fortführung der laufenden Dokumentation aus Memory `admin_vs_live_resolution_gap`. Zweck:
das wiederkehrende Muster „Admin zeigt eigenes Bild/Inhalt, live wird geerbt/anderes" ein
für alle Mal erschöpfend erfassen — alle bisherigen Fälle **und** die neu gefundenen zusammen.

> ⚠️ Der geplante ultracode-Voll-Audit (jedes Element × jeden Seitentyp, adversarial
> verifiziert) konnte am 2026-07-02 nicht laufen: alle Agenten liefen ins **Session-/
> Kontingent-Limit** (Reset 18:20 Europe/Berlin). Dieses Dokument enthält daher die
> **manuell verifizierten** Befunde (skill, skill-landing, event, skill-event) + den
> Seed-Fix. Die Seitentypen **homepage, Stadt-Landing, other-why, global** sowie mehrere
> globale Elemente sind noch **UNGEPRÜFT** (§10) und vom Voll-Sweep nachzutragen.

---

## 1. Historie der Vorfälle

| # | Vorfall | Wurzel | Status |
|---|---|---|---|
| 1 | Event-Referenzen unsichtbar | Zweitschalter `content.json.enabled` (Website las Schalter, Admin zeigte Rohzustand) | gefixt |
| 2 | Why-Bilder Admin≠Live | Ordner-Rohzustand vs. JSON-Merge + Default-Fallback | gefixt |
| 3 | Slideshow belgique zu viele Bilder | Default-Auffüllung auf `MIN_LANDING_SLIDES=6` (`supplementWithDefaultSlides`) | dokumentiert |
| 4 | Event-/Hero-Hintergrund falsch | `resolveEventTitleImage` nahm „alphabetisch erstes, sonst Fallback" | gefixt (→ `resolveDefaultTitleImage`) |
| 5 | **skillHero-Titelbild erbt Homepage** | Admin schreibt `Titelbild/{skill}/`, Website las **nur** `Titelbild/default/` | **gefixt (diese Session)** |

**Fix #5 (verifiziert):** `src/utils/titleImages.ts` `resolveTitleImageItem` liest jetzt
`ownSlug = landing || skill` als eigenen Ordner-Pool, Default nur als Fallback
(vorher `landingSlug ? … : []` → Skill-Ordner nie gelesen). Test:
`resolveTitleImage({skill:'schnellzeichner'})` → `/img/Titelbild/schnellzeichner/IMG_0059.webp`
statt `default/titelbild.avif`. Homepage/Stadt/Skill+Stadt unverändert.

---

## 2. Systematik — die eigentliche Wurzel: zwei Modelle

Jedes Inhalts-Element folgt genau **einem** Auflösungs-Modell:

- **Ordner = Wahrheit:** Admin lädt in `foo/{slug}/`, Website liest `foo/{slug}/` (+ ggf.
  Default als Fallback). Sauber, wenn Admin-Schreibpfad == Website-Lesepfad.
- **Kategorie = Wahrheit:** Inhalt trägt Tags (Skill/Stadt), Website filtert einen geteilten
  Pool. Sauber, wenn der Admin genau diese Tags pflegt.

**Die Divergenzen entstehen dort, wo ein Element zwischen beiden Modellen sitzt:** der
Admin-Editor schreibt ordner-basiert (`slides/{skill}`, `faq/{skill}`), die Website liest für
denselben Seitentyp kategorie-basiert (oder ungefiltert). Genau **Slideshow und FAQ** tun das.
Alles andere ist entweder sauber ordner- **oder** sauber kategorie-basiert.

Nordstern (User): **B** = Admin muss das echt gerenderte Ergebnis zeigen (Vorschau-Parität).
**D** = Magie entfernen; keine stillen Fallbacks/Auswahlregeln; fehlt Content → Default der
Default-Seite (keine zufälligen Samples).

---

## 3. Element × Seitentyp — Matrix (verifizierter Teil)

Legende: ✅ MATCH · ❌ DIVERGENZ (aktiv) · ⚠️ latent/weich · 🔧 Editierbarkeits-Lücke · 🔀 Zweitschalter · — n/a · **?** UNGEPRÜFT

| Element | homepage | landing | skill | skill-landing | event | skill-event |
|---|---|---|---|---|---|---|
| Titelbild / Opener | **?** | **?** | ✅ (Fix #5) | ✅ | ✅ (events/{slug}→default) | ✅ (erbt Event, nicht Homepage) |
| Hero-Hintergrund | — | — | ✅ `hero-bg/{skill}` | ✅ `hero-bg/{skill}-{landing}` | — | — |
| Why | **?** | **?** | ✅ `why/{skill}.json` | ✅ `why/{skill}-{landing}.json` | — | — |
| **Slideshow** | **?** | ⚠️ Ordner ok, Kat-Overlay | ❌ latent (`slides/{skill}` nie gelesen) | ⚠️ `slides/{landing}` + Kat-Overlay | ✅ `slides/events/{slug}` | ❌ **aktiv** (Event-Slides verworfen) |
| **FAQ** | **?** | ✅ `faq/{landing}` | ⚠️ Kategorie statt `faq/{skill}` | ✅ `faq/{landing}` | ❌ `faq/events/{slug}` nie gelesen | ❌ Skill-Kat statt Event-Ordner |
| Reviews | **?** | **?** | ✅ (Kategorie, editierbar via Tags) | ✅ | ✅ | ✅ |
| Event-Meta/Ablauf/Pakete/Skills/Ref. | — | — | — | — | ✅ (🔀 Sichtbarkeit via Länge/enabled) | teilw. (🔀 skills.enabled) |
| combo Lead/Benefits/Teaser | — | — | — | — | — | 🔧 hartkodiert, kein Editor |
| landingIntro | **?** | **?** | — | — | — | — |
| eventtypes (Stripe) | **?** | **?** | — | — | — | — |
| erinnerungen | **?** | — | — | 🔧 editorType null | — | — |
| landingsection | **?** | **?** | — (statisch) | — | — | — |
| cinemaWelcome | **?** | — | — | — | — | — |

---

## 4. Bestätigte Divergenzen — priorisiert

### HIGH · Slideshow `skill-event` — aktiver Sichtbarkeitsverlust
Admin schreibt Event-Slides nach `public/img/slides/events/{slug}` (kategorielos, kein
`events/*`-Key in `slides.meta.json`). `src/pages/[skill]/[landing].astro:238` legt
`filteredCategories:[skillTitle]` an; `src/components/slideshows/Slideshow.astro:12-21`
**verwirft jede Slide ohne passende Kategorie** → alle Event-Slides verschwinden, live nur
generische skill-kategorisierte Default-Slides. Betroffen: firmenfeier/hochzeit/messe (reale
Slides vorhanden). Die reine Event-Seite zeigt dieselben Slides korrekt (ohne Filter).
**Angleichung:** auf skill-event den Slide-Filter für den Event-Slug-Ordner weglassen
(Event-Slides ungefiltert durchreichen, wie `[landing].astro` Event-Zweig).

### MEDIUM · FAQ `event` & `skill-event` — geschriebener Content nie gezielt gelesen
Admin-FAQ-Editor bekommt `city=events/{slug}` (`pageTypes.ts:233`+`195`) → schreibt
`public/faq/events/{slug}/*.md` (`FaqManager.tsx:56`). Aber: reine Event-Seite übergibt
`faq:{}` → `getAllFAQs()` ungefiltert; skill-event übergibt `categories:[skillTitle]` →
`getFAQsByCategories` liest den Event-Ordner nie. `faq.ts` **unterstützt** Event-Kontext
(`isEventContext = cityKey.startsWith('events/')`), aber keine Seite reicht ihn durch.
**Angleichung:** `city="events/${landing}"` an `<FAQ>` übergeben (Event- und skill-event-Seite).

### MEDIUM · Slideshow `skill` — latente Divergenz
Admin-Slideshow-Editor der Skill-Seite → `public/img/slides/{skill}`. `[skill].astro:28`
liest `getHomepageSlides()` + Kategorie-Filter (`:74`), liest `slides/{skill}` **nie**. Ordner
existiert aktuell nicht → Upload landet tot. (Skill-getaggte Homepage-Slides existieren, d.h.
der Kategorie-Pfad ist aktiv — Modellwahl §8.)

### LOW/WEICH · FAQ `skill`, Slideshow `skill-landing`
- FAQ skill: Admin `faq/{skill}`, Website nur Kategorie (`getFAQsByCategories`). Gemildert durch
  Kategorie-Checkboxen im FaqManager. **Angleichung:** `faq:{ city: skill, categories:[…] }`.
- Slideshow skill-landing: Ordner `slides/{landing}` stimmt, aber `[skill]/[landing].astro:206`
  `filteredCategories:[skillTitle]` versteckt ungetaggte Stadt-Slides auf `/{skill}/{stadt}`.

---

## 5. Editierbarkeits-Lücken (rendert live, im Admin nicht editierbar)

- **skill-event Hauptinhalt:** `comboLead`, `comboBenefits`, `eventTeaser` kommen hartkodiert aus
  `src/utils/comboContent.ts` (`getSkillEventContent`), haben keinen COMP-Eintrag und werden aus
  dem Admin-Stack gefiltert (`InterfaceView.tsx:190-192`). Im Editor fehlt der Textkörper der Seite.
- **erinnerungen (skill-landing):** `editorType: null` → kein Editor; Website löst via
  `getErinnerungen` Fallback-Kette auf.

---

## 6. Zweitschalter & versteckte Sichtbarkeit

- Event-Sektionen: Sichtbarkeit hängt an Array-Länge (`steps/items/logos.length>0`) bzw.
  `skills.enabled` — **inkonsistent**: reine Event-Seite ignoriert `skills.enabled`
  (`[landing].astro:226`), skill-event respektiert ihn (`[skill]/[landing].astro:239`).
- `events/kinderfest/content.json` ohne `events.json`-Eintrag → nie gerendert (Orphan).
- `private-feier`: 0 Slides + 0 Titelbild → Default-Fallback (bekanntes Muster).

---

## 7. Bestätigte MATCHes (kein Bug)

Titelbild (skill nach Fix #5, skill-landing, event, skill-event), Hero-Hintergrund (skill,
skill-landing), Why (skill, skill-landing), FAQ (skill-landing `faq/{landing}`), Slideshow
(skill-landing Ordnerebene, event `slides/events/{slug}`), Event-Meta/Titelbild (erbt vom
Event-Ordner, **nicht** von der Homepage).

---

## 8. Offene Entscheidung — Slideshow + FAQ Modellwahl

Slideshow und FAQ müssen **ein** Modell bekommen. Optionen (Live-Folgen beachten):

- **A · Ordner = Wahrheit (Nordstern D):** Website liest den Ordner, den der Admin füllt;
  Kategorie-Filter auf Skill/Event raus. Konsistent mit Titelbild/Why/heroBg. *Live-Folge:*
  reine Skill-Seiten zeigen ihren (leeren→Default) Ordner statt kategorie-getaggter Slides.
- **B · Kategorie = Wahrheit:** Website bleibt; Admin-Slideshow/FAQ-Editoren für Skill/Event
  auf Tag-Pflege umbauen statt in tote Ordner zu schreiben. Keine Live-Änderung.
- **C · Hybrid:** eigener Ordner wenn befüllt, sonst kategorie-gefilterter Pool (wie Titelbild
  jetzt). Keine Regression, behält eine Rest-Auflösungsschicht.

Entscheidung ausstehend (User).

---

## 9. Empfohlener Ausrottungs-Plan

1. **Ein Resolver-Contract pro Element** definieren (welcher Pfad, welcher Fallback) und
   an EINER Stelle dokumentieren, die Admin **und** Website teilen.
2. Slideshow + FAQ nach gewähltem Modell (§8) über **alle** Seitentypen vereinheitlichen.
3. Editierbarkeits-Lücken schließen (combo*-Editor) oder bewusst als „code-managed" markieren.
4. Zweitschalter vereinheitlichen (enabled vs. Länge — eine Regel).
5. **Preview-Parität (Nordstern B):** LivePreview-iframe deckt den veröffentlichten Stand ab;
   Draft-Parität bleibt Phase 2.
6. Nach jedem Fix: der Voll-Sweep (§10) als Regressionsnetz.

---

## 10. Nicht abgedeckt / Rest-Risiko (Voll-Sweep nachzutragen)

Vom Session-Limit blockiert, **noch UNGEPRÜFT**:
- **Seitentypen:** homepage (opener, landingIntro, homepageReviews, cinemaWelcome, eventtypes,
  why, faq, slideshow, landingsection), Stadt-Landing (`[landing].astro`), other-why.
- **Globale Elemente:** Navigation/Footer (`navigation.ts`, `landings.md`), BrandStripe,
  site-texts-Überschriften (`siteTexts.ts`), SEO/OG-Bilder (Layout `image=titleImage`, Schema),
  `default-selection.json` (ersetzt-vs-ergänzt), `pageVisibility`/`isPageHiddenByPath`,
  i18n-`fr`-Overlay-Auflösung, Metadaten (`title.meta.json` focus/frame, `slides.meta.json`
  alt/categories), Reviews-Auflösung skill vs. stadt im Detail, why-detail-Links, Partner, Cinema.

**Nächster Schritt:** ultracode-Workflow `admin-live-divergenz-audit` nach 18:20 (Reset)
erneut starten; er trägt die offenen Zellen ein und faltet sie in dieses Dokument.
