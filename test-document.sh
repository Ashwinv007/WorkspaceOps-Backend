#!/bin/bash

# Document Module Automated Test Script
# Tests all Document module endpoints and functionality

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:4000"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a TEST_RESULTS

# Function to print test result
print_result() {
    local test_name="$1"
    local status="$2"
    local message="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" = "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓${NC} $test_name"
        TEST_RESULTS+=("PASS: $test_name")
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗${NC} $test_name - $message"
        TEST_RESULTS+=("FAIL: $test_name - $message")
    fi
}

# Function to make HTTP request and extract response
make_request() {
    local method="$1"
    local endpoint="$2"
    local token="$3"
    local data="$4"
    
    if [ -n "$token" ]; then
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Authorization: Bearer $token"
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X "$method" "$BASE_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data"
        else
            curl -s -X "$method" "$BASE_URL$endpoint"
        fi
    fi
}

# Function to upload file
upload_file() {
    local endpoint="$1"
    local token="$2"
    local file_path="$3"
    local doc_type_id="$4"
    local entity_id="$5"
    local metadata="$6"
    local expiry="$7"
    
    local curl_cmd="curl -s -X POST \"$BASE_URL$endpoint\" -H \"Authorization: Bearer $token\""
    curl_cmd="$curl_cmd -F \"file=@$file_path\""
    curl_cmd="$curl_cmd -F \"documentTypeId=$doc_type_id\""
    
    if [ -n "$entity_id" ]; then
        curl_cmd="$curl_cmd -F \"entityId=$entity_id\""
    fi
    
    if [ -n "$metadata" ]; then
        curl_cmd="$curl_cmd -F \"metadata=$metadata\""
    fi
    
    if [ -n "$expiry" ]; then
        curl_cmd="$curl_cmd -F \"expiryDate=$expiry\""
    fi
    
    eval "$curl_cmd"
}

echo "=========================================="
echo "Document Module Test Suite"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}Server is not running!${NC}"
    echo "Please start the server with: npm run dev"
    exit 1
fi
echo -e "${GREEN}Server is running${NC}"
echo ""

# ==========================================
# SETUP: Create test data
# ==========================================
echo "=========================================="
echo "SETUP: Creating Test Data"
echo "=========================================="

# 1. Signup
echo "1. Creating test user..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "doctest@example.com",
        "password": "password123",
        "name": "Doc Test User"
    }')

if echo "$SIGNUP_RESPONSE" | grep -q "token"; then
    TOKEN=$(echo "$SIGNUP_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    USER_ID=$(echo "$SIGNUP_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)
    print_result "User signup" "PASS"
else
    # Try login if user exists
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email": "doctest@example.com", "password": "password123"}')
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
        USER_ID=$(echo "$LOGIN_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)
        print_result "User login" "PASS"
    else
        print_result "User signup/login" "FAIL" "Could not authenticate"
        exit 1
    fi
fi

# 2. Get workspace ID
echo "2. Getting workspace..."
WORKSPACE_RESPONSE=$(make_request "GET" "/workspaces" "$TOKEN")
WORKSPACE_ID=$(echo "$WORKSPACE_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$WORKSPACE_ID" ]; then
    print_result "Get workspace" "PASS"
else
    print_result "Get workspace" "FAIL" "No workspace found"
    exit 1
fi

# 3. Create Document Type with metadata and expiry
echo "3. Creating document type..."
DOCTYPE_RESPONSE=$(make_request "POST" "/workspaces/$WORKSPACE_ID/document-types" "$TOKEN" \
    '{"name":"Test Passport","hasMetadata":true,"hasExpiry":true,"fields":[{"fieldKey":"passportNumber","fieldType":"text","isRequired":true}]}')

DOCTYPE_ID=$(echo "$DOCTYPE_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOCTYPE_ID" ]; then
    print_result "Create document type" "PASS"
else
    print_result "Create document type" "FAIL" "Could not create"
    exit 1
fi

# 4. Create Entity
echo "4. Creating entity..."
ENTITY_RESPONSE=$(make_request "POST" "/workspaces/$WORKSPACE_ID/entities" "$TOKEN" \
    '{"name":"Test Employee","role":"EMPLOYEE"}')

ENTITY_ID=$(echo "$ENTITY_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$ENTITY_ID" ]; then
    print_result "Create entity" "PASS"
else
    print_result "Create entity" "FAIL" "Could not create"
    exit 1
fi

# 5. Create test files
echo "5. Creating test files..."
mkdir -p /tmp/document-tests
echo "This is a simple test document." > /tmp/document-tests/test1.txt
echo "Another test document with more content." > /tmp/document-tests/test2.txt
echo "Expiring document test content." > /tmp/document-tests/expiring.txt
print_result "Create test files" "PASS"

echo ""
echo "Setup complete!"
echo "  - Token: ${TOKEN:0:20}..."
echo "  - Workspace ID: $WORKSPACE_ID"
echo "  - Document Type ID: $DOCTYPE_ID"
echo "  - Entity ID: $ENTITY_ID"
echo ""

# ==========================================
# TEST SUITE: Document Operations
# ==========================================
echo "=========================================="
echo "DOCUMENT UPLOAD TESTS"
echo "=========================================="

# Test 1: Upload simple document
echo "Test 1: Upload simple document..."
UPLOAD1_RESPONSE=$(upload_file "/workspaces/$WORKSPACE_ID/documents" "$TOKEN" \
    "/tmp/document-tests/test1.txt" "$DOCTYPE_ID")

DOC1_ID=$(echo "$UPLOAD1_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOC1_ID" ] && echo "$UPLOAD1_RESPONSE" | grep -q "test1.txt"; then
    print_result "Upload simple document" "PASS"
else
    print_result "Upload simple document" "FAIL" "Upload failed"
fi

# Test 2: Upload document with entity link
echo "Test 2: Upload with entity link..."
UPLOAD2_RESPONSE=$(upload_file "/workspaces/$WORKSPACE_ID/documents" "$TOKEN" \
    "/tmp/document-tests/test2.txt" "$DOCTYPE_ID" "$ENTITY_ID")

DOC2_ID=$(echo "$UPLOAD2_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOC2_ID" ] && echo "$UPLOAD2_RESPONSE" | grep -q "entityId"; then
    print_result "Upload with entity link" "PASS"
else
    print_result "Upload with entity link" "FAIL" "Entity linking failed"
fi

# Test 3: Upload with metadata
echo "Test 3: Upload with metadata..."
UPLOAD3_RESPONSE=$(upload_file "/workspaces/$WORKSPACE_ID/documents" "$TOKEN" \
    "/tmp/document-tests/test1.txt" "$DOCTYPE_ID" "" '{"passportNumber":"A12345678"}')

DOC3_ID=$(echo "$UPLOAD3_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOC3_ID" ] && echo "$UPLOAD3_RESPONSE" | grep -q "passportNumber"; then
    print_result "Upload with metadata" "PASS"
else
    print_result "Upload with metadata" "FAIL" "Metadata upload failed"
fi

# Test 4: Upload with expiry date (60 days from now - VALID)
echo "Test 4: Upload with valid expiry date..."
EXPIRY_VALID=$(date -d "+60 days" +%Y-%m-%d)
UPLOAD4_RESPONSE=$(upload_file "/workspaces/$WORKSPACE_ID/documents" "$TOKEN" \
    "/tmp/document-tests/test1.txt" "$DOCTYPE_ID" "" "" "$EXPIRY_VALID")

DOC4_ID=$(echo "$UPLOAD4_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOC4_ID" ] && echo "$UPLOAD4_RESPONSE" | grep -q "VALID"; then
    print_result "Upload with valid expiry" "PASS"
else
    print_result "Upload with valid expiry" "FAIL" "Expiry status incorrect"
fi

# Test 5: Upload with expiring date (15 days from now - EXPIRING)
echo "Test 5: Upload with expiring date..."
EXPIRY_EXPIRING=$(date -d "+15 days" +%Y-%m-%d)
UPLOAD5_RESPONSE=$(upload_file "/workspaces/$WORKSPACE_ID/documents" "$TOKEN" \
    "/tmp/document-tests/expiring.txt" "$DOCTYPE_ID" "" "" "$EXPIRY_EXPIRING")

DOC5_ID=$(echo "$UPLOAD5_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOC5_ID" ] && echo "$UPLOAD5_RESPONSE" | grep -q "EXPIRING"; then
    print_result "Upload with expiring date" "PASS"
else
    print_result "Upload with expiring date" "FAIL" "Should be EXPIRING status"
fi

# Test 6: Upload with expired date (EXPIRED)
echo "Test 6: Upload with expired date..."
EXPIRY_EXPIRED=$(date -d "-5 days" +%Y-%m-%d)
UPLOAD6_RESPONSE=$(upload_file "/workspaces/$WORKSPACE_ID/documents" "$TOKEN" \
    "/tmp/document-tests/test1.txt" "$DOCTYPE_ID" "" "" "$EXPIRY_EXPIRED")

DOC6_ID=$(echo "$UPLOAD6_RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//' | head -1)

if [ -n "$DOC6_ID" ] && echo "$UPLOAD6_RESPONSE" | grep -q "EXPIRED"; then
    print_result "Upload with expired date" "PASS"
else
    print_result "Upload with expired date" "FAIL" "Should be EXPIRED status"
fi

echo ""
echo "=========================================="
echo "DOCUMENT RETRIEVAL TESTS"
echo "=========================================="

# Test 7: Get all documents
echo "Test 7: Get all documents..."
GET_ALL_RESPONSE=$(make_request "GET" "/workspaces/$WORKSPACE_ID/documents" "$TOKEN")

if echo "$GET_ALL_RESPONSE" | grep -q "\"count\":[0-9]" && [ $(echo "$GET_ALL_RESPONSE" | grep -o "\"id\":\"" | wc -l) -ge 5 ]; then
    print_result "Get all documents" "PASS"
else
    print_result "Get all documents" "FAIL" "Should return multiple documents"
fi

# Test 8: Get specific document
echo "Test 8: Get specific document..."
GET_ONE_RESPONSE=$(make_request "GET" "/workspaces/$WORKSPACE_ID/documents/$DOC1_ID" "$TOKEN")

if echo "$GET_ONE_RESPONSE" | grep -q "test1.txt"; then
    print_result "Get specific document" "PASS"
else
    print_result "Get specific document" "FAIL" "Document not found"
fi

# Test 9: Get documents by entity
echo "Test 9: Get documents by entity..."
GET_BY_ENTITY_RESPONSE=$(make_request "GET" "/workspaces/$WORKSPACE_ID/entities/$ENTITY_ID/documents" "$TOKEN")

if echo "$GET_BY_ENTITY_RESPONSE" | grep -q "$DOC2_ID"; then
    print_result "Get documents by entity" "PASS"
else
    print_result "Get documents by entity" "FAIL" "Entity filter failed"
fi

# Test 10: Get expiring documents
echo "Test 10: Get expiring documents..."
GET_EXPIRING_RESPONSE=$(make_request "GET" "/workspaces/$WORKSPACE_ID/documents/expiring" "$TOKEN")

if echo "$GET_EXPIRING_RESPONSE" | grep -q "$DOC5_ID"; then
    print_result "Get expiring documents" "PASS"
else
    print_result "Get expiring documents" "FAIL" "Should return expiring document"
fi

# Test 11: Filter by document type
echo "Test 11: Filter by document type..."
GET_BY_TYPE_RESPONSE=$(make_request "GET" "/workspaces/$WORKSPACE_ID/documents?documentTypeId=$DOCTYPE_ID" "$TOKEN")

if echo "$GET_BY_TYPE_RESPONSE" | grep -q "\"count\":[0-9]"; then
    print_result "Filter by document type" "PASS"
else
    print_result "Filter by document type" "FAIL" "Type filter failed"
fi

echo ""
echo "=========================================="
echo "DOCUMENT UPDATE TESTS"
echo "=========================================="

# Test 12: Update metadata
echo "Test 12: Update document metadata..."
UPDATE_META_RESPONSE=$(make_request "PUT" "/workspaces/$WORKSPACE_ID/documents/$DOC3_ID" "$TOKEN" \
    '{"metadata":{"passportNumber":"B98765432"}}')

if echo "$UPDATE_META_RESPONSE" | grep -q "B98765432"; then
    print_result "Update metadata" "PASS"
else
    print_result "Update metadata" "FAIL" "Metadata update failed"
fi

# Test 13: Update entity link
echo "Test 13: Update entity link..."
UPDATE_ENTITY_RESPONSE=$(make_request "PUT" "/workspaces/$WORKSPACE_ID/documents/$DOC1_ID" "$TOKEN" \
    "{\"entityId\":\"$ENTITY_ID\"}")

if echo "$UPDATE_ENTITY_RESPONSE" | grep -q "entityId"; then
    print_result "Update entity link" "PASS"
else
    print_result "Update entity link" "FAIL" "Entity update failed"
fi

# Test 14: Update expiry date
echo "Test 14: Update expiry date..."
NEW_EXPIRY=$(date -d "+90 days" +%Y-%m-%d)
UPDATE_EXPIRY_RESPONSE=$(make_request "PUT" "/workspaces/$WORKSPACE_ID/documents/$DOC4_ID" "$TOKEN" \
    "{\"expiryDate\":\"$NEW_EXPIRY\"}")

if echo "$UPDATE_EXPIRY_RESPONSE" | grep -q "$NEW_EXPIRY"; then
    print_result "Update expiry date" "PASS"
else
    print_result "Update expiry date" "FAIL" "Expiry update failed"
fi

echo ""
echo "=========================================="
echo "DOCUMENT DOWNLOAD TEST"
echo "=========================================="

# Test 15: Download document
echo "Test 15: Download document file..."
DOWNLOAD_RESPONSE=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC1_ID/download" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DOWNLOAD_RESPONSE" | grep -q "test document"; then
    print_result "Download document" "PASS"
else
    print_result "Download document" "FAIL" "Download failed or wrong content"
fi

echo ""
echo "=========================================="
echo "ERROR HANDLING TESTS"
echo "=========================================="

# Test 16: Upload without file (should fail)
echo "Test 16: Upload without file..."
NO_FILE_RESPONSE=$(curl -s -w "%{http_code}" -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"documentTypeId\":\"$DOCTYPE_ID\"}")

if echo "$NO_FILE_RESPONSE" | grep -q "400"; then
    print_result "Reject upload without file" "PASS"
else
    print_result "Reject upload without file" "FAIL" "Should return 400"
fi

# Test 17: Get non-existent document (should fail)
echo "Test 17: Get non-existent document..."
NOT_FOUND_RESPONSE=$(curl -s -w "%{http_code}" -X GET \
    "$BASE_URL/workspaces/$WORKSPACE_ID/documents/507f1f77bcf86cd799439011" \
    -H "Authorization: Bearer $TOKEN")

if echo "$NOT_FOUND_RESPONSE" | grep -q "404"; then
    print_result "Return 404 for missing document" "PASS"
else
    print_result "Return 404 for missing document" "FAIL" "Should return 404"
fi

# Test 18: Access without token (should fail)
echo "Test 18: Access without authentication..."
NO_AUTH_RESPONSE=$(curl -s -w "%{http_code}" -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents")

if echo "$NO_AUTH_RESPONSE" | grep -q "401"; then
    print_result "Reject unauthenticated access" "PASS"
else
    print_result "Reject unauthenticated access" "FAIL" "Should return 401"
fi

echo ""
echo "=========================================="
echo "DOCUMENT DELETE TESTS"
echo "=========================================="

# Test 19: Delete document
echo "Test 19: Delete document..."
DELETE_RESPONSE=$(curl -s -w "%{http_code}" -X DELETE \
    "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC6_ID" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESPONSE" | grep -q "204"; then
    print_result "Delete document" "PASS"
else
    print_result "Delete document" "FAIL" "Delete failed"
fi

# Test 20: Verify file deleted
echo "Test 20: Verify file deleted from storage..."
sleep 1
GET_DELETED_RESPONSE=$(curl -s -w "%{http_code}" -X GET \
    "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC6_ID" \
    -H "Authorization: Bearer $TOKEN")

if echo "$GET_DELETED_RESPONSE" | grep -q "404"; then
    print_result "Verify document deleted" "PASS"
else
    print_result "Verify document deleted" "FAIL" "Document still exists"
fi

echo ""
echo "=========================================="
echo "EXPIRY STATUS VALIDATION"
echo "=========================================="

# Test 21: Verify VALID status
echo "Test 21: Verify VALID status calculation..."
if echo "$UPLOAD4_RESPONSE" | grep -q "VALID"; then
    print_result "VALID status for future expiry" "PASS"
else
    print_result "VALID status for future expiry" "FAIL" "Status incorrect"
fi

# Test 22: Verify EXPIRING status
echo "Test 22: Verify EXPIRING status calculation..."
if echo "$UPLOAD5_RESPONSE" | grep -q "EXPIRING"; then
    print_result "EXPIRING status for near expiry" "PASS"
else
    print_result "EXPIRING status for near expiry" "FAIL" "Status incorrect"
fi

# Test 23: Verify EXPIRED status
echo "Test 23: Verify EXPIRED status calculation..."
# Check if it was marked as expired in the upload
EXPIRED_CHECK=$(make_request "GET" "/workspaces/$WORKSPACE_ID/documents" "$TOKEN")
if echo "$EXPIRED_CHECK" | grep -q "EXPIRED"; then
    print_result "EXPIRED status for past expiry" "PASS"
else
    print_result "EXPIRED status for past expiry" "FAIL" "Status incorrect"
fi

echo ""
echo "=========================================="
echo "CLEANUP"
echo "=========================================="

# Clean up test files
rm -rf /tmp/document-tests
print_result "Cleanup test files" "PASS"

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Pass Rate: ${PASS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    echo ""
    echo "Failed tests:"
    for result in "${TEST_RESULTS[@]}"; do
        if [[ $result == FAIL* ]]; then
            echo "  - $result"
        fi
    done
    exit 1
fi
