-- =====================================================
-- WorkspaceOps MVP - SQL Schema
-- =====================================================

-- ======================
-- TENANT & WORKSPACE
-- ======================

CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- USERS & RBAC
-- ======================

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_users (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) NOT NULL CHECK (
    role IN ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER')
  ),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (workspace_id, user_id)
);

-- ======================
-- ENTITIES
-- ======================

CREATE TABLE entities (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (
    role IN ('SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR')
  ),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================
-- DOCUMENT CONFIGURATION
-- ======================

CREATE TABLE document_types (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  has_metadata BOOLEAN DEFAULT FALSE,
  has_expiry BOOLEAN DEFAULT FALSE
);

CREATE TABLE document_type_fields (
  id UUID PRIMARY KEY,
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  field_key VARCHAR(100) NOT NULL,
  field_type VARCHAR(20) NOT NULL CHECK (
    field_type IN ('text', 'date')
  ),
  is_required BOOLEAN DEFAULT FALSE,
  is_expiry_field BOOLEAN DEFAULT FALSE
);

-- ======================
-- DOCUMENTS
-- ======================

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  document_type_id UUID NOT NULL REFERENCES document_types(id),
  entity_id UUID REFERENCES entities(id),
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE document_metadata (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  field_key VARCHAR(100) NOT NULL,
  field_value TEXT
);

-- ======================
-- WORK ITEMS
-- ======================

CREATE TABLE work_item_types (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(20) CHECK (
    entity_type IN ('SELF', 'CUSTOMER', 'EMPLOYEE', 'VENDOR')
  ),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_items (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  work_item_type_id UUID NOT NULL REFERENCES work_item_types(id),
  entity_id UUID NOT NULL REFERENCES entities(id),
  assigned_to_user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL CHECK (
    status IN ('DRAFT', 'ACTIVE', 'COMPLETED')
  ),
  priority VARCHAR(20) CHECK (
    priority IN ('LOW', 'MEDIUM', 'HIGH')
  ),
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_item_documents (
  id UUID PRIMARY KEY,
  work_item_id UUID NOT NULL REFERENCES work_items(id),
  document_id UUID NOT NULL REFERENCES documents(id),
  linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (work_item_id, document_id)
);

-- ======================
-- AUDIT LOGS
-- ======================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
