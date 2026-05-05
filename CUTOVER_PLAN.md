# Cutover-Plan: Wix → Astro auf Vercel

**Stand:** 2026-05-05
**Ziel:** `kunstwolff.de` von Wix auf die Astro-Site (aktuell `kunstwolff.vercel.app`) umziehen.
**Status:** Vorbereitung. Cutover-Termin offen.

> Schwester-Doku: `HEALTH_CHECK_2026-05-05.md` (Repo-Befunde),
> `memory/seo.md` → "Stage vs. Production" (`SITE_URL`-Mechanik).

---

## 0) Festgehaltene Entscheidungen

| Frage | Entscheidung |
|---|---|
| Kanonischer Host nach Cutover | **`www.kunstwolff.de`** (Apex 301 → www) |
| Tote Wix-URLs ohne Astro-Pendant | Best-Effort 301 auf thematisch nächste Astro-Seite, nach 6–12 Wochen auf 410 (Gone) |
| Slug-Mismatches (`/kontakt` vs `/contact`) | 301 von Wix-Slug auf Astro-Slug. Astro-Routes werden NICHT an Wix angepasst (`/contact` ist internationaler Standard). |
| Detail-Tiefe dieses Plans | Pragmatische Checkliste (kein Runbook mit Screenshots) |

---

## 1) URL-Mapping (Skeleton)

> ⚠ Vor Cutover muss diese Tabelle aus den **Google Search Console**-Daten
> der Wix-Site vervollständigt werden (Export aller indexierten URLs der
> letzten 12 Monate, sortiert nach Klicks/Impressions).

| Wix-URL (Quelle) | Status | Astro-Ziel | Redirect | Begründung |
|---|---|---|---|---|
| `/` | live | `/` | – | Identisch |
| `/kontakt` | live | `/contact/` | 301 | Slug-Anpassung |
| `/impressum` | live | `/impressum/` | – | Identisch |
| `/galerie` | live | `/partner/` (oder Skill-Hub) | 301 best-effort | Kein 1:1-Pendant – Astro hat keine zentrale Galerie. Alternativ: Galerie-Page in Astro nachrüsten, dann 301 auf die. |
| `/referenzen` | live | `/partner/` | 301 best-effort | Kunden-Logos sind in Astro im `BrandStripe` aller Hero-Bereiche; `/partner/` ist die nächstliegende dedizierte Seite. |
| `/schnellzeichnung-galerie` | live | `/schnellzeichner/` | 301 best-effort | Themengleich |
| `/kopie-von-schnellzeichnung-galerie` | live | – | **410 (Gone)** sofort | Wix-Bastelartefakt, nie offizieller Inhalt |
| `/about` (sofern in GSC) | ? | `/` | 301 | – |
| ... | | | | aus GSC ergänzen |

**Astro-only-URLs** (existieren nach Cutover, sind heute nicht in der Wix-Site):
`/datenschutz/`, `/FAQ/`, `/partner/`, alle 26 `/<stadt>/`, alle `/<skill>/`,
alle `/<skill>/<stadt>/`, alle 4 `/<event>/`, alle `/<skill>/<event>/`. → Diese
müssen nach Cutover in der GSC **manuell als neue Sitemap** eingereicht werden,
damit Google sie schnell crawlt.

---

## 2) Vor dem Cutover (Tage bis Wochen vorher)

### 2.1 Code & Konfig
- [ ] `vercel.json` ins Repo legen mit Redirect-Map aus §1. Beispiel-Skeleton:
  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "redirects": [
      { "source": "/kontakt", "destination": "/contact/", "permanent": true },
      { "source": "/galerie", "destination": "/partner/", "permanent": true },
      { "source": "/referenzen", "destination": "/partner/", "permanent": true },
      { "source": "/schnellzeichnung-galerie", "destination": "/schnellzeichner/", "permanent": true },
      { "source": "/kopie-von-schnellzeichnung-galerie", "destination": "/410", "permanent": true }
    ],
    "redirects_apex_to_www": "via Vercel Domain Settings, nicht hier"
  }
  ```
  *Alternativ: Redirects via Vercel-Dashboard. Im Repo ist aber besser
  versionierbar und reproduzierbar (siehe HEALTH_CHECK §DEPLOY-2).*
- [ ] **Galerie-Entscheidung treffen:** Soll `/galerie` als Astro-Seite
  nachgebaut werden? Wenn ja: vor Cutover bauen, sonst Best-Effort-301.
- [ ] `npm run build` lokal sauber (98 Seiten ✓), `npx tsc --noEmit` clean
  (steht aktuell, siehe HEALTH_CHECK BUG-A1).
- [ ] **Optional, empfohlen:** `astro check`/`tsc --noEmit` als CI-Step in
  `.github/workflows/sync-landings.yml` ergänzen, damit kein neuer TS-Drift
  unter dem Astro-Build durchschlüpft.

### 2.2 Vercel
- [ ] In Vercel **Project Settings → Domains:**
  - `www.kunstwolff.de` hinzufügen → als **Primary Domain** markieren
  - `kunstwolff.de` hinzufügen → Vercel zeigt automatisch "Redirect to www"
- [ ] **Project Settings → Environment Variables:**
  - `SITE_URL = https://www.kunstwolff.de` für Production-Environment
  - Vercel-Stage (Preview-Branches) bekommt `SITE_URL = https://kunstwolff.vercel.app`
  - *(Aktuell ist `SITE_URL` noch nirgends gesetzt → Layout-Whitelist liefert
    auf vercel.app bereits `noindex`, was korrekt ist.)*
- [ ] In Vercel das `Production`-Deployment einmal redeployen, damit die
  Env-Variable greift.

### 2.3 DNS (beim Domain-Registrar, NICHT in Vercel)
- [ ] **TTL aller relevanten Records auf 300s (5 Min) reduzieren** —
  mindestens 24-48 h vor dem Cutover-Tag, damit DNS-Provider die alten
  Werte nicht stundenlang cachen wenn es schiefgeht.
- [ ] **Vorab nicht ändern**, nur Notiz machen welche Records gleich
  geändert werden müssen:
  - `A` für Apex (`kunstwolff.de`) → Vercel-IP (`76.76.21.21`, Vercel
    bestätigt im Domain-Dashboard den korrekten Wert)
  - `CNAME` für `www` → `cname.vercel-dns.com`
  - **MX-Records (E-Mail) NICHT anfassen!** Separate Records, gehören zu
    Wix-Mail oder anderem Provider — bleiben wo sie sind.

### 2.4 Search Console / Analytics
- [ ] **GSC-Export ziehen:** Performance-Report → Pages, letzte 12 Monate,
  CSV exportieren. Daraus URL-Mapping in §1 ergänzen.
- [ ] Wix-Property in der GSC **nicht löschen** — sie zeigt nach Cutover
  die 301-Erfolge an.
- [ ] Falls noch nicht vorhanden: GSC-Property für `https://www.kunstwolff.de/`
  anlegen (nicht erst nach Cutover).
- [ ] Falls Analytics genutzt wird: Tracking-IDs in Astro hinterlegen
  (aktuell: keine in `Layout.astro` gefunden — ist das Absicht?).

### 2.5 Inhalts-Check (Astro vs. Wix)
- [ ] Wix-Site Seite für Seite durchklicken und vergleichen: gibt es Inhalte
  (Texte, Galerien, Kundenstimmen, Awards, Presse), die in Astro fehlen?
- [ ] Diese Lücken **vor Cutover** schließen — sonst kommt der Hauptverkehr
  auf eine "ärmer wirkende" Seite.
- [ ] Datenschutzerklärung & Impressum **wortgleich** übernehmen
  (rechtlich relevant!).

---

## 3) Cutover-Tag (~30 Min Aktivarbeit, dann Wartezeit)

### Reihenfolge wichtig:

1. **Wix-Backup** ziehen (Wix → Settings → Backup, oder kompletten Site-
   Export). Bei Misslingen Rollback-Basis.
2. **`SITE_URL` in Vercel** auf `https://www.kunstwolff.de` setzen, falls noch
   nicht passiert (siehe §2.2). Vercel triggert automatisch ein Redeploy.
3. **DNS umstellen** beim Registrar:
   - `A @` → Vercel-IP
   - `CNAME www` → `cname.vercel-dns.com`
   - alle alten Wix-Records (`A 185.230.63.107` o. ä., `TXT v=spf1 …` falls
     wix-spezifisch) entfernen
4. **Warten 5–15 Min**, bis DNS propagiert (durch die niedrige TTL aus §2.3).
   Test mit `dig www.kunstwolff.de +short` und `dig kunstwolff.de +short`.
5. **Vercel verifiziert die Domain automatisch** (TLS-Cert via Let's Encrypt
   wird gezogen, dauert üblicherweise <2 Min).
6. **Wix offline schalten** (Wix → Settings → Site → "Disconnect Domain"
   oder Site auf "Coming Soon"). Account NICHT kündigen — siehe §5.

---

## 4) Direkt nach dem Cutover (innerhalb der ersten Stunden)

### 4.1 Funktion verifizieren
- [ ] `curl -sIL https://www.kunstwolff.de/` → 200, Server: Vercel
- [ ] `curl -sIL https://kunstwolff.de/` → 301 → `https://www.kunstwolff.de/`
- [ ] `<meta name="robots">` = `"index, follow"` (mit `curl -s … | grep robots`)
- [ ] `<link rel="canonical">` zeigt auf `www.kunstwolff.de` ohne Doppel-Slash
- [ ] Sitemap: `curl -s https://www.kunstwolff.de/sitemap-index.xml` → URLs
  alle auf `www.kunstwolff.de` (nicht apex, nicht vercel.app)
- [ ] `robots.txt` zeigt korrekte Sitemap-URL
- [ ] **Smoke-Test (ca. 10–15 URLs)**:
  ```bash
  for p in / /contact/ /impressum/ /datenschutz/ /FAQ/ /partner/ \
           /schnellzeichner/ /szenenmaler/ /berlin/ /firmenfeier/ \
           /schnellzeichner/berlin/ /kontakt /galerie /referenzen \
           /kopie-von-schnellzeichnung-galerie; do
    code=$(curl -s -o /dev/null -w "%{http_code} %{redirect_url}" -L "https://www.kunstwolff.de$p")
    echo "$p  =>  $code"
  done
  ```
  - Alle Astro-Routen: **200**
  - Alle Wix-Legacy-Routen: **301** auf das in §1 definierte Ziel
  - `/kopie-von-…`: **410**

### 4.2 SEO/Tooling
- [ ] In **GSC für www-Property:** Sitemap einreichen
  (`https://www.kunstwolff.de/sitemap-index.xml`)
- [ ] In **GSC für Apex-Property** (sofern existiert): ebenfalls Sitemap
  einreichen, damit Google den Apex→www-Redirect erkennt.
- [ ] **URL-Inspektion** für 5–10 Top-URLs in der GSC (Indexierung erzwingen)
- [ ] Strukturierte Daten validieren:
  https://search.google.com/test/rich-results für `/`, `/schnellzeichner/`,
  `/berlin/`, `/schnellzeichner/berlin/`
- [ ] Open-Graph-Vorschau: https://www.opengraph.xyz/url/
  `https%3A%2F%2Fwww.kunstwolff.de%2F`

---

## 5) Beobachtungsphase (Wochen 1–12)

- [ ] **GSC Coverage-Report** wöchentlich prüfen: Neue 404 → Mapping erweitern.
- [ ] **GSC Performance-Report:** Klicks/Impressions auf Wix-Legacy-URLs
  beobachten — wenn die nahe 0 sind, kann §1-Tabelle die "best-effort 301"
  auf 410 umstellen (User-Entscheidung).
- [ ] **Wix-Account NICHT vor 30–60 Tagen kündigen.** Solange behalten als
  Rollback-Asset und für Backup-Restore. Erst kündigen wenn:
  - Mind. 4 Wochen ohne Probleme
  - GSC zeigt indexierte www-Seiten in deutlich höherer Zahl als die alten
    Wix-Pages
  - Alle wichtigen E-Mails kommen weiter an (MX!)

---

## 6) Rollback (für den Fall der Fälle)

Sollte innerhalb der ersten 48 h Schweres schiefgehen (Site nicht erreichbar,
Layout zerschossen, massiver Conversion-Einbruch):

1. **DNS zurückstellen** (alte Wix-Records, deshalb wurden sie in §2.3
   notiert): A-Record auf alte Wix-IP, CNAME auf alten Wix-Wert.
2. Niedrige TTL (5 Min) sorgt dafür, dass Rollback in <15 Min greift.
3. Wix-Site wieder als Default-Site einschalten.
4. Vercel-Domain im Vercel-Dashboard entfernen, damit kein Mixed-State.
5. **Ursachenanalyse**, dann neuen Cutover-Anlauf planen.

---

## 7) Bekannte Risiken / leicht zu vergessen

- **MX-Records:** Wenn Wix Mail bereitstellt, müssen vor Cutover die MX-
  Records auf einen anderen Provider (Google Workspace, Mailbox.org,
  Fastmail …) migriert sein, **sonst E-Mail-Ausfall**. Falls E-Mail bei
  separatem Provider liegt (Strato/IONOS/…), MX-Records einfach in Ruhe
  lassen.
- **Wix-Forms:** Falls die Wix-`/kontakt`-Seite eine Wix-eigene
  Form-Submission nutzt (Datenbank-Einträge, Mailweiterleitung), funktioniert
  das danach **nicht mehr**. Astro hat dafür `formspree.js` (siehe
  `src/pages/index.astro:62`) — vor Cutover muss verifiziert sein, dass das
  Kontaktformular der Astro-Site funktioniert (Test-Submission durchspielen,
  Zielmail-Adresse prüfen).
- **DNS-Provider-spezifische Quirks:** Manche Registrar (z.B. GoDaddy mit
  "Domain Forwarding") setzen versteckte Wrapper-Layer, die bei Vercel
  Probleme machen — vor Cutover prüfen.
- **HSTS:** Wix sendet `Strict-Transport-Security: max-age=31556952`. Astro
  via Vercel setzt ähnliches. Browser-Clients haben den Header gecached;
  Cutover ist dadurch **HTTPS-zwingend ab Sekunde 1** — kein "Test über HTTP".
- **CWV Erwartungsmanagement:** Astro-Site liefert ~71 kB HTML (Wix: 826 kB).
  Erwartbarer Lighthouse-Boost — aber GSC braucht 28 Tage rollendes Fenster
  bis CWV-Werte umschlagen. Nicht in Panik geraten wenn Tag 1 nichts auffällt.
