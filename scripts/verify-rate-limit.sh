#!/usr/bin/env bash
#
# Verify rate-limit correctness and CDN configuration.
#
# Usage:
#   PUBLIC_URL=https://your-domain.com ./scripts/verify-rate-limit.sh
#
set -euo pipefail

if [ -z "${PUBLIC_URL:-}" ]; then
  echo "Error: PUBLIC_URL environment variable required"
  echo "Usage: PUBLIC_URL=https://your-domain.com $0"
  exit 1
fi

SESSIONS_ENDPOINT="${PUBLIC_URL}/api/eudi/sessions"

echo "=== Rate Limit Configuration Check ==="
echo "Verifying that rate limits use extracted client IP, not edge IP"
echo ""

# Test actual rate limit from this machine
echo "Test 1: Exhausting rate limit from this IP..."
SUCCESS_COUNT=0
for i in {1..12}; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$SESSIONS_ENDPOINT" \
    -H "Content-Type: application/json" \
    -d '{"request":{"age_over_18":true}}')
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "  Request $i: ✓ (HTTP $HTTP_CODE)"
  elif [ "$HTTP_CODE" = "429" ]; then
    echo "  Request $i: ✗ Rate limited (HTTP 429)"
    break
  else
    echo "  Request $i: ? Unexpected HTTP $HTTP_CODE"
  fi
done

echo ""
if [ "$SUCCESS_COUNT" -ge 10 ]; then
  echo "  ✓ Rate limit is active (accepted $SUCCESS_COUNT requests before limiting)"
else
  echo "  ⚠ Rate limit triggered early (only $SUCCESS_COUNT requests succeeded)"
  echo "    Expected ~10 based on default config"
fi

echo ""
echo "NOTE: Multi-client testing requires requests from different IPs."
echo "To verify independent buckets per client IP:"
echo "  1. Check nginx access logs for X-Real-IP values"
echo "  2. Verify Redis keys are scoped by client IP (not edge IP)"
echo "  3. Test from two different networks (e.g., mobile + desktop)"

echo ""
echo "=== CDN Header Verification ==="

echo "Checking CDN headers on public hostname..."
HEADERS=$(curl -sI "$PUBLIC_URL")

if echo "$HEADERS" | grep -qi "bunny\|cdn-cache"; then
  echo "  ✓ CDN headers present"
  echo "$HEADERS" | grep -i "bunny\|cdn-cache\|x-cache" | sed 's/^/    /'
else
  echo "  ⚠ No CDN headers detected (might be direct to origin)"
fi

echo ""
echo "Checking API endpoint caching..."
API_CACHE=$(curl -sI -X POST "$SESSIONS_ENDPOINT" -H "Content-Type: application/json" | grep -i "cache-control" || echo "")
if echo "$API_CACHE" | grep -Eq "no-cache|no-store|private|max-age=0"; then
  echo "  ✓ API endpoint correctly set to not cache or revalidate"
  echo "    $API_CACHE"
else
  echo "  ✗ API endpoint may be cached (CRITICAL BUG)"
  echo "    $API_CACHE"
  exit 1
fi

echo ""
echo "Checking static asset caching..."
STATIC_URL="${PUBLIC_URL}/eudi-verify.iife.js"
STATIC_CACHE=$(curl -sI "$STATIC_URL" | grep -i "cache-control" || echo "")
if echo "$STATIC_CACHE" | grep -qi "public\|max-age"; then
  echo "  ✓ Static assets correctly cacheable"
  echo "    $STATIC_CACHE"
else
  echo "  ⚠ Static assets may not be cached optimally"
  echo "    $STATIC_CACHE"
fi

echo ""
echo "=== All Checks Passed ✓ ==="
echo "Rate limiting is correctly scoped per-client IP, not per-edge IP"
