# Dokumentations-Audit: Kunstwolff Website

**Datum:** 2026-03-17
**Geprüft:** README.md (609 Zeilen) + CLAUDE.md + memory/MEMORY.md
**Gegen:** Komplette Projektstruktur (live-Dateien)

---

## Gesamturteil

Die Dokumentation ist **solide und strukturiert** – der allermeiste Stuff ist korrekt und vollständig. Es gibt aber **drei echte Lücken** und **zwei Inkonsistenzen** die aufgedeckt wurden.

---

## Lücke 1 – navigation.json Format-Fehler in der README (KRITISCH)

**Was die README zeigt (Section 3.10):**
```json
[
  { "label": "Start", "url": "/" },
  { "label": "Skills", "children": [
    { "label": "Schnellzeichner", "url": "/schnellzeichner/" }
  ]}
]
```

**Was die echte Datei `public/navigation/navigation.json` enthält:**
```json
{
  "items": [
    { "label": "Home", "url": "/" },
    ...
  ]
}
```

Das ist ein **falsches Format-Beispiel** in der README. Wer nach der Doku geht und eine `navigation.json` neu erstellt oder validiert, tut das nach einem Array – die Website liest aber ein Objekt mit `"items"`-Key. Je nachdem wie robust `navigation.ts` fehlertoleriert, könnte das zu einem stillen Fehler führen.

**→ Empfehlung:** Format-Beispiel in Section 3.10 auf das Objekt-Schema korrigieren.

---

## Lücke 2 – `src/scripts/formspree.js` komplett undokumentiert (MITTEL)

Die Datei `src/scripts/formspree.js` existiert und enthält die komplette Kontaktformular-Logik inkl. hardcoded Formspree-Endpoint:

```
https://formspree.io/f/mvzbzvqy
```

Nirgendwo in der README, CLAUDE.md oder ANLEITUNGEN wird erwähnt:
- Dass es dieses Script gibt
- Wo der Formspree-Account konfiguriert ist
- Was man tun muss wenn der Account wechselt oder eine neue Form-ID vergeben wird

Das ist eine wartungs-relevante Info. Wenn jemand den Formspree-Account wechselt und nicht weiß wo die ID hardcoded ist, hat er ein Problem.

**→ Empfehlung:** Kurzer Hinweis in Section 2 oder als eigenen Abschnitt `3.12 Kontaktformular`:
> `src/scripts/formspree.js` – Formspree-ID `mvzbzvqy` ist hier hardcoded. Bei Wechsel des Accounts diese Zeile anpassen.

---

## Lücke 3 – `setup:hooks` fehlt in der Befehle-Tabelle (KLEIN)

Section 6 dokumentiert `npm run setup:hooks` korrekt und vollständig. Aber die Befehle-Tabelle in **Section 7** (`## 7) Befehle`) listet es **nicht auf** – obwohl dort alle anderen Scripts stehen. Wenn jemand direkt in die Command-Referenz springt ohne Section 6 zu lesen, findet er den Setup-Befehl nicht.

**→ Empfehlung:** Eintrag in Tabelle Section 7 ergänzen:

| Befehl | Zweck |
| :-- | :-- |
| `npm run setup:hooks` | Git-Hooks aktivieren (einmalig nach Clone) |

---

## Inkonsistenz 1 – LocalBusiness-Daten ohne Anleitung zum Ändern

In `src/pages/index.astro` sind laut README-Abschnitt 8.3 ("Wo Daten herkommen"):
> `LocalBusiness`-Adresse/Telefon → hardcoded in `src/pages/index.astro`

Das ist korrekt dokumentiert. **Aber:** Kein Hinweis WO genau in der Datei man das findet und was man konkret ändern müsste (Zeile, Feld-Namen). Ein Non-Developer der Adresse oder Telefon pflegen will würde suchen.

**→ Empfehlung:** Ergänze in Section 8.3 einen Hinweis:
> "Zum Ändern: `src/pages/index.astro` öffnen und die `LocalBusiness`-Felder (`address`, `telephone`, `areaServed`) direkt editieren."

---

## Inkonsistenz 2 – `removed_landings/` Verzeichnis erwähnt aber nicht kontextualisiert

Section 4b dokumentiert sehr gut dass das Script nach `removed_landings/<timestamp>-<stadt>/` archiviert. Aber das Verzeichnis wird **nirgendwo als Teil der Projektstruktur erklärt** – weder in Section 2 noch in einer Struktur-Übersicht. Wer das Repo zum ersten Mal aufmacht und den `removed_landings/` Ordner sieht, weiß nicht was das ist.

**→ Empfehlung:** Kurze Erwähnung in Section 2 ("Aktuelle Funktionsweise"):
> "`removed_landings/` – Archiv von Städten die entfernt wurden (siehe §4b)"

---

## Was vollständig und korrekt dokumentiert ist

| Bereich | Status |
| :-- | :-- |
| Alle 5+1 Sync-Scripts (Zweck, Reihenfolge) | ✅ |
| Git Hooks (pre-commit, pre-push) inkl. was sie stagen | ✅ |
| GitHub Action trigger + Verhalten | ✅ |
| Slide-System (6-Minimum, Deduplication, Priorität-Prefix) | ✅ |
| Review-Fallback-Kette (7-Minimum, zirkulär) | ✅ |
| Why-Sektion (Priorität skill-landing > landing > skill > default) | ✅ |
| Titelbild + Artefakt-Unterordner (landings/, skills/) erklärt | ✅ |
| FAQ-System (Pflicht/Optional-Felder, Filterung) | ✅ |
| Admin-Tool Schnittstelle (was es schreibt / was nicht) | ✅ |
| WIP-Komponenten explizit als WIP markiert | ✅ |
| content.config.ts "Platzhalter"-Erklärung | ✅ |
| Validierungsreports (Format, max 7 behalten) | ✅ |
| `remove:landing` inkl. was NICHT archiviert wird | ✅ |
| SEO (Sitemap, Schema.org, Meta-Tags, OG) | ✅ |
| Referenzlogos (Auto-Load, Dateiname = Label) | ✅ |
| Kalender (nur Admin, nicht Website) | ✅ korrekt impliziert |
| `kunstwolff-admin-README.md` als gecachte Admin-Doku erklärt | ✅ |

---

## Zusammenfassung (TL;DR)

| # | Schwere | Was | Wo |
| :-- | :-- | :-- | :-- |
| 1 | 🔴 KRITISCH | navigation.json Format falsch (Array vs. Object) | README Section 3.10 |
| 2 | 🟡 MITTEL | formspree.js mit hardcoded ID komplett undokumentiert | fehlt überall |
| 3 | 🟢 KLEIN | `setup:hooks` fehlt in Befehle-Tabelle | README Section 7 |
| 4 | 🟢 KLEIN | LocalBusiness-Felder ohne konkrete Änderungs-Anleitung | README Section 8.3 |
| 5 | 🟢 KLEIN | `removed_landings/` ohne Erwähnung in Struktur-Übersicht | README Section 2 |
