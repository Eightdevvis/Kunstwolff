#!/usr/bin/env bash
# umzug-status.sh — zeigt, wie weit der Domain-Umzug durch ist.
#
# Aufruf:  bash scripts/umzug-status.sh
#
# Propagation ist NICHT binär. Jeder Resolver hat seinen eigenen Zwischenspeicher
# und kippt zu seiner eigenen Zeit. Deshalb fragt dieses Skript mehrere
# öffentliche Resolver getrennt und zeigt, wie viele schon umgeschwenkt sind —
# statt nur den eigenen, der oft der letzte ist.
#
# Es prüft von unten nach oben:
#   1. Delegation  — wer ist laut Registry für die Domain zuständig?
#   2. Auflösung   — worauf zeigen A und www bei den einzelnen Resolvern?
#   3. Erreichbar  — antwortet HTTPS? (wegen HSTS gibt es keinen http-Fallback)
#   4. Inhalt      — kommt Vercel oder noch Wix? Canonical/robots korrekt?

set -uo pipefail

DOMAIN="kunstwolff.de"
WWW="www.$DOMAIN"
ZIEL_IP="216.198.79.1"
RESOLVER=("1.1.1.1" "8.8.8.8" "9.9.9.9" "208.67.222.222")

gruen() { printf '\033[32m%s\033[0m' "$1"; }
rot()   { printf '\033[31m%s\033[0m' "$1"; }
gelb()  { printf '\033[33m%s\033[0m' "$1"; }

echo "──────────────────────────────────────────────────────────────"
echo " Umzugs-Status  $DOMAIN"
echo "──────────────────────────────────────────────────────────────"

# ── 1. Delegation ─────────────────────────────────────────────────
#
# WEG A (seit 2026-08-01): Wix bleibt der DNS-Anbieter. Wix laesst die
# Nameserver einer dort REGISTRIERTEN Domain nicht aendern — nur die Eintraege
# darin. Deshalb ist "NS zeigt auf Wix" hier KEIN Fehler und kein Fortschritts-
# mass mehr. Entscheidend ist allein, worauf die Eintraege zeigen (Abschnitt 2).
echo
echo "1) Wer ist laut Registry zuständig? (bei Weg A bleibt das Wix)"
for r in "${RESOLVER[@]}"; do
  ns=$(dig @"$r" NS "$DOMAIN" +short +time=3 +tries=1 2>/dev/null | sort | tr '\n' ' ')
  if echo "$ns" | grep -q "cloudflare"; then
    printf '   %-16s ' "$r"; gruen "Cloudflare"; echo "  ($ns)"
  elif echo "$ns" | grep -q "wixdns"; then
    printf '   %-16s ' "$r"; echo "Wix (erwartet)"
  else
    printf '   %-16s ' "$r"; rot "unklar"; echo "     ($ns)"
  fi
done

# ── 2. Auflösung ──────────────────────────────────────────────────
echo
echo "2) Worauf zeigt die Domain?  ← das ist der Fortschrittsbalken"
aufVercel=0
for r in "${RESOLVER[@]}"; do
  a=$(dig @"$r" "$WWW" A +short +time=3 +tries=1 2>/dev/null | grep -E '^[0-9]' | head -1)
  # Gegen die ZIEL-Adressen prüfen, nicht gegen "ist nicht Wix". Wix liefert www
  # über 34.149.x.x, nicht über den 185.230.63er-Block — eine Ausschluss-Regel
  # hätte Wix als Vercel durchgewinkt.
  if [ -z "$a" ]; then
    printf '   %-16s ' "$r"; rot "keine Antwort"; echo
  elif echo "$a" | grep -qE "^(216\.198\.79\.|76\.76\.21\.|66\.33\.60\.)"; then
    printf '   %-16s ' "$r"; gruen "Vercel"; echo "   ($a)"
    aufVercel=$((aufVercel+1))
  else
    printf '   %-16s ' "$r"; gelb "noch nicht Vercel"; echo " ($a)"
  fi
done
echo "   → $aufVercel von ${#RESOLVER[@]} Resolvern zeigen auf Vercel"

# ── 3. Erreichbarkeit ─────────────────────────────────────────────
echo
echo "3) Antwortet HTTPS? (ohne gültiges Zertifikat geht wegen HSTS gar nichts)"
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$WWW/" 2>/dev/null)
if [ "$code" = "200" ]; then
  printf '   https://%s  ' "$WWW"; gruen "200"; echo
elif [ "$code" = "000" ]; then
  printf '   https://%s  ' "$WWW"; rot "keine Verbindung"
  echo "  (Zertifikat evtl. noch nicht ausgestellt — abwarten)"
else
  printf '   https://%s  ' "$WWW"; gelb "$code"; echo
fi
apex=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "https://$DOMAIN/" 2>/dev/null)
echo "   https://$DOMAIN  → $apex (erwartet 308 oder 301 auf www)"

# ── 4. Inhalt ─────────────────────────────────────────────────────
echo
echo "4) Wer liefert aus, und stimmen die Kopfdaten?"
hdr=$(curl -sI --max-time 15 "https://$WWW/" 2>/dev/null)
srv=$(echo "$hdr" | grep -i '^server:' | head -1 | cut -d' ' -f2- | tr -d '\r')
if echo "$srv" | grep -qi vercel; then
  printf '   Server:     '; gruen "$srv"; echo
elif [ -n "$srv" ]; then
  printf '   Server:     '; gelb "$srv"; echo "  (noch Wix)"
else
  printf '   Server:     '; rot "keine Antwort"; echo
fi

body=$(curl -s --max-time 20 "https://$WWW/" 2>/dev/null)
can=$(echo "$body" | grep -o '<link rel="canonical"[^>]*href="[^"]*"' | grep -o 'href="[^"]*"' | head -1)
rob=$(echo "$body" | grep -o 'name="robots" content="[^"]*"' | head -1)
[ -n "$can" ] && echo "   $can"
[ -n "$rob" ] && echo "   $rob"

echo
echo "──────────────────────────────────────────────────────────────"
if [ "$aufVercel" -eq "${#RESOLVER[@]}" ] && [ "$code" = "200" ] && echo "$srv" | grep -qi vercel; then
  gruen " FERTIG — alle Resolver zeigen auf Vercel, HTTPS liefert Vercel aus."; echo
  echo " Jetzt erst die Wix-Site auf 'Coming Soon'."
  echo " Wix-Abo NICHT kündigen: dort liegen Registrierung UND DNS-Zone."
elif [ "$aufVercel" -eq 0 ]; then
  gelb " Noch nichts umgestellt."; echo
  echo " Bei Weg A (Einträge bei Wix ändern) dauert es max. eine Stunde — TTL 3600."
else
  gelb " Mitten in der Umstellung — $aufVercel von ${#RESOLVER[@]}."; echo
  echo " Kein Ausfall: die einen sehen Wix, die anderen Vercel, beide funktionieren."
fi
echo "──────────────────────────────────────────────────────────────"
