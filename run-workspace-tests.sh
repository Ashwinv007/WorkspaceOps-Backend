#!/bin/bash

# WorkspaceOps Backend - Comprehensive Workspace API Test Runner
# This script runs all tests from test-workspace.http with proper test data

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Base URL
BASE_URL="http://localhost:4000"

# Test Data from setup-test-data.ts output
OWNER_USER_ID="698b043a724dd80618d67ce7"
OWNER_TENANT_ID="698b043a724dd80618d67ce9"
OWNER_WORKSPACE_ID="698b043a724dd80618d67ceb"
OWNER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiMDQzYTcyNGRkODA2MThkNjdjZTciLCJlbWFpbCI6Im93bmVyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzcwNzE4MjY3LCJleHAiOjE3NzA4MDQ2Njd9.K9CE696E9EB72tQKz5RMHgHQoGP-YbITy0T53vd_now"

ADMIN_USER_ID="698b043b724dd80618d67cef"
ADMIN_TENANT_ID="698b043b724dd80618d67cf1"
ADMIN_WORKSPACE_ID="698b043b724dd80618d67cf3"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiMDQzYjcyNGRkODA2MThkNjdjZWYiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWF0IjoxNzcwNzE4MjY3LCJleHAiOjE3NzA4MDQ2Njd9.F-Lla-2Lq3ja8kefnCuq9x2kyJZ15PUwZaIbJicxqX0"

MEMBER_USER_ID="698b043b724dd80618d67cf7"
MEMBER_TENANT_ID="698b043b724dd80618d67cf9"
MEMBER_WORKSPACE_ID="698b043b724dd80618d67cfb"
MEMBER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiMDQzYjcyNGRkODA2MThkNjdjZjciLCJlbWFpbCI6Im1lbWJlckBleGFtcGxlLmNvbSIsImlhdCI6MTc3MDcxODI2NywiZXhwIjoxNzcwODA0NjY3fQ.ZJ70UkjEp56xeuR5LQmxtVyApd7Esu2PsUftcanitZo"

VIEWER_USER_ID="698b043b724dd80618d67cff"
VIEWER_TENANT_ID="698b043b724dd80618d67d01"
VIEWER_WORKSPACE_ID="698b043b724dd80618d67d03"
VIEWER_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OThiMDQzYjcyNGRkODA2MThkNjdjZmYiLCJlbWFpbCI6InZpZXdlckBleGFtcGxlLmNvbSIsImlhdCI6MTc3MDcxODI2NywiZXhwIjoxNzcwODA0NjY3fQ.RzGG0CNY9V7nYA20Mz3gY46ZnducAhSGYvuXSrfMhs4"

SHARED_WORKSPACE_ID="698b043b724dd80618d67d07"
OWNER_MEMBERSHIP_ID="698b043b724dd80618d67d09"

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to print test header
print_test() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Test $1: $2${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Function to check test result
check_result() {
    local expected_status=$1
    local actual_status=$2
    local test_name=$3
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$actual_status" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Expected HTTP $expected_status, got $actual_status"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ FAIL${NC} - Expected HTTP $expected_status, got $actual_status"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Function to make API call
api_call() {
    curl -s -w "\n__HTTP_STATUS__:%{http_code}" "$@"
}

echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   WorkspaceOps Backend - Workspace API Test Suite     ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"

####################
# Auth Middleware Tests
####################

print_test "1" "Unauthorized access (no token)"
RESPONSE=$(api_call -X GET "$BASE_URL/workspaces" -H "Content-Type: application/json")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 401 "$STATUS" "Unauthorized access"

print_test "2" "Invalid token"
RESPONSE=$(api_call -X GET "$BASE_URL/workspaces" \
    -H "Authorization: Bearer INVALID_TOKEN" \
    -H "Content-Type: application/json")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 401 "$STATUS" "Invalid token"

print_test "3" "Valid token - should work"
RESPONSE=$(api_call -X GET "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 200 "$STATUS" "Valid token"

####################
# Workspace Operations
####################

print_test "4" "Create a new workspace"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$OWNER_TENANT_ID\",\"name\":\"Development Workspace\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")
echo "Response: $RESPONSE_BODY"
check_result 201 "$STATUS" "Create workspace"

print_test "5" "Create another workspace"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$OWNER_TENANT_ID\",\"name\":\"QA Workspace\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 201 "$STATUS" "Create another workspace"

print_test "6" "Get all user workspaces"
RESPONSE=$(api_call -X GET "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 200 "$STATUS" "Get all workspaces"

####################
# Workspace Member Operations
####################

print_test "7" "Invite a user to workspace (MEMBER role)"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces/$SHARED_WORKSPACE_ID/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"invitedUserId\":\"$VIEWER_USER_ID\",\"role\":\"MEMBER\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
RESPONSE_BODY=$(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")
echo "Response: $RESPONSE_BODY"
check_result 201 "$STATUS" "Invite user as MEMBER"

# Extract member ID if successful
if [ "$STATUS" -eq 201 ]; then
    NEW_MEMBER_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "${GREEN}Created member ID: $NEW_MEMBER_ID${NC}"
fi

print_test "8" "Get workspace members"
RESPONSE=$(api_call -X GET "$BASE_URL/workspaces/$SHARED_WORKSPACE_ID/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
# Note: This endpoint might not exist yet, expecting 404 or 200
echo "Status: $STATUS"

####################
# Error Cases
####################

print_test "15" "Create workspace with invalid tenant ID (FIXED)"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"tenantId":"invalid-tenant-id","name":"Test Workspace"}')
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 400 "$STATUS" "Invalid tenant ID"

print_test "16" "Create workspace with missing name"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"tenantId\":\"$OWNER_TENANT_ID\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 400 "$STATUS" "Missing name"

print_test "17" "Invite non-existent user"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces/$SHARED_WORKSPACE_ID/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"invitedUserId":"507f1f77bcf86cd799439011","role":"MEMBER"}')
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 404 "$STATUS" "Non-existent user"

print_test "18" "Invite user with invalid role"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces/$SHARED_WORKSPACE_ID/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"invitedUserId\":\"$VIEWER_USER_ID\",\"role\":\"INVALID_ROLE\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 400 "$STATUS" "Invalid role"

print_test "19" "Invite user who is already a member"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces/$SHARED_WORKSPACE_ID/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"invitedUserId\":\"$ADMIN_USER_ID\",\"role\":\"MEMBER\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 400 "$STATUS" "Already a member"

print_test "20" "Invite with invalid workspace ID"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces/invalid-workspace-id/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"invitedUserId\":\"$VIEWER_USER_ID\",\"role\":\"MEMBER\"}")
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 400 "$STATUS" "Invalid workspace ID"

print_test "21" "Invite with invalid user ID"
RESPONSE=$(api_call -X POST "$BASE_URL/workspaces/$SHARED_WORKSPACE_ID/members" \
    -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"invitedUserId":"invalid-user-id","role":"MEMBER"}')
STATUS=$(echo "$RESPONSE" | grep "__HTTP_STATUS__" | cut -d: -f2)
echo "Response: $(echo "$RESPONSE" | grep -v "__HTTP_STATUS__")"
check_result 400 "$STATUS" "Invalid user ID"

####################
# Test Summary
####################

echo -e "\n${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║                    TEST SUMMARY                        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  $FAILED_TESTS test(s) failed. Please review the output above.${NC}"
    exit 1
fi
