#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000"
source .env 2>/dev/null

echo "==================================================="
echo "   WORK ITEM MODULE AUTOMATED TEST SUITE"
echo "==================================================="

# Helper function to check for errors
check_error() {
    if echo "$1" | grep -q "\"error\""; then
        echo "❌ Error in response: $1"
        exit 1
    fi
}

# 1. SETUP: Login & Create Prerequisites
echo -e "\n[1] Setting up prerequisites..."

# Login
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RES | jq -r '.data.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "❌ Login failed. Response: $LOGIN_RES"
    exit 1
fi
echo "✅ Logged in as Admin"

# Get User's Workspaces
WORKSPACES_RES=$(curl -s -X GET "$BASE_URL/workspaces" \
  -H "Authorization: Bearer $TOKEN")

WORKSPACE_ID=$(echo $WORKSPACES_RES | jq -r '.data[0].id')
TENANT_ID=$(echo $WORKSPACES_RES | jq -r '.data[0].tenantId')

# If no workspace, try to create one if we have a tenant ID (unlikely if no workspace)
# But for now assume admin has a workspace
if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" == "null" ]; then
    echo "⚠️ No workspace found. Output: $WORKSPACES_RES"
    exit 1
fi
echo "✅ Using Workspace: $WORKSPACE_ID"

# Create Entity (Prerequisite)
ENTITY_RES=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/entities" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Client","role":"CUSTOMER"}')

ENTITY_ID=$(echo $ENTITY_RES | jq -r '.id')
if [ -z "$ENTITY_ID" ] || [ "$ENTITY_ID" == "null" ]; then
    echo "❌ Failed to create entity. Response: $ENTITY_RES"
    exit 1
fi
echo "✅ Created Entity: $ENTITY_ID"

# 2. WORK ITEM TYPE TESTS
echo -e "\n[2] Testing Work Item Types..."

# Create Work Item Type
TYPE_RES=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/work-item-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Bug Report","description":"Product defects","entityType":"CUSTOMER"}')

TYPE_ID=$(echo $TYPE_RES | jq -r '.id')
if [ -z "$TYPE_ID" ] || [ "$TYPE_ID" == "null" ]; then
    echo "❌ Failed to create work item type. Response: $TYPE_RES"
    exit 1
fi
echo "✅ Created Work Item Type: $TYPE_ID"

# List Types
if curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/work-item-types" \
  -H "Authorization: Bearer $TOKEN" | jq -e '.workItemTypes[] | select(.name == "Bug Report")' > /dev/null; then
    echo "✅ Listed Work Item Types"
else
    echo "❌ List failed"
fi

# 3. WORK ITEM TESTS
echo -e "\n[3] Testing Work Items..."

# Create Work Item (Draft)
ITEM_RES=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/work-items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"workItemTypeId\":\"$TYPE_ID\",\"entityId\":\"$ENTITY_ID\",\"title\":\"Fix Login Bug\",\"priority\":\"HIGH\"}")

ITEM_ID=$(echo $ITEM_RES | jq -r '.id')
STATUS=$(echo $ITEM_RES | jq -r '.status')

if [ -z "$ITEM_ID" ] || [ "$ITEM_ID" == "null" ]; then
    echo "❌ Failed to create work item. Response: $ITEM_RES"
    exit 1
fi
echo "✅ Created Work Item: $ITEM_ID"

if [ "$STATUS" == "DRAFT" ]; then
    echo "✅ Status is DRAFT"
else
    echo "❌ Status check failed. Got: $STATUS"
fi

# Update Work Item Fields
UPDATE_RES=$(curl -s -X PUT "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix Login Bug (Updated)","description":"Added details"}')

UPDATE_TITLE=$(echo $UPDATE_RES | jq -r '.title')
if [[ "$UPDATE_TITLE" == *"Updated"* ]]; then
    echo "✅ Updated Fields"
else
    echo "❌ Update failed. Response: $UPDATE_RES"
fi

# 4. LIFECYCLE TRANSITIONS
echo -e "\n[4] Testing Lifecycle Transitions..."

# DRAFT -> ACTIVE
STATUS=$(curl -s -X PATCH "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}' | jq -r '.status')

if [ "$STATUS" == "ACTIVE" ]; then
    echo "✅ DRAFT -> ACTIVE"
else
    echo "❌ Transition failed. Got: $STATUS"
fi

# ACTIVE -> COMPLETED
STATUS=$(curl -s -X PATCH "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}' | jq -r '.status')

if [ "$STATUS" == "COMPLETED" ]; then
    echo "✅ ACTIVE -> COMPLETED"
else
    echo "❌ Transition failed. Got: $STATUS"
fi

# COMPLETED -> ACTIVE (Reopen)
STATUS=$(curl -s -X PATCH "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}' | jq -r '.status')

if [ "$STATUS" == "ACTIVE" ]; then
    echo "✅ COMPLETED -> ACTIVE (Reopen)"
else
    echo "❌ Reopen failed. Got: $STATUS"
fi

# ACTIVE -> DRAFT (Revert)
STATUS=$(curl -s -X PATCH "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"DRAFT"}' | jq -r '.status')

if [ "$STATUS" == "DRAFT" ]; then
    echo "✅ ACTIVE -> DRAFT (Revert)"
else
    echo "❌ Revert failed. Got: $STATUS"
fi

# 5. DOCUMENT LINKING
echo -e "\n[5] Testing Document Linking..."

# Upload a document first
echo "dummy content" > test_doc.txt

# Create Document Type first
DOC_TYPE_RES=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/document-types" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Doc Type","hasExpiry":false}')

DOC_TYPE_ID=$(echo $DOC_TYPE_RES | jq -r '.data.id')

# If creation failed (likely duplicate), try to find it
if [ -z "$DOC_TYPE_ID" ] || [ "$DOC_TYPE_ID" == "null" ]; then
    echo "⚠️ Failed to create doc type (maybe exists?). Response: $DOC_TYPE_RES"
    
    LIST_TYPES_RES=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/document-types" \
      -H "Authorization: Bearer $TOKEN")
      
    DOC_TYPE_ID=$(echo $LIST_TYPES_RES | jq -r '.data[] | select(.name == "Test Doc Type") | .id')
    
    if [ -z "$DOC_TYPE_ID" ] || [ "$DOC_TYPE_ID" == "null" ]; then
        echo "❌ Could not find or create Document Type."
        exit 1
    fi
    echo "✅ Found existing Document Type: $DOC_TYPE_ID"
else
    echo "✅ Created Document Type: $DOC_TYPE_ID"
fi

# Upload Document
DOC_RES=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_doc.txt" \
  -F "metadata={\"documentTypeId\":\"$DOC_TYPE_ID\",\"entityId\":\"$ENTITY_ID\"}")

DOC_ID=$(echo $DOC_RES | jq -r '.id')
rm test_doc.txt

if [ -z "$DOC_ID" ] || [ "$DOC_ID" == "null" ]; then
    echo "❌ Failed to upload document. Response: $DOC_RES"
else
    echo "✅ Created Document: $DOC_ID"
    
    # Link Document
    LINK_RES=$(curl -s -X POST "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/documents" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"documentId\":\"$DOC_ID\"}")

    LINK_ID=$(echo $LINK_RES | jq -r '.id')
    if [ -n "$LINK_ID" ] && [ "$LINK_ID" != "null" ]; then
        echo "✅ Linked Document"
    else
        echo "❌ Link failed. Response: $LINK_RES"
    fi

    # Get Linked Documents
    GET_LINKS_RES=$(curl -s -X GET "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/documents" \
      -H "Authorization: Bearer $TOKEN")

    if echo $GET_LINKS_RES | jq -e ".linkedDocuments[] | select(.documentId == \"$DOC_ID\")" > /dev/null; then
        echo "✅ Verified Linked Document"
    else
        echo "❌ Verify link failed. Response: $GET_LINKS_RES"
    fi

    # Unlink Document
    UNLINK_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID/documents/$DOC_ID" \
      -H "Authorization: Bearer $TOKEN")

    if [ "$UNLINK_CODE" == "204" ]; then
        echo "✅ Unlinked Document"
    else
        echo "❌ Unlink failed. Code: $UNLINK_CODE"
    fi
fi

# 6. CLEANUP
echo -e "\n[6] Cleanup..."

# Delete Work Item
DEL_ITEM_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/workspaces/$WORKSPACE_ID/work-items/$ITEM_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DEL_ITEM_CODE" == "204" ]; then
    echo "✅ Deleted Work Item"
else
    echo "❌ Delete item failed. Code: $DEL_ITEM_CODE"
fi

# Delete Work Item Type
DEL_TYPE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/workspaces/$WORKSPACE_ID/work-item-types/$TYPE_ID" \
  -H "Authorization: Bearer $TOKEN")

if [ "$DEL_TYPE_CODE" == "204" ]; then
    echo "✅ Deleted Work Item Type"
else
    echo "❌ Delete type failed. Code: $DEL_TYPE_CODE"
    # If fail, maybe work items still exist?
    echo "Trying cleanup anyways..."
fi

echo -e "\n==================================================="
echo "   TEST SUITE COMPLETED"
echo "==================================================="
