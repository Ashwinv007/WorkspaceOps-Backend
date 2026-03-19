#!/bin/bash

# Document Type Configuration Module - Automated Test Suite
# =========================================================

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

# Document type IDs for testing
PASSPORT_ID=""
LICENSE_ID=""
SIMPLE_ID=""

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
echo "DOCUMENT TYPE CONFIGURATION - TEST SUITE"
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

# Test 1: Create Passport document type
run_test "Create Passport Document Type (with metadata and expiry)" "201" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Passport\",
    \"hasMetadata\": true,
    \"hasExpiry\": true,
    \"fields\": [
      {\"fieldKey\": \"passport_number\", \"fieldType\": \"text\", \"isRequired\": true, \"isExpiryField\": false},
      {\"fieldKey\": \"issue_date\", \"fieldType\": \"date\", \"isRequired\": true, \"isExpiryField\": false},
      {\"fieldKey\": \"expiry_date\", \"fieldType\": \"date\", \"isRequired\": true, \"isExpiryField\": true},
      {\"fieldKey\": \"issuing_country\", \"fieldType\": \"text\", \"isRequired\": true, \"isExpiryField\": false}
    ]
  }'"

# Extract Passport ID from last response
PASSPORT_ID=$(echo "$body" | jq -r '.data.id' 2>/dev/null)
echo "Captured Passport ID: $PASSPORT_ID"

# Test 2: Create Driver's License
run_test "Create Driver's License Document Type" "201" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Drivers License\",
    \"hasMetadata\": true,
    \"hasExpiry\": true,
    \"fields\": [
      {\"fieldKey\": \"license_number\", \"fieldType\": \"text\", \"isRequired\": true, \"isExpiryField\": false},
      {\"fieldKey\": \"expiry_date\", \"fieldType\": \"date\", \"isRequired\": true, \"isExpiryField\": true},
      {\"fieldKey\": \"license_class\", \"fieldType\": \"text\", \"isRequired\": false, \"isExpiryField\": false}
    ]
  }'"

LICENSE_ID=$(echo "$body" | jq -r '.data.id' 2>/dev/null)
echo "Captured License ID: $LICENSE_ID"

# Test 3: Create Simple Document Type
run_test "Create Simple Document Type (no metadata, no expiry)" "201" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"General Document\",
    \"hasMetadata\": false,
    \"hasExpiry\": false,
    \"fields\": []
  }'"

SIMPLE_ID=$(echo "$body" | jq -r '.data.id' 2>/dev/null)
echo "Captured Simple ID: $SIMPLE_ID"

# Test 4: Get All Document Types
run_test "Get All Document Types in Workspace" "200" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 5: Get Specific Document Type by ID
run_test "Get Passport Document Type by ID" "200" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/$PASSPORT_ID' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 6: Update Document Type Name
run_test "Update Document Type Name" "200" \
"curl -s -w '\n%{http_code}' -X PUT '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/$PASSPORT_ID' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{\"name\": \"International Passport\"}'"

# Test 7: Add Field to Document Type
run_test "Add Field to Document Type" "201" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/$PASSPORT_ID/fields' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"fieldKey\": \"nationality\",
    \"fieldType\": \"text\",
    \"isRequired\": false,
    \"isExpiryField\": false
  }'"

# ==========================================
# VALIDATION ERROR TESTS
# ==========================================

echo ""
echo "=========================================="
echo "SECTION 2: VALIDATION ERRORS"
echo "=========================================="

# Test 8: Create without name
run_test "ERROR: Create without name" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"\",
    \"hasMetadata\": false,
    \"hasExpiry\": false,
    \"fields\": []
  }'"

# Test 9: Create with hasExpiry=true but no expiry field
run_test "ERROR: hasExpiry=true without expiry field" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Invalid Document Type\",
    \"hasMetadata\": true,
    \"hasExpiry\": true,
    \"fields\": [
      {\"fieldKey\": \"some_field\", \"fieldType\": \"text\", \"isRequired\": false, \"isExpiryField\": false}
    ]
  }'"

# Test 10: Create with expiry field that is not date type
run_test "ERROR: Expiry field with text type" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Invalid Document Type\",
    \"hasMetadata\": true,
    \"hasExpiry\": true,
    \"fields\": [
      {\"fieldKey\": \"expiry_field\", \"fieldType\": \"text\", \"isRequired\": true, \"isExpiryField\": true}
    ]
  }'"

# Test 11: Create with duplicate field keys
run_test "ERROR: Duplicate field keys" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"Duplicate Fields\",
    \"hasMetadata\": true,
    \"hasExpiry\": false,
    \"fields\": [
      {\"fieldKey\": \"field_name\", \"fieldType\": \"text\", \"isRequired\": false, \"isExpiryField\": false},
      {\"fieldKey\": \"field_name\", \"fieldType\": \"date\", \"isRequired\": false, \"isExpiryField\": false}
    ]
  }'"

# Test 12: Create with hasMetadata=true but no fields
run_test "ERROR: hasMetadata=true without fields" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"name\": \"No Fields Document\",
    \"hasMetadata\": true,
    \"hasExpiry\": false,
    \"fields\": []
  }'"

# Test 13: Add duplicate field
run_test "ERROR: Add duplicate field to existing document type" "400" \
"curl -s -w '\n%{http_code}' -X POST '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/$PASSPORT_ID/fields' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer $TOKEN' \
  -d '{
    \"fieldKey\": \"passport_number\",
    \"fieldType\": \"text\",
    \"isRequired\": false,
    \"isExpiryField\": false
  }'"

# Test 14: Invalid workspace ID format
run_test "ERROR: Invalid workspace ID format" "400" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/invalid-id/document-types' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 15: Invalid document type ID format
run_test "ERROR: Invalid document type ID format" "400" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/invalid-id' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 16: Access without authentication
run_test "ERROR: Access without authentication" "401" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/$WORKSPACE_ID/document-types'"

# ==========================================
# DELETE OPERATION (at the end)
# ==========================================

echo ""
echo "=========================================="
echo "SECTION 3: DELETE OPERATIONS"
echo "=========================================="

# Test 17: Delete Document Type
run_test "Delete Simple Document Type" "204" \
"curl -s -w '\n%{http_code}' -X DELETE '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/$SIMPLE_ID' \
  -H 'Authorization: Bearer $TOKEN'"

# Test 18: Verify deleted document type is gone
run_test "Verify Deleted Document Type Returns 404" "404" \
"curl -s -w '\n%{http_code}' -X GET '$BASE_URL/workspaces/$WORKSPACE_ID/document-types/$SIMPLE_ID' \
  -H 'Authorization: Bearer $TOKEN'"

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
