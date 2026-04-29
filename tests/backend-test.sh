#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
ERRORS=0

BASE_URL="http://backend.local.localhost:8000/clip"

pass() {
  echo "  PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "  FAIL: $1"
  FAIL=$((FAIL + 1))
}

error() {
  echo "  ERROR: $1"
  ERRORS=$((ERRORS + 1))
}

# GET a clip and return the HTTP response details
# Usage: http_get <endpoint>
http_get() {
  local url="${BASE_URL}$1"
  curl -s -w "\n%{http_code}" "$url" 2>/dev/null
}

# PUT a clip body and return the HTTP response details
# Usage: http_put <endpoint> <body_json>
http_put() {
  local url="${BASE_URL}$1"
  local body="$2"
  curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "$body" "$url" 2>/dev/null
}

# Check a test: extract body (everything before last line), status code (last line)
# Usage: check_status "response" <expected_status>
check_status() {
  local response="$1"
  local expected="$2"
  local actual
  actual=$(echo "$response" | tail -1)
  if [ "$actual" = "$expected" ]; then
    return 0
  else
    return 1
  fi
}

# Get just the body (strip trailing status code line)
get_body() {
  echo "$1" | sed '$d'
}

# ── Start the ICP network ───────────────────────────────────────
echo "=== Start the ICP network ==="
icp network status || icp network start -d || fail "Cannot start local network"

# ── Deploy the latest backend ───────────────────────────────────────
echo "=== Deploying backend ==="
# Get current backend canister ID to reset it (clears persistent state)
CANISTER_ID_FILE=".icp/cache/mappings/local.ids.json"
if [ -f "$CANISTER_ID_FILE" ]; then
  CANISTER_ID=$(jq -r '.backend // empty' "$CANISTER_ID_FILE" 2>/dev/null || true)
  if [ -n "$CANISTER_ID" ]; then
    echo "Resetting existing backend canister ($CANISTER_ID)..."
    icp canister stop "$CANISTER_ID" 2>/dev/null || true
    icp canister delete "$CANISTER_ID" 2>/dev/null || true
    # Remove mapping file so deploy creates a fresh canister
    rm -f "$CANISTER_ID_FILE"
    sleep 3
  fi
fi
if ! icp deploy backend --mode reinstall -y 2>&1; then
  echo "FATAL: Deployment failed"
  exit 1
fi
echo ""

# ── Test 1: create_clip (basic success) ─────────────────────────────
echo "=== Test 1: create_clip (basic) ==="
CLIPBOARD="test-clipboard-001"
BLOB="encrypted-blob-data-here"

RESP=$(http_put "/$CLIPBOARD" "{\"blob\": \"$BLOB\"}")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  if [ "$BODY" = "\"$CLIPBOARD\"" ]; then
    pass "create_clip returns 200 with clipboard string"
  else
    fail "create_clip returns 200 with clipboard string (got: $BODY)"
  fi
else
  fail "create_clip returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi
echo ""

# ── Test 2: create_clip (duplicate rejection) ───────────────────────
echo "=== Test 2: create_clip (duplicate) ==="
RESP=$(http_put "/$CLIPBOARD" "{\"blob\": \"$BLOB\"}")
BODY=$(get_body "$RESP")
if check_status "$RESP" "403"; then
  pass "create_clip rejects duplicate clipboard with 403"
else
  fail "create_clip should return 403 for duplicate (got: $BODY)"
fi
echo ""

# ── Test 3: get_clip (basic, no expiry) ─────────────────────────────
echo "=== Test 3: get_clip (basic) ==="
RESP=$(http_get "/$CLIPBOARD")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  check_result=$(echo "$BODY" | jq '[. | select(.blob == "encrypted-blob-data-here" and .burn_after_read == false and (.expires_at != null) and (.expires_at | type == "number"))] | length == 1')
  if [ "$check_result" = "true" ]; then
    pass "get_clip returns correct clip record"
  else
    fail "get_clip returns correct clip record (got: $BODY)"
  fi

  # Check created_at is a non-empty string
  check_created_at=$(echo "$BODY" | jq -r '.created_at | type == "number"')
  if [ "$check_created_at" = "true" ]; then
    pass "get_clip created_at is a non-empty number"
  else
    fail "get_clip created_at is a non-empty number (got: $BODY)"
  fi
else
  fail "get_clip returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi
echo ""

# ── Test 4: create_clip with expiry ─────────────────────────────────
echo "=== Test 4: create_clip with expiry ==="
CLIPBOARD2="test-clipboard-002"
BLOB2="encrypted-blob-data-002"

RESP=$(http_put "/$CLIPBOARD2" "{\"blob\": \"$BLOB2\", \"expires_after\": 86400}")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  if [ "$BODY" = "\"$CLIPBOARD2\"" ]; then
    pass "create_clip with expiry returns 200 with clipboard string"
  else
    fail "create_clip with expiry returns 200 (got: $BODY)"
  fi
else
  fail "create_clip with expiry returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi
echo ""

# ── Test 5: get_clip with expiry ────────────────────────────────────
echo "=== Test 5: get_clip with expiry ==="
RESP=$(http_get "/$CLIPBOARD2")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  check_result=$(echo "$BODY" | jq '[. | select(.blob == "encrypted-blob-data-002" and (.expires_at != null) and (.expires_at | type == "number"))] | length == 1')
  if [ "$check_result" = "true" ]; then
    pass "get_clip returns clip with expires field as non-empty string"
  else
    fail "get_clip returns clip with expires (got: $BODY)"
  fi
else
  fail "get_clip returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi
echo ""

# ── Test 6: get_clip for non-existent clip ──────────────────────────
echo "=== Test 6: get_clip (non-existent) ==="
RESP=$(http_get "/does-not-exist-xyz")
BODY=$(get_body "$RESP")
if check_status "$RESP" "404"; then
  pass "get_clip returns 404 for non-existent clip"
else
  fail "get_clip should return 404 for non-existent clip (got: $BODY)"
fi
echo ""

# ── Test 7: create_clip with burn_after_read=true ───────────────────
echo "=== Test 9: create_clip with burn_after_read=true ==="
CLIPBOARD3="test-clipboard-003"
BLOB3="encrypted-blob-003"

RESP=$(http_put "/$CLIPBOARD3" "{\"blob\": \"$BLOB3\", \"expires_after\": 300, \"burn_after_read\": true}")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  if [ "$BODY" = "\"$CLIPBOARD3\"" ]; then
    pass "create_clip with burn flag returns 200 with clipboard string"
  else
    fail "create_clip with burn flag returns 200 (got: $BODY)"
  fi
else
  fail "create_clip with burn flag returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi
echo ""

# ── Test 8: get_clip with burn_after_read=true ──────────────────────
echo "=== Test 8: get_clip (burn_after_read=true) ==="
RESP=$(http_get "/$CLIPBOARD3")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  check_result=$(echo "$BODY" | jq '[. | select(.blob == "encrypted-blob-003" and .burn_after_read == true and (.expires_at != null) and (.expires_at | type == "number"))] | length == 1')
  if [ "$check_result" = "true" ]; then
    pass "get_clip returns correct clip with burn_after_read=true"
  else
    fail "get_clip returns correct clip with burn flag (got: $BODY)"
  fi
else
  fail "get_clip with burn flag returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi

# Second retrieval of burn_after_read clip should return 404
RESP=$(http_get "/$CLIPBOARD3")
BODY=$(get_body "$RESP")
if check_status "$RESP" "404"; then
  pass "get_clip returns 404 for burn_after_read clip on second retrieve"
else
  fail "get_clip should return 404 for burn_after_read clip on second retrieve (got: $BODY)"
fi
echo ""

# ── Test 9: get_clip for expired clip ───────────────────────────────
echo "=== Test 9: get_clip (expired clip) ==="
CLIPBOARD4="test-clipboard-004"
BLOB4="expiring-blob"

RESP=$(http_put "/$CLIPBOARD4" "{\"blob\": \"$BLOB4\", \"expires_after\": 1}")
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  if [ "$BODY" = "\"$CLIPBOARD4\"" ]; then
    pass "create_clip with 1s expiry succeeds with 200"
  else
    fail "create_clip with 1s expiry returns 200 (got: $BODY)"
  fi
else
  fail "create_clip with 1s expiry returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi

# Wait for expiry
sleep 2

RESP=$(http_get "/$CLIPBOARD4")
BODY=$(get_body "$RESP")
if check_status "$RESP" "404"; then
  pass "get_clip returns 404 for expired clip"
else
  fail "get_clip should return 404 for expired clip (got: $BODY)"
fi
echo ""

# ── Test 10: PUT error cases ────────────────────────────────────────
echo "=== Test 10: PUT error cases ==="

# 10a: PUT with no body (empty string)
echo "  -- PUT missing body (empty string) --"
RESP=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "" "http://backend.local.localhost:8000/clip/test-missing-body" 2>/dev/null)
BODY=$(get_body "$RESP")
if check_status "$RESP" "400"; then
  if echo "$BODY" | jq '.' >/dev/null 2>&1; then
    pass "PUT missing body returns 400 with valid JSON"
  else
    fail "PUT missing body returns 400 but body is not valid JSON (got: $BODY)"
  fi
else
  fail "PUT missing body returned status $(echo "$RESP" | tail -1), expected 400 (body: $BODY)"
fi

# 10b: PUT with malformed JSON
echo "  -- PUT malformed JSON body --"
RESP=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d "{not json}" "http://backend.local.localhost:8000/clip/test-malformed" 2>/dev/null)
BODY=$(get_body "$RESP")
if check_status "$RESP" "400"; then
  if echo "$BODY" | jq '.' >/dev/null 2>&1; then
    pass "PUT malformed JSON returns 400 with valid JSON"
  else
    fail "PUT malformed JSON returns 400 but body is not valid JSON (got: $BODY)"
  fi
else
  fail "PUT malformed JSON returned status $(echo "$RESP" | tail -1), expected 400 (body: $BODY)"
fi

# 10c: PUT with malformed input (missing required field 'blob')
echo "  -- PUT malformed input (missing blob) --"
RESP=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d '{"clipboard": "test"}' "http://backend.local.localhost:8000/clip/test-malformed-input" 2>/dev/null)
BODY=$(get_body "$RESP")
if check_status "$RESP" "400"; then
  if echo "$BODY" | jq '.' >/dev/null 2>&1; then
    pass "PUT malformed input returns 400 with valid JSON"
  else
    fail "PUT malformed input returns 400 but body is not valid JSON (got: $BODY)"
  fi
else
  fail "PUT malformed input returned status $(echo "$RESP" | tail -1), expected 400 (body: $BODY)"
fi

# 10d: PUT with malformed input (blob is not a string)
echo "  -- PUT malformed input (blob is number) --"
RESP=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d '{"blob": 12345}' "http://backend.local.localhost:8000/clip/test-blob-type" 2>/dev/null)
BODY=$(get_body "$RESP")
if check_status "$RESP" "400"; then
  if echo "$BODY" | jq '.' >/dev/null 2>&1; then
    pass "PUT blob is not string returns 400 with valid JSON"
  else
    fail "PUT blob is not string returns 400 but body is not valid JSON (got: $BODY)"
  fi
else
  fail "PUT blob is not string returned status $(echo "$RESP" | tail -1), expected 400 (body: $BODY)"
fi

# 10e: PUT with extra unknown fields (should still succeed)
echo "  -- PUT with extra fields (should succeed) --"
RESP=$(curl -s -w "\n%{http_code}" -X PUT -H "Content-Type: application/json" -d '{"blob": "test", "extra": "ignored"}' "http://backend.local.localhost:8000/clip/test-extra-fields" 2>/dev/null)
BODY=$(get_body "$RESP")
if check_status "$RESP" "200"; then
  if echo "$BODY" | jq '.' >/dev/null 2>&1; then
    pass "PUT with extra fields returns 200 with valid JSON"
  else
    fail "PUT extra fields returns 200 but body is not valid JSON (got: $BODY)"
  fi
else
  fail "PUT extra fields returned status $(echo "$RESP" | tail -1), expected 200 (body: $BODY)"
fi
echo ""

# ── Test 11: All success responses are valid JSON ───────────────────
echo "=== Test 11: All success responses are valid JSON ==="

# 11a: PUT success body is valid JSON
echo "  -- PUT success body is valid JSON --"
RESP=$(http_put "/test-json-check-1" '{"blob": "blob1"}')
BODY=$(get_body "$RESP")
if echo "$BODY" | jq '.' >/dev/null 2>&1; then
  pass "PUT success body is valid JSON"
else
  fail "PUT success body is not valid JSON (got: $BODY)"
fi

# 11b: PUT duplicate body is valid JSON
echo "  -- PUT duplicate body is valid JSON --"
RESP=$(http_put "/test-json-check-1" '{"blob": "blob1"}')
BODY=$(get_body "$RESP")
if echo "$BODY" | jq '.' >/dev/null 2>&1; then
  pass "PUT duplicate body is valid JSON"
else
  fail "PUT duplicate body is not valid JSON (got: $BODY)"
fi

# 11c: GET success body is valid JSON
echo "  -- GET success body is valid JSON --"
RESP=$(http_get "/test-json-check-1")
BODY=$(get_body "$RESP")
if echo "$BODY" | jq '.' >/dev/null 2>&1; then
  pass "GET success body is valid JSON"
else
  fail "GET success body is not valid JSON (got: $BODY)"
fi

# 11d: GET success body has correct shape
echo "  -- GET success body has correct shape --"
check_shape=$(echo "$BODY" | jq 'has("blob") and has("created_at") and has("expires_at") and has("burn_after_read")')
if [ "$check_shape" = "true" ]; then
  pass "GET success body has blob, created_at, expires_at, burn_after_read"
else
  fail "GET success body missing required fields (got: $BODY)"
fi

# ── Summary ─────────────────────────────────────────────────────────
echo "================================"
echo "Results: $PASS passed, $FAIL failed, $ERRORS errors"
echo "================================"

if [ $FAIL -gt 0 ] || [ $ERRORS -gt 0 ]; then
  exit 1
fi
