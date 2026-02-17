#!/bin/bash

# Entity Module - Automated Test Suite
# =========================================================

# Use the same token and workspace ID from previous tests or update manually
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkyZWE3ZTA5YjljNTIyM2QyN2E0MGEiLCJlbWFpbCI6ImRvY3R5cGUtdGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTc3MTIzNTk2NiwiZXhwIjoxNzcxMzIyMzY2fQ.C5zVCqsQa7NbOUkl_BdsxvRf3PLqMYxIfmmzmpMowgs"
WORKSPACE_ID="6992ea7e09b9c5223d27a40e"
BASE_URL="http://localhost:4000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Entity IDs for testing
ENTITY_ID=""

# Function to run a test
run_test() {
    local test_name="$1"
    local expected_status="$2"
    local curl_cmd="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
    echo "=========================================="
    echo "TEST $TOTAL_TESTS: $test_name"
    echo "=========================================="
    
    response=$(eval "$curl_cmd")
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    echo "Response Status: $status_code"
    echo "Response Body: $body" | jq '.' 2>/dev/null || echo "$body"
    
    if [[ "$status_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ PASS${NC}: Status code matches expected ($expected_status)"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo "$body"
    else
        echo -e "${RED}❌ FAIL${NC}: Expected $expected_status, got $status_code"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo ""
    fi
}

echo "=========================================="
echo "ENTITY MODULE - TEST SUITE"
echo "=========================================="
echo "Start Time: $(date)"
echo "Base URL: $BASE_URL"
echo "Workspace ID: $WORKSPACE_ID"
echo ""

# ==========================================
# CRUD OPERATIONS TESTS
# ==========================================

echo ""
echo "=========================================="
echo "SECTION 1: CRUD OPERATIONS"
echo "=========================================="

# Test 1: Create Entity (SELF)
run_test "Create Entity - SELF" "201" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/entities' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"My Company\",
    \"role\": \"SELF\"
  }'"

# Extract Entity ID from last response
# The response format is { "id": "...", ... } not { "data": { "id": "..." } } based on the output
ENTITY_ID=$(echo "$body" | jq -r '.id' 2>/dev/null)
echo "Captured Entity ID: $ENTITY_ID"

# Test 2: Create Entity (CUSTOMER)
run_test "Create Entity - CUSTOMER" "201" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/entities' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Acme Corp\",
    \"role\": \"CUSTOMER\"
  }'"

# Test 3: Get All Entities
run_test "Get All Entities in Workspace" "200" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/$WORKSPACE_ID/entities' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 4: Update Entity Name
run_test "Update Entity Name" "200" \
"curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/workspaces/$WORKSPACE_ID/entities/$ENTITY_ID' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{\"name\": \"My Updated Company\"}'"

# Test 5: Update Entity Role
run_test "Update Entity Role" "200" \
"curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/workspaces/$WORKSPACE_ID/entities/$ENTITY_ID' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{\"role\": \"VENDOR\"}'"

# ==========================================
# VALIDATION ERROR TESTS
# ==========================================

echo ""
echo "=========================================="
echo "SECTION 2: VALIDATION ERRORS"
echo "=========================================="

# Test 6: Create without name
run_test "ERROR: Create without name" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/entities' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"  \",
    \"role\": \"CUSTOMER\"
  }'"

# Test 7: Create with invalid role
run_test "ERROR: Create with invalid role" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/entities' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Test Entity\",
    \"role\": \"SUPERHERO\"
  }'"

# Test 8: Invalid workspace ID format
# Returns 403 because RBAC middleware runs before controller validation
run_test "ERROR: Invalid workspace ID format" "403" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/invalid-id/entities' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 9: Update non-existent entity
run_test "ERROR: Update non-existent entity" "400" \
"curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/workspaces/$WORKSPACE_ID/entities/invalid-id' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{\"name\": \"Should Fail\"}'"

# ==========================================
# DELETE OPERATION (at the end)
# ==========================================

echo ""
echo "=========================================="
echo "SECTION 3: DELETE OPERATIONS"
echo "=========================================="

# Test 10: Delete Entity
run_test "Delete Entity" "204" \
"curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/workspaces/$WORKSPACE_ID/entities/$ENTITY_ID' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 11: Verify deleted entity is gone
# Since we don't have GetEntityById, we check GetEntities to confirm it's not there
# Or update it and expect 404
run_test "Verify Deleted Entity (Update should fail)" "404" \
"curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/workspaces/$WORKSPACE_ID/entities/$ENTITY_ID' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{\"name\": \"Zombie Entity\"}'"

# ==========================================
# FINAL SUMMARY
# ==========================================

echo ""
echo "=========================================="
echo "TEST EXECUTION SUMMARY"
echo "=========================================="
echo "End Time: $(date)"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    exit 1
fi
