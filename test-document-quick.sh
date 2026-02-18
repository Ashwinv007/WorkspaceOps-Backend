#!/bin/bash

# Comprehensive Document Module Test Suite
# Quick manual tests covering all major functionality

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTk0NTk0OGIwZTQ4Y2I2NDRiYzFlMjAiLCJlbWFpbCI6Im1hbnVhbHRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NzEzMjk4NjQsImV4cCI6MTc3MTQxNjI2NH0.-WOuD2pNHKF_VE9jnKddkTOKmDaDWSzjF_qVWnlzRak"
WORKSPACE_ID="69945948b0e48cb644bc1e24"
DOCTYPE_ID="699459a6b0e48cb644bc1e32"
ENTITY_ID="69945987b0e48cb644bc1e2c"
BASE_URL="http://localhost:4000"

echo "==================================="
echo "Document Module Comprehensive Tests"
echo "==================================="
echo ""

# Test 1: Upload with VALID expiry (60 days)
echo "Test 1: Upload document with VALID expiry status"
EXPIRY_VALID=$(date -d "+60 days" +%Y-%m-%d)
DOC1_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload.txt" \
  -F "documentTypeId=$DOCTYPE_ID" \
  -F 'metadata={"passportNumber":"VALID001","expiryDate":"2030-01-01"}' \
  -F "expiryDate=$EXPIRY_VALID")
echo "$DOC1_RESPONSE" | jq '{id:.id,fileName:.fileName,expiryStatus:.expiryStatus}'
DOC1_ID=$(echo "$DOC1_RESPONSE" | jq -r '.id')
echo ""

# Test 2: Upload with EXPIRING status (15 days)
echo "Test 2: Upload document with EXPIRING status"
EXPIRY_EXPIRING=$(date -d "+15 days" +%Y-%m-%d)
DOC2_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload.txt" \
  -F "documentTypeId=$DOCTYPE_ID" \
  -F "entityId=$ENTITY_ID" \
  -F 'metadata={"passportNumber":"EXPIRING002","expiryDate":"2025-04-01"}' \
  -F "expiryDate=$EXPIRY_EXPIRING")
echo "$DOC2_RESPONSE" | jq '{id:.id,expiryStatus:.expiryStatus,entityId:.entityId}'
DOC2_ID=$(echo "$DOC2_RESPONSE" | jq -r '.id')
echo ""

# Test 3: Upload with EXPIRED status
echo "Test 3: Upload document with EXPIRED status"
EXPIRY_EXPIRED=$(date -d "-10 days" +%Y-%m-%d)
 DOC3_RESPONSE=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/tmp/test-upload.txt" \
  -F "documentTypeId=$DOCTYPE_ID" \
  -F 'metadata={"passportNumber":"EXPIRED003","expiryDate":"2020-01-01"}' \
  -F "expiryDate=$EXPIRY_EXPIRED")
echo "$DOC3_RESPONSE" | jq '{id:.id,expiryStatus:.expiryStatus,expiryDate:.expiryDate}'
DOC3_ID=$(echo "$DOC3_RESPONSE" | jq -r '.id')
echo ""

# Test 4: Get all documents
echo "Test 4: Get all documents"
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
  -H "Authorization: Bearer $TOKEN" | jq '{count:.count,first3Statuses:[.documents[0:3][].expiryStatus]}'
echo ""

# Test 5: Get expiring documents
echo "Test 5: Get expiring documents (within 30 days)"
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/expiring" \
  -H "Authorization: Bearer $TOKEN" | jq '{count:.count,ids:[.documents[].id]}'
echo ""

# Test 6: Get documents by entity
echo "Test 6: Get documents by entity"
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/entities/$ENTITY_ID/documents" \
  -H "Authorization: Bearer $TOKEN" | jq '{count:.count,entityIds:[.documents[].entityId]}'
echo ""

# Test 7: Get single document
echo "Test 7: Get single document by ID"
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC1_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '{id:.id,fileName:.fileName,metadata:.metadata}'
echo ""

# Test 8: Update document metadata
echo "Test 8: Update document metadata"
curl -s -X PUT "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC1_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metadata":{"passportNumber":"UPDATED999","expiryDate":"2035-12-31"}}' | jq '{id:.id,metadata:.metadata}'
echo ""

# Test 9: Download document
echo "Test 9: Download document file"
curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC1_ID/download" \
  -H "Authorization: Bearer $TOKEN" | head -c 50
echo "... (file content)"
echo ""

# Test 10: RBAC - Unauthorized access
echo "Test 10: RBAC - Unauthorized access (should fail with 401)"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents" | tail -2
echo ""

# Test 11: Delete document
echo "Test 11: Delete document"
curl -s -w "HTTP Status: %{http_code}\n" -X DELETE "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC3_ID" \
  -H "Authorization: Bearer $TOKEN"
echo ""

# Test 12: Verify deleted
echo "Test 12: Verify document was deleted (should return 404)"
curl -s -w "\nHTTP Status: %{http_code}\n" -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/documents/$DOC3_ID" \
  -H "Authorization: Bearer $TOKEN" | tail -2
echo ""

# Summary
echo "==================================="
echo "Test Execution Complete"
echo "==================================="
echo ""
echo "Uploaded Documents:"
echo "  - DOC1 (VALID): $DOC1_ID"
echo "  - DOC2 (EXPIRING): $DOC2_ID"
echo "  - DOC3 (EXPIRED - deleted): $DOC3_ID"
echo ""
echo "Check uploads/ directory for physical files"
ls -lh uploads/$WORKSPACE_ID/ 2>/dev/null | tail -5 || echo "No files found"
