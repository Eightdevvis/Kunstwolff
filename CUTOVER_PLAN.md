# Cutover-Plan: Wix → Astro auf Vercel

**Stand:** 2026-08-01 (überarbeitet; ursprünglich 2026-05-05) — Cloudflare-Zone steht und ist geprüft
**Ziel:** `kunstwolff.de` von Wix auf die Astro-Site (aktuell `kunstwolff.vercel.app`) umziehen.
**Status:** **Weg B entschieden** — die DNS-Zone zieht zu Cloudflare. Siehe §2.3.

> ## ⚠️ Vier Korrekturen am 2026-08-01 — nicht nach der alten Fassung arbeiten
>
> Die Ausgangslage wurde am 2026-08-01 mit `dig` gemessen, nicht angenommen.
> Vier Aussagen dieses Plans waren falsch, zwei davon gefährlich:
>
> 1. **„DNS beim Domain-Registrar ändern" war falsch.** Die Zone liegt bei
>    **Wix** (`ns12/ns13.wixdns.net`), nicht beim Registrar. Beim Registrar
>    stehen nur die Nameserver — und genau die ändern wir bei Weg B.
> 2. **„MX-Records NICHT anfassen" ging ins Leere.** Es gibt **keine**
>    MX-Records und **keine** TXT-Records. Über diese Domain läuft keine
>    E-Mail (Kontaktadresse ist `info@artelines.com`, andere Domain). Genau
>    deshalb ist der Zonen-Umzug hier ungefährlich: es gibt nichts zu vergessen.
> 3. **🔴 „Wix → 'Disconnect Domain'" ist der eine Knopf, der alles killt.**
>    Solange Wix die Zone führt, nimmt er nicht die Website vom Netz, sondern
>    das **Telefonbuch**: danach beantwortet niemand mehr Anfragen für
>    kunstwolff.de, die Domain ist komplett tot. Ausschließlich
>    **„Coming Soon"** verwenden.
> 4. **🔴 „Ohne `SITE_URL` liefert die Stage `noindex`" ist falsch herum.**
>    Ohne die Variable baut Astro auf den Apex `https://kunstwolff.de` — und
>    der steht in der `PRODUCTION_HOSTS`-Whitelist. Ergebnis: `index, follow`.
>    Der Schutz greift nur, wenn `SITE_URL` **gesetzt** ist. Details in
>    `ARBEITSLISTE.md` Punkt 0.1.

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
  - 🔴 **Korrigiert 2026-08-01:** hier stand, ohne `SITE_URL` liefere die Stage
    bereits `noindex`. **Falsch herum.** Ohne die Variable baut Astro auf den
    Apex, der in der Whitelist steht → `index, follow`. **Vor dem Umzug prüfen,
    ob die `.vercel.app`-Adresse deshalb schon Treffer in der Search Console
    hat** — die müssten dann mit weggeräumt werden.
- [ ] In Vercel das `Production`-Deployment einmal redeployen, damit die
  Env-Variable greift.

### 2.3 DNS — Weg B: Zone von Wix zu Cloudflare (entschieden 2026-08-01)

**Warum B und nicht „Records bei Wix ändern":** Solange Wix die Zone führt,
bleibt das Wix-Abo Pflicht — kündigen heißt Domain offline. Weg B macht die
Sache einmal statt zweimal. Cloudflare, weil dort ohnehin schon der
Admin-Worker läuft: kein neuer Anbieter, kein neuer Account, kostenlos.

**Ausgangslage, vollständig ausgelesen am 2026-08-01** (nicht nur die Typen,
an die man zufällig denkt — die Wix-Zone wurde Satz für Satz abgefragt):

| Record | jetzt |
|:--|:--|
| SOA | `ns12.wixdns.net. support.wix.com.` |
| NS | `ns12.wixdns.net`, `ns13.wixdns.net` |
| `A kunstwolff.de` | `185.230.63.186/107/171` (Wix), TTL 3600 |
| `CNAME www` | `cdn1.wixdns.net` (Wix-CDN) |
| MX · TXT · CAA · AAAA · SRV · NAPTR | **alle leer** |
| weitere Subdomains | **keine** (mail/smtp/webmail/blog/shop/api/… geprüft) |

Zu übernehmen ist also **nur die Website**. Kein E-Mail-Risiko, kein
IPv6-Eintrag, keine Subdomain außer `www`.

**Die drei Dinge, die einen Zonen-Umzug sonst killen — hier alle geprüft:**

1. **DNSSEC: aus.** Keine DS-Einträge bei der `.de`-Registry, keine DNSKEY in
   der Zone, kein `ad`-Flag. **Wäre es an**, würden nach dem Nameserver-Wechsel
   die alten Signaturschlüssel nicht mehr passen und die Domain wäre für jeden
   prüfenden Resolver **komplett unerreichbar** — nicht „alte Seite", sondern
   Fehlermeldung. Nichts zu tun; falls es später jemand einschaltet, vorher
   ausschalten.
2. **CAA: keiner.** Damit darf jede CA ein Zertifikat ausstellen. Ein
   CAA-Eintrag, der nur eine fremde CA erlaubt, würde Let's Encrypt blockieren —
   Vercel bekäme kein Zertifikat und die Seite wäre über HTTPS tot.
3. **HSTS: die Wix-Seite sendet `max-age=31556952`** (ein Jahr).
   🔴 **Daraus folgt: HTTPS muss vom ersten Moment an funktionieren.** Jeder
   Besucher der letzten zwölf Monate hat im Browser gespeichert, dass diese
   Domain nur über HTTPS erreichbar ist — das ist bindend und **nicht
   wegklickbar**. Ist das Vercel-Zertifikat beim Umschalten noch nicht
   ausgestellt, sehen diese Leute eine harte Fehlerseite statt einer Warnung.
   **Der Umzug gilt erst als erledigt, wenn `https://www.kunstwolff.de/`
   wirklich 200 liefert — nicht, wenn `dig` gut aussieht.**

**Reihenfolge — erst die neue Zone fertig, dann erst die Nameserver.**
Wer zuerst die Nameserver umstellt, hat eine leere Zone im Netz und die Seite
ist weg.

- [ ] **1. Domain bei Cloudflare hinzufügen** (Add a site → kunstwolff.de →
      Free-Plan). Cloudflare liest die bestehende Zone aus und schlägt Records
      vor — die Wix-Einträge dabei **nicht** übernehmen.
- [ ] **2. Zwei Records anlegen** (Werte im Vercel-Dashboard unter
      Project → Settings → Domains gegenprüfen, Vercel zeigt sie dort an):
      | Typ | Name | Wert | Proxy |
      |:--|:--|:--|:--|
      | `A` | `@` | `216.198.79.1` | **DNS only (graue Wolke)** |
      | `CNAME` | `www` | `cname.vercel-dns.com` | **DNS only (graue Wolke)** |
      ⚠️ **Am 2026-08-01 korrigiert:** hier stand `76.76.21.21`. Vercel zeigt
      inzwischen `216.198.79.1` an („We're expanding our IP range") und nennt
      den alten Wert ausdrücklich „legacy". Gemessen funktionieren **beide**
      (je 200 mit echtem Host-Header), aber es gilt der Wert, den Vercel im
      Dashboard anzeigt — nicht der aus diesem Plan. Vor dem Anlegen dort
      nachsehen.
- [ ] **3. Proxy AUS lassen.** Die orange Wolke schaltet Cloudflare als CDN
      **vor** Vercel. Das bringt hier nichts (Vercel ist bereits CDN) und
      kostet: doppeltes Caching, und die TLS-Ausstellung bei Vercel kann
      scheitern, weil Vercel den Ursprung nicht mehr direkt erreicht.
- [ ] **4. Alle Wix-Reste in der Cloudflare-Zone löschen** — die
      `185.230.63.x`-A-Records und der `cdn1.wixdns.net`-CNAME dürfen dort
      nicht auftauchen.
- [ ] **5. Zone prüfen, BEVOR die Nameserver umgestellt werden:**
      ```bash
      # direkt die neuen Cloudflare-Nameserver fragen, am Cache vorbei
      dig @<cloudflare-ns1> kunstwolff.de A +short      # → 76.76.21.21
      dig @<cloudflare-ns1> www.kunstwolff.de CNAME +short  # → cname.vercel-dns.com
      ```
      Kommt hier etwas anderes, ist die Zone falsch — dann NICHT weitermachen.
- [ ] **5b. 🔴 Domain im VERCEL-Projekt eintragen — vor dem Nameserver-Wechsel.**
      Am 2026-08-01 beim Prüfen von Schritt 5 aufgefallen und hier nachgetragen:
      die Zone war korrekt, aber Vercel antwortete auf
      `curl -H "Host: www.kunstwolff.de" http://76.76.21.21/` mit
      **`X-Vercel-Error: DEPLOYMENT_NOT_FOUND`**. Vercel kannte die Domain nicht
      und wusste nicht, welches Projekt es ausliefern soll. Wären die Nameserver
      vorher umgestellt worden, hätte **jeder Besucher** nach der Propagation
      „The deployment could not be found on Vercel" gesehen — bei korrektem DNS.
      - Vercel → Projekt → **Settings → Domains**
      - `www.kunstwolff.de` hinzufügen (kanonischer Host)
      - `kunstwolff.de` hinzufügen, auf **Redirect to `www.kunstwolff.de`**
        stellen (= Schritt 10, der Apex→www-Redirect; gehört in die
        Domain-Settings, **nicht** in `vercel.json`)
      - Die von Vercel angezeigten Sollwerte gegen die Zone halten: müssen
        `76.76.21.21` und `cname.vercel-dns.com` sein
      - Vercel markiert beide als „Invalid Configuration" — **normal**, solange
        das öffentliche DNS noch auf Wix zeigt
      - Gegenprobe, bevor es weitergeht: der `curl` oben muss **200** liefern,
        nicht 404

- [ ] **5c. 🔴 `SITE_URL` auf die Zieladresse setzen — VOR dem Nameserver-Wechsel.**
      Am 2026-08-01 beim Prüfen von 5b gemessen: das Production-Deployment
      liefert für `www.kunstwolff.de` zwar die richtige Seite (Titel, H1, 93 KB),
      aber im Kopf steht
      `<link rel="canonical" href="https://kunstwolff.vercel.app/">` und
      `<meta name="robots" content="noindex, nofollow">`.
      **`SITE_URL` steht also auf der Stage-Adresse, nicht auf leer.**
      - **Gute Nachricht:** damit ist beantwortet, ob die Stage indexiert wird —
        **nein**, der Whitelist-Schutz greift. Die Frage aus `ARBEITSLISTE.md`
        („Ist die Vercel-Stage gerade indexierbar?") ist damit erledigt.
      - **Die Falle:** würde man in diesem Zustand die Nameserver umstellen,
        ginge `kunstwolff.de` mit `noindex, nofollow` live und mit einem
        Canonical auf `kunstwolff.vercel.app`. Google würde die bestehenden
        Rankings abräumen. Von außen unsichtbar: die Seite lädt und sieht
        richtig aus.
      - Also: `SITE_URL = https://www.kunstwolff.de` für **Production** setzen
        und das Production-Deployment **von Hand neu bauen** (geänderte
        Variablen wirken nicht auf bestehende Deployments).
      - Gegenprobe, bevor es weitergeht:
        `curl -s -H "Host: www.kunstwolff.de" http://<vercel-ip>/ | grep -E 'canonical|robots'`
        muss `https://www.kunstwolff.de/` und `index, follow` zeigen.

- [ ] **6. Nameserver beim Registrar umstellen** — dort, wo die Domain gekauft
      ist (nicht bei Wix). `ns12/ns13.wixdns.net` durch die zwei Nameserver
      ersetzen, die Cloudflare dir nennt.
- [ ] **7. 24–48 h Propagation.** Nicht beschleunigbar: der Nameserver-Wechsel
      wird eine Ebene höher (bei der `.de`-Registry) zwischengespeichert, und
      diese TTL gehört dir nicht. Das Absenken der Record-TTLs bei Wix hilft
      dagegen **nicht** — das ist der Grund, warum der alte Plan-Schritt hier
      entfallen ist.
      **Kein Ausfall in dieser Zeit:** wer noch die alten Nameserver fragt,
      bekommt Wix und sieht die alte Seite; wer schon die neuen fragt, bekommt
      Vercel. Beide funktionieren. Genau deshalb muss Schritt 5 vorher sitzen.
- [ ] **8. Propagation prüfen**, bis überall Cloudflare antwortet:
      ```bash
      dig NS kunstwolff.de +short           # → beide Cloudflare-NS
      dig kunstwolff.de A +short            # → 76.76.21.21
      dig www.kunstwolff.de +short          # → Vercel
      ```
- [ ] **9. Erst danach Wix auf „Coming Soon"** — siehe Korrektur 3 oben.
      Sobald die Nameserver weg sind, ist die Wix-DNS-Verwaltung ohnehin
      wirkungslos; „Disconnect Domain" bleibt trotzdem tabu.
- [ ] **10. Apex → www** als Redirect in den **Vercel-Domain-Settings**
      einstellen (nicht in `vercel.json` — dort greift es zu spät).

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
3. **DNS: nach §2.3 (Weg B) vorgehen** — Zone bei Cloudflare aufbauen, prüfen,
   dann erst die Nameserver beim Registrar umstellen. Der frühere Text hier
   („beim Registrar die Records ändern", „5–15 Min warten") galt für Weg A und
   ist überholt: bei Weg B sind es 24–48 h, und die Records liegen bei
   Cloudflare, nicht beim Registrar.
4. **Warten, bis `dig NS kunstwolff.de +short` überall Cloudflare zeigt.**
5. **Vercel verifiziert die Domain automatisch** (TLS-Cert via Let's Encrypt
   wird gezogen, dauert üblicherweise <2 Min nachdem DNS steht).
6. 🔴 **Wix ausschließlich auf „Coming Soon"** (Wix → Settings → Site).
   **NIEMALS „Disconnect Domain"** — siehe Korrektur 3 ganz oben.
   Account NICHT kündigen — siehe §5.

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
  - ~~Alle wichtigen E-Mails kommen weiter an (MX!)~~ — **entfällt**, über diese
    Domain läuft keine E-Mail (2026-08-01 gemessen: keine MX-Records)

- [ ] 🔴 **BEVOR irgendetwas bei Wix gekündigt wird: klären, wer die Domain
  REGISTRIERT hat.** Das ist nicht dasselbe wie die DNS-Zone.

  Der Umzug nach Cloudflare macht uns von Wix' **Nameservern** unabhängig — er
  ändert **nichts** daran, bei wem die Domain gekauft ist. Ist `kunstwolff.de`
  über Wix registriert (wahrscheinlich, siehe unten), hängt der Kaufvertrag
  weiter dort. **Ein vollständig gekündigtes Wix-Abo lässt die Domain auslaufen**
  — und eine ausgelaufene Domain ist irgendwann für jeden frei. Das passiert
  Monate später, wenn niemand mehr an den Umzug denkt, und ist praktisch nicht
  reparierbar.

  Indiz dafür, dass Wix der Registrar ist: die Zone lag von Anfang an auf
  `ns12/ns13.wixdns.net`, und es ist kein separates Registrar-Konto bekannt.
  Über RDAP/DENIC ist es nicht zu ermitteln — `.de` gibt die Daten nicht
  öffentlich heraus. **Nachsehen: Wix → Domains → kunstwolff.de**, oder
  `lookup.icann.org`, oder alte Rechnungen.

  Zwei saubere Auswege:
  - **Domain-Registrierung bei Wix behalten** und nur die Website kündigen
    (falls Wix das getrennt anbietet), oder
  - die Registrierung **in Ruhe zu einem echten Registrar transferieren** —
    dann doch „Transfer", aber ohne Zeitdruck und lange nach dem Umzug.

  Dabei ebenfalls prüfen: **Ablaufdatum der Domain und ob Auto-Renew aktiv ist.**

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
