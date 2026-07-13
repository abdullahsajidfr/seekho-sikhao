#!/usr/bin/env bash
# Pushes the server + client env vars from .env.local into Vercel production.
# Idempotent: removes any existing value first, then re-adds. Secrets never printed.
set -euo pipefail
cd "$(dirname "$0")"

set -a; source .env.local; set +a
DB_URL="${FIREBASE_DATABASE_URL:-${VITE_FIREBASE_DATABASE_URL:-}}"

push() {
  local name="$1" val="$2"
  if [ -z "${val:-}" ]; then echo "  SKIP $name (empty)"; return; fi
  npx vercel env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | npx vercel env add "$name" production >/dev/null 2>&1 \
    && echo "  ok  $name" || echo "  FAIL $name"
}

echo "== server vars (API functions) =="
push GEMINI_API_KEY            "${GEMINI_API_KEY:-}"
push UPLIFT_API_KEY            "${UPLIFT_API_KEY:-}"
push UPLIFT_API_KEYS_FALLBACK  "${UPLIFT_API_KEYS_FALLBACK:-}"
push UPLIFT_VOICE_ID           "${UPLIFT_VOICE_ID:-}"
push UPLIFT_TTS_FORMAT         "${UPLIFT_TTS_FORMAT:-}"
push FIREBASE_DATABASE_URL "$DB_URL"

echo "== client vars (wizard console build) =="
for v in VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_DATABASE_URL \
         VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_STORAGE_BUCKET \
         VITE_FIREBASE_MESSAGING_SENDER_ID VITE_FIREBASE_APP_ID; do
  push "$v" "${!v:-}"
done
echo "Done."
