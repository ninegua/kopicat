#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
ERRORS=0

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

# Run a canister call and pipe to idl2json. On error, prints "ERROR" to stdout.
# Usage: call_canister <canister> <method> [args...] [--query]
call_canister() {
  local canister="$1"; shift
  local method="$1"; shift
  local query_flag=""

  if [[ "$1" == "--query" ]]; then
    query_flag="--query"
    shift
  fi

  local args_str="$1"; shift

  local raw
  raw=$(icp canister call "$canister" "$method" "$args_str" $query_flag 2>/dev/null) || {
    echo "ERROR"
    return
  }

  local json
  json=$(echo "$raw" | idl2json 2>/dev/null) || {
    echo "ERROR"
    return
  }

  echo "$json"
}

# ── Deploy the latest backend ───────────────────────────────────────
echo "=== Deploying backend ==="
if ! icp deploy backend -y 2>&1; then
  echo "FATAL: Deployment failed"
  exit 1
fi
echo ""

# ── Test 1: create_clip (basic success) ─────────────────────────────
echo "=== Test 1: create_clip (basic) ==="
CLIPBOARD="test-clipboard-001"
BLOB="encrypted-blob-data-here"

JSON=$(call_canister backend create_clip "(\"$BLOB\", \"$CLIPBOARD\", null, false)")
if [ "$JSON" = "ERROR" ]; then
  error "create_clip returned an error"
else
  check_ok=$(echo "$JSON" | jq -r '.ok // empty')
  if [ "$check_ok" = "test-clipboard-001" ]; then
    pass "create_clip returns #ok with correct clipboard string"
  else
    fail "create_clip returns #ok with clipboard string (got: $JSON)"
  fi
fi
echo ""

# ── Test 2: create_clip (duplicate rejection) ───────────────────────
echo "=== Test 2: create_clip (duplicate) ==="
JSON=$(call_canister backend create_clip "(\"$BLOB\", \"$CLIPBOARD\", null, false)")
if [ "$JSON" = "ERROR" ]; then
  error "create_clip duplicate returned an error"
else
  check_err=$(echo "$JSON" | jq -r '.err // empty')
  if [ "$check_err" = "clipboard already exists" ]; then
    pass "create_clip rejects duplicate clipboard"
  else
    fail "create_clip rejects duplicate clipboard (got: $JSON)"
  fi
fi
echo ""

# ── Test 3: get_clip (basic, no expiry) ─────────────────────────────
echo "=== Test 3: get_clip (basic) ==="
JSON=$(call_canister backend get_clip "(\"$CLIPBOARD\")" --query)
if [ "$JSON" = "ERROR" ]; then
  error "get_clip returned an error"
else
  check_result=$(echo "$JSON" | jq '[.[] | select(.clipboard == "test-clipboard-001" and .blob == "encrypted-blob-data-here" and .burn_after_read == false and .expires_at == null)] | length == 1')
  if [ "$check_result" = "true" ]; then
    pass "get_clip returns correct clip record"
  else
    fail "get_clip returns correct clip record (got: $JSON)"
  fi

  # Check created_at is a non-empty string (BigInt as string)
  check_result=$(echo "$JSON" | jq '.[0].created_at | type == "string" and length > 0')
  if [ "$check_result" = "true" ]; then
    pass "get_clip created_at is a non-empty string"
  else
    fail "get_clip created_at is a non-empty string (got: $JSON)"
  fi
fi
echo ""

# ── Test 4: create_clip with expiry ─────────────────────────────────
echo "=== Test 4: create_clip with expiry ==="
CLIPBOARD2="test-clipboard-002"
BLOB2="encrypted-blob-data-002"

JSON=$(call_canister backend create_clip "(\"$BLOB2\", \"$CLIPBOARD2\", opt 86400, false)")
if [ "$JSON" = "ERROR" ]; then
  error "create_clip with expiry returned an error"
else
  check_ok=$(echo "$JSON" | jq -r '.ok // empty')
  if [ "$check_ok" = "test-clipboard-002" ]; then
    pass "create_clip with expiry returns #ok with clipboard string"
  else
    fail "create_clip with expiry returns #ok (got: $JSON)"
  fi
fi
echo ""

# ── Test 5: get_clip with expiry ────────────────────────────────────
echo "=== Test 5: get_clip with expiry ==="
JSON=$(call_canister backend get_clip "(\"$CLIPBOARD2\")" --query)
if [ "$JSON" = "ERROR" ]; then
  error "get_clip with expiry returned an error"
else
  check_result=$(echo "$JSON" | jq '[.[] | select(.clipboard == "test-clipboard-002" and .blob == "encrypted-blob-data-002" and (.expires_at | type == "array") and (.expires_at | length > 0))] | length == 1')
  if [ "$check_result" = "true" ]; then
    pass "get_clip returns clip with expires_at as non-empty array"
  else
    fail "get_clip returns clip with expires_at (got: $JSON)"
  fi
fi
echo ""

# ── Test 6: get_clip for non-existent clip ──────────────────────────
echo "=== Test 6: get_clip (non-existent) ==="
JSON=$(call_canister backend get_clip "(\"does-not-exist-xyz\")" --query)
if [ "$JSON" = "null" ]; then
  pass "get_clip returns null for non-existent clip"
else
  fail "get_clip returns null for non-existent clip (got: $JSON)"
fi
echo ""

# ── Test 7: delete_clip ─────────────────────────────────────────────
echo "=== Test 7: delete_clip ==="
JSON=$(call_canister backend delete_clip "(\"$CLIPBOARD\")")
if [ "$JSON" = "ERROR" ]; then
  error "delete_clip returned an error"
else
  pass "delete_clip succeeds (unit return)"
fi
echo ""

# ── Test 8: get_clip after deletion ─────────────────────────────────
echo "=== Test 8: get_clip after deletion ==="
JSON=$(call_canister backend get_clip "(\"$CLIPBOARD\")" --query)
if [ "$JSON" = "null" ]; then
  pass "get_clip returns null after deletion"
else
  fail "get_clip returns null after deletion (got: $JSON)"
fi
echo ""

# ── Test 9: create_clip with burn_after_read=true ───────────────────
echo "=== Test 9: create_clip with burn_after_read=true ==="
CLIPBOARD3="test-clipboard-003"
BLOB3="encrypted-blob-003"

JSON=$(call_canister backend create_clip "(\"$BLOB3\", \"$CLIPBOARD3\", opt 300, true)")
if [ "$JSON" = "ERROR" ]; then
  error "create_clip with burn flag returned an error"
else
  check_ok=$(echo "$JSON" | jq -r '.ok // empty')
  if [ "$check_ok" = "test-clipboard-003" ]; then
    pass "create_clip with burn flag returns #ok with clipboard string"
  else
    fail "create_clip with burn flag returns #ok (got: $JSON)"
  fi
fi
echo ""

# ── Test 10: get_clip with burn_after_read=true ─────────────────────
echo "=== Test 10: get_clip (burn_after_read=true) ==="
JSON=$(call_canister backend get_clip "(\"$CLIPBOARD3\")" --query)
if [ "$JSON" = "ERROR" ]; then
  error "get_clip with burn flag returned an error"
else
  check_result=$(echo "$JSON" | jq '[.[] | select(.clipboard == "test-clipboard-003" and .blob == "encrypted-blob-003" and .burn_after_read == true and (.expires_at | type == "array") and (.expires_at | length > 0))] | length == 1')
  if [ "$check_result" = "true" ]; then
    pass "get_clip returns correct clip with burn_after_read=true"
  else
    fail "get_clip returns correct clip with burn flag (got: $JSON)"
  fi
fi
echo ""

# ── Test 11: delete_clip for already-deleted clip (idempotent) ──────
echo "=== Test 11: delete_clip (already deleted) ==="
JSON=$(call_canister backend delete_clip "(\"$CLIPBOARD\")")
if [ "$JSON" = "ERROR" ]; then
  error "delete_clip on non-existent returned an error"
else
  pass "delete_clip on non-existent clip succeeds (unit return)"
fi
echo ""

# ── Test 12: get_clip for expired clip ──────────────────────────────
echo "=== Test 12: get_clip (expired clip) ==="
CLIPBOARD4="test-clipboard-004"
BLOB4="expiring-blob"

JSON=$(call_canister backend create_clip "(\"$BLOB4\", \"$CLIPBOARD4\", opt 1, false)")
if [ "$JSON" = "ERROR" ]; then
  error "create_clip with 1s expiry returned an error"
else
  check_ok=$(echo "$JSON" | jq -r '.ok // empty')
  if [ "$check_ok" = "test-clipboard-004" ]; then
    pass "create_clip with 1s expiry succeeds"
  else
    fail "create_clip with 1s expiry returns #ok (got: $JSON)"
  fi
fi

# Wait for expiry
sleep 2

JSON=$(call_canister backend get_clip "(\"$CLIPBOARD4\")" --query)
if [ "$JSON" = "null" ]; then
  pass "get_clip returns null for expired clip"
else
  fail "get_clip returns null for expired clip (got: $JSON)"
fi
echo ""

# ── Summary ─────────────────────────────────────────────────────────
echo "================================"
echo "Results: $PASS passed, $FAIL failed, $ERRORS errors"
echo "================================"

if [ $FAIL -gt 0 ] || [ $ERRORS -gt 0 ]; then
  exit 1
fi
