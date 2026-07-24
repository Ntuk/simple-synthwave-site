#!/usr/bin/env bash
#
# Post-deploy smoke test. Hits the live site and fails loudly if a deploy broke
# something. Most of this codebase's server-side behaviour (share.php, the
# sitemap, .htaccess rules) can't be exercised locally, so this is where it
# actually gets checked.
#
#   scripts/smoke.sh                          # tests production
#   scripts/smoke.sh https://staging.example  # or anywhere else
#
set -uo pipefail

BASE="${1:-https://nicotukiainen.com}"
BASE="${BASE%/}"
FAILS=0

ok()  { printf '  \033[32mok  \033[0m %s\n' "$1"; }
bad() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; FAILS=$((FAILS + 1)); }

get()    { curl -sS -L --max-time 25 "$1"; }
code()   { curl -sS -L --max-time 25 -o /dev/null -w '%{http_code}' "$1"; }
heads()  { curl -sS -I -L --max-time 25 "$1" | tr 'A-Z' 'a-z'; }

echo "Smoke testing $BASE"
echo

# --- the app shell loads -----------------------------------------------------
echo "shell"
home="$(get "$BASE/")"
[ "$(code "$BASE/")" = "200" ] && ok "GET / returns 200" || bad "GET / did not return 200"
case "$home" in
  *'<div id="root">'*) ok "/ contains the app root" ;;
  *)                   bad "/ is missing <div id=\"root\">" ;;
esac
case "$home" in
  *'og:image'*) ok "/ carries share metadata" ;;
  *)            bad "/ is missing its Open Graph tags" ;;
esac

# A partial upload leaves index.html pointing at bundles that 404, which renders
# as a completely blank page. Follow every reference and confirm it resolves.
echo
echo "assets"
assets="$(printf '%s' "$home" | grep -oE '/assets/[A-Za-z0-9._-]+\.(js|css)' | sort -u)"
if [ -z "$assets" ]; then
  bad "no /assets/ references found in index.html"
else
  missing=0
  for a in $assets; do
    [ "$(code "$BASE$a")" = "200" ] || { bad "referenced asset is missing: $a"; missing=1; }
  done
  [ "$missing" = "0" ] && ok "all referenced bundles resolve ($(printf '%s\n' "$assets" | wc -l | tr -d ' ') files)"
fi

# --- trip pages go through share.php ----------------------------------------
# These used to be static index.html and effectively could not fail. They now
# depend on PHP, so a broken script takes out every trip page.
echo
echo "trip pages (share.php)"
trip="$BASE/travels/smoke-test-no-such-trip"
trip_code="$(code "$trip")"
if [ "$trip_code" = "200" ]; then
  ok "unknown trip URL still returns 200"
else
  bad "trip URL returned $trip_code (share.php is likely erroring)"
fi
trip_body="$(get "$trip")"
case "$trip_body" in
  *'og:title'*)        ok "trip URL serves share metadata" ;;
  *)                   bad "trip URL is missing og:title" ;;
esac
case "$trip_body" in
  *'<div id="root">'*) ok "trip URL still serves the app shell" ;;
  *)                   bad "trip URL did not serve the app shell" ;;
esac

# --- generated sitemap and robots -------------------------------------------
echo
echo "crawlers"
case "$(get "$BASE/sitemap.xml")" in
  *'<urlset'*) ok "sitemap.xml is a valid urlset" ;;
  *)           bad "sitemap.xml is not returning a urlset" ;;
esac
case "$(get "$BASE/robots.txt")" in
  *'Sitemap:'*) ok "robots.txt points at the sitemap" ;;
  *)            bad "robots.txt is missing or malformed" ;;
esac
[ "$(code "$BASE/og-image.jpg")" = "200" ] && ok "og-image.jpg is reachable" || bad "og-image.jpg is missing"

# --- API ---------------------------------------------------------------------
echo
echo "api"
case "$(get "$BASE/api/trips.php")" in
  '['*) ok "api/trips.php returns a JSON array" ;;
  *)    bad "api/trips.php did not return a JSON array" ;;
esac

admin_code="$(code "$BASE/api/admin.php?action=create")"
if [ "$admin_code" = "401" ]; then
  ok "admin API rejects unauthenticated requests"
else
  bad "admin API returned $admin_code, expected 401"
fi

# If PHP ever stops executing, Apache serves these as plain text and hands out
# the database password. Worth checking every single deploy.
#
# Assert the request actually succeeded before judging the body: an empty
# response is not evidence of safety, it's evidence of no answer.
cfg_code="$(code "$BASE/api/config.php")"
case "$cfg_code" in
  403|404)
    # The server refuses to serve it at all, which is the outcome we want.
    ok "api/config.php is not publicly readable ($cfg_code)"
    ;;
  200)
    # Reachable, so PHP had better have executed it rather than printed it.
    case "$(get "$BASE/api/config.php")" in
      *'DB_PASS'*|*'<?php'*|*'define('*) bad "api/config.php is leaking source" ;;
      *)                                 ok "api/config.php executes without leaking source" ;;
    esac
    ;;
  *)
    bad "api/config.php returned an unexpected $cfg_code"
    ;;
esac

# --- headers -----------------------------------------------------------------
echo
echo "headers"
h="$(heads "$BASE/")"
for want in x-content-type-options x-frame-options referrer-policy; do
  printf '%s' "$h" | grep -q "^$want:" && ok "$want is set" || bad "$want is missing"
done

echo
if [ "$FAILS" -gt 0 ]; then
  printf '\033[31m%s check(s) failed\033[0m\n' "$FAILS"
  exit 1
fi
printf '\033[32mall checks passed\033[0m\n'
