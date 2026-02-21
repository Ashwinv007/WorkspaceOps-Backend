# Future Enhancements & Performance Optimizations

**Last Updated:** 2026-02-21
**Source:** Document Module Test Report + Implementation Analysis + Production Issues Analysis

This document tracks planned enhancements, performance optimizations, and technical debt items identified during module implementation and testing.

---

## Production Hardening (Deferred — High Priority)

These items were identified during the 2026-02-21 production issues analysis. The critical items (race conditions, Socket.io for critical events, idempotency, optimistic locking) were implemented. The following were deferred to reduce scope.

### Security: Rate Limiting
**Priority:** P1 — Implement before production launch
**Effort:** Low (< 1 day)

No rate limiting exists on any endpoint. Vulnerability: invite flooding, upload storage exhaustion, audit log DoS.

**Implementation:**
```bash
npm install express-rate-limit
```
```typescript
import rateLimit from 'express-rate-limit';

// Apply to mutation endpoints
const inviteLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const uploadLimiter = rateLimit({ windowMs: 60_000, max: 20 });

router.post('/members', inviteLimiter, authMiddleware, ...);
router.post('/documents', uploadLimiter, authMiddleware, ...);
```

---

### Security: JWT Token Invalidation + Refresh Tokens
**Priority:** P1 — Implement before production launch
**Effort:** Medium (2-3 days)

Current tokens are valid for 24h with no revocation mechanism. A removed workspace member can use their token for up to 24h after removal.

**Implementation Plan:**
1. Redis-based token blacklist: on member removal/role degradation, add token to blacklist with TTL = remaining token lifetime
2. `authMiddleware` checks blacklist before accepting token
3. Add refresh token support: 15-min access token + 7-day refresh token with rotation
4. Add `POST /auth/logout` endpoint to blacklist token immediately

**Dependencies:**
```bash
npm install ioredis @types/ioredis
```

---

### Reliability: Health Check + Graceful Shutdown
**Priority:** P1 — Needed for container deployments
**Effort:** Low (< 1 day)

No SIGTERM handler — Kubernetes/PM2 kills the process mid-request. Already has `/health` route but no graceful shutdown.

**Implementation:**
```typescript
// In server.ts — handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Closing server...');
  server.close(async () => {
    await mongoose.connection.close();
    process.exit(0);
  });
  // Force close after 10s if requests don't finish
  setTimeout(() => process.exit(1), 10_000);
});
```

---

### Performance: Overview Single Aggregation Pipeline
**Priority:** P2
**Effort:** Low (half day)

Current `GetWorkspaceOverview` fires 8 separate queries in parallel via `Promise.all`. The derived `documentValid = total - expiring - expired` calculation can go negative if a document's expiry status changes between the queries. Also inefficient.

**Fix:** Replace with a single `$facet` aggregation pipeline that atomically counts all document statuses in one query.

**File:** `src/modules/overview/application/use-cases/GetWorkspaceOverview.ts`

---

### Reliability: GetLinkedDocuments Phantom Reads
**Priority:** P2
**Effort:** Low (half day)

When a document is deleted just after being linked, `GetLinkedDocuments` fetches the link (exists), then fetches the document (returns null), and silently omits it from results. User sees an incomplete list with no explanation.

**Fix:** Join links and documents in a single aggregation using `$lookup`, so orphaned links are naturally excluded.

**File:** `src/modules/work-item/infrastructure/mongoose/WorkItemDocumentRepositoryImpl.ts`

---

### Reliability: Cascade Delete Race (Work Item)
**Priority:** P2
**Effort:** High (requires replica set transactions — already available on Atlas)

`DeleteWorkItem` first deletes document links, then deletes the work item. If the second step fails, links are orphaned. Also, a concurrent unlink request between the two steps will fail unnecessarily.

**Fix:** Wrap both steps in a MongoDB transaction (same pattern as DocumentType transactions implemented in this session).

**File:** `src/modules/work-item/application/use-cases/DeleteWorkItem.ts`

---

### Real-Time: Deferred Socket.io Events
**Priority:** P3
**Effort:** Low (1 day — infrastructure is already in place)

The Socket.io infrastructure is implemented. These additional events just need to be added to the `AuditAction` → socket event mapping in `AuditLogServiceImpl.ts`:

| Event | Socket Event | Frontend Query Key |
|-------|-------------|-------------------|
| Work item updated | `work-item:updated` | `['work-items', workspaceId]` |
| Overview data changed | `overview:updated` | `['overview', workspaceId]` |
| Audit log created | `audit-log:created` | `['audit-logs', workspaceId]` |
| Document expiry changed | `document:expiry-changed` | `['documents', workspaceId]` |

---

---

## Document Module Enhancements

### Priority 1: Production Readiness

#### 1.1 AWS S3 Integration
**Category:** Infrastructure  
**Effort:** Medium (3-5 days)  
**Status:** Planned

**Current State:**
- Local filesystem storage (`./uploads/`)
- S3-ready URL format: `file:///uploads/{workspaceId}/{documentId}/{filename}`

**Implementation Plan:**
1. Create `S3FileStorageService` implementing `IFileStorageService`
2. Add environment configuration:
   ```env
   STORAGE_TYPE=s3  # or 'local'
   AWS_S3_BUCKET=workspaceops-documents
   AWS_S3_REGION=us-east-1
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   ```
3. Update `document.routes.ts` to use factory pattern for storage service selection
4. Create migration script to move existing local files to S3
5. Update URL format: `https://s3.amazonaws.com/bucket/{workspaceId}/{documentId}/{filename}`

**Benefits:**
- Scalability for production workloads
- CDN integration for faster downloads
- Automatic backups and versioning
- Cost-effective for large files

**Files to Modify:**
- `src/modules/document/infrastructure/storage/S3FileStorageService.ts` (NEW)
- `src/modules/document/infrastructure/storage/StorageServiceFactory.ts` (NEW)
- `src/modules/document/infrastructure/routes/document.routes.ts` (MODIFY)

---

#### 1.2 Virus Scanning Integration
**Category:** Security  
**Effort:** Medium (2-3 days)  
**Status:** Planned

**Current State:**
- No virus scanning on uploaded files
- Security risk for production environments

**Implementation Plan:**
1. Integrate ClamAV or AWS S3 Malware Protection
2. Add virus scan middleware before file storage
3. Quarantine infected files
4. Notify administrators of threats
5. Add virus scan status to document metadata

**Code Example:**
```typescript
// src/modules/document/infrastructure/middleware/virus-scan.middleware.ts
export const virusScanMiddleware = async (req, res, next) => {
  if (req.file) {
    const scanResult = await virusScanService.scan(req.file.buffer);
    if (scanResult.infected) {
      throw new SecurityError('File contains malware');
    }
  }
  next();
};
```

**Files to Create:**
- `src/modules/document/infrastructure/services/VirusScanService.ts`
- `src/modules/document/infrastructure/middleware/virus-scan.middleware.ts`

---

#### 1.3 File Type Validation
**Category:** Security  
**Effort:** Low (1 day)  
**Status:** Planned

**Current State:**
- All file types accepted
- Only MIME type captured, not validated

**Implementation Plan:**
1. Add whitelist/blacklist configuration
2. Validate file extension matches MIME type
3. Implement magic number verification
4. Add per-document-type file restrictions

**Environment Config:**
```env
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,doc,docx,xls,xlsx
BLOCKED_FILE_TYPES=exe,bat,sh,dmg
MAX_FILE_SIZE_MB=10
```

**Files to Modify:**
- `src/modules/document/infrastructure/middleware/upload.middleware.ts`
- `src/modules/document/domain/entities/Document.ts` (add validation)

---

### Priority 2: Performance Optimizations

#### 2.1 Add Pagination to Document Lists
**Category:** Performance  
**Effort:** Low (1 day)  
**Status:** Recommended

**Current State:**
- All documents returned in single query
- No limit, offset, or cursor-based pagination

**Impact:**
- Workspaces with 1000+ documents will have slow response times
- Inefficient memory usage on client and server

**Implementation:**
```typescript
// DTO with pagination
interface DocumentFilters {
  documentTypeId?: string;
  entityId?: string;
  limit?: number;      // default 50
  offset?: number;     // for offset pagination
  cursor?: string;     // for cursor-based pagination
}

// Repository implementation
async findByWorkspace(
  workspaceId: string,
  filters: DocumentFilters
): Promise<{documents: Document[], hasMore: boolean, nextCursor?: string}> {
  const limit = filters.limit || 50;
  const query = { workspaceId, ...buildFilters(filters) };
  
  const documents = await DocumentModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit + 1);  // Fetch one extra to check hasMore
  
  const hasMore = documents.length > limit;
  if (hasMore) documents.pop();
  
  return {
    documents: documents.map(d => this.toDomain(d)),
    hasMore,
    nextCursor: hasMore ? documents[documents.length - 1]._id.toString() : undefined
  };
}
```

**Files to Modify:**
- `src/modules/document/application/dto/DocumentDTO.ts`
- `src/modules/document/infrastructure/mongoose/DocumentRepositoryImpl.ts`
- `src/modules/document/interfaces/http/DocumentController.ts`

---

#### 2.2 Implement Caching for Document Metadata
**Category:** Performance  
**Effort:** Medium (2-3 days)  
**Status:** Recommended

**Current State:**
- Every request hits MongoDB
- Frequently accessed documents queried repeatedly

**Implementation Plan:**
1. Add Redis caching layer
2. Cache document metadata (not file content)
3. Invalidate cache on update/delete
4. Implement cache warming for frequently accessed docs

**Cache Strategy:**
```typescript
// Cache key pattern
const cacheKey = `doc:${workspaceId}:${documentId}`;
const TTL = 3600; // 1 hour

// Get with cache
async getDocumentById(id: string, workspaceId: string): Promise<Document> {
  const cached = await redis.get(`doc:${workspaceId}:${id}`);
  if (cached) return JSON.parse(cached);
  
  const doc = await this.repository.findById(id, workspaceId);
  await redis.setex(`doc:${workspaceId}:${id}`, TTL, JSON.stringify(doc));
  return doc;
}
```

**Dependencies:**
```bash
npm install redis @types/redis
```

**Files to Create:**
- `src/infrastructure/cache/RedisClient.ts`
- `src/modules/document/infrastructure/cache/DocumentCacheService.ts`

---

#### 2.3 Database Query Optimization
**Category:** Performance  
**Effort:** Low (1 day)  
**Status:** Recommended

**Current State:**
- Indexes created on individual fields
- No query performance monitoring

**Optimizations:**
1. Add missing compound indexes for common query patterns:
   ```typescript
   // Most common query: Get documents by workspace + type + expiry
   DocumentSchema.index({ workspaceId: 1, documentTypeId: 1, expiryDate: 1 });
   
   // Search by workspace + entity
   DocumentSchema.index({ workspaceId: 1, entityId: 1, createdAt: -1 });
   ```

2. Add index hints to expensive queries:
   ```typescript
   await DocumentModel.find({ workspaceId, expiryDate: { $gt: now } })
     .hint({ workspaceId: 1, expiryDate: 1 })
     .sort({ expiryDate: 1 });
   ```

3. Implement query performance monitoring:
   ```typescript
   mongoose.set('debug', process.env.NODE_ENV === 'development');
   ```

**Files to Modify:**
- `src/modules/document/infrastructure/mongoose/DocumentModel.ts`

---

### Priority 3: Advanced Features

#### 3.1 Document Versioning
**Category:** Feature  
**Effort:** High (5-7 days)  
**Status:** Future

**Requirements:**
- Track document history when file is re-uploaded
- Store version number, timestamp, and uploaded by
- Allow rollback to previous versions
- Maintain all versions or keep last N versions

**Schema Design:**
```typescript
interface DocumentVersion {
  versionNumber: number;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  changeDescription?: string;
}

// Add to Document entity
versions: DocumentVersion[];
currentVersion: number;
```

**New Endpoints:**
- `GET /documents/:id/versions` - List all versions
- `GET /documents/:id/versions/:version/download` - Download specific version
- `POST /documents/:id/revert/:version` - Revert to version
- `POST /documents/:id/upload-new-version` - Upload new version

**Files to Create:**
- `src/modules/document/domain/entities/DocumentVersion.ts`
- `src/modules/document/application/use-cases/UploadNewVersion.ts`
- `src/modules/document/application/use-cases/GetDocumentVersions.ts`
- `src/modules/document/application/use-cases/RevertToVersion.ts`

---

#### 3.2 OCR for Searchable PDFs
**Category:** Feature  
**Effort:** High (5-7 days)  
**Status:** Future

**Requirements:**
- Extract text from PDFs and images
- Store extracted text in searchable field
- Enable full-text search across documents
- Support multiple languages

**Implementation:**
1. Integrate Tesseract.js or AWS Textract
2. Process PDFs asynchronously in background job
3. Add `extractedText` field to document schema
4. Create full-text search endpoint

**Dependencies:**
```bash
npm install tesseract.js
npm install @aws-sdk/client-textract
```

**Files to Create:**
- `src/modules/document/infrastructure/services/OcrService.ts`
- `src/modules/document/application/use-cases/SearchDocuments.ts`
- `src/jobs/ProcessDocumentOcr.ts` (background job)

---

#### 3.3 Thumbnail Generation for Images
**Category:** Feature  
**Effort:** Medium (3-4 days)  
**Status:** Future

**Requirements:**
- Generate thumbnails for image documents (jpg, png, etc.)
- Multiple sizes (small: 100x100, medium: 300x300, large: 600x600)
- Store thumbnails alongside original
- Return thumbnail URLs in API response

**Implementation:**
```typescript
// Using Sharp library
import sharp from 'sharp';

async generateThumbnails(fileBuffer: Buffer): Promise<{
  small: string;
  medium: string;
  large: string;
}> {
  const sizes = { small: 100, medium: 300, large: 600 };
  const thumbnails = {};
  
  for (const [size, dimension] of Object.entries(sizes)) {
    const thumbnail = await sharp(fileBuffer)
      .resize(dimension, dimension, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    thumbnails[size] = await this.storageService.saveFile(
      workspaceId, 
      `${documentId}/thumb_${size}.jpg`,
      thumbnail
    );
  }
  
  return thumbnails;
}
```

**Dependencies:**
```bash
npm install sharp
```

**Files to Create:**
- `src/modules/document/infrastructure/services/ThumbnailService.ts`

---

#### 3.4 Bulk Operations
**Category:** Feature  
**Effort:** Medium (3-4 days)  
**Status:** Future

**Requirements:**
- Upload multiple files in single request
- Bulk delete documents
- Bulk update metadata
- Progress tracking for long operations

**New Endpoints:**
- `POST /documents/bulk-upload` - Upload multiple files
- `DELETE /documents/bulk-delete` - Delete multiple documents
- `PUT /documents/bulk-update` - Update multiple documents
- `GET /documents/bulk-status/:jobId` - Check bulk operation status

**Implementation:**
```typescript
async bulkUpload(files: Express.Multer.File[], metadata: any[]): Promise<{
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: { total: number; completed: number; failed: number };
}> {
  const jobId = generateJobId();
  
  // Process in background
  this.jobQueue.add('bulk-upload', {
    jobId,
    files,
    metadata
  });
  
  return { jobId, status: 'processing', progress: { total: files.length, completed: 0, failed: 0 } };
}
```

**Files to Create:**
- `src/modules/document/application/use-cases/BulkUpload.ts`
- `src/modules/document/application/use-cases/BulkDelete.ts`
- `src/infrastructure/queues/DocumentQueue.ts`

---

### Priority 4: Monitoring & Operations

#### 4.1 Storage Metrics & Analytics
**Category:** Monitoring  
**Effort:** Medium (2-3 days)  
**Status:** Recommended

**Metrics to Track:**
1. **Storage Usage**
   - Total storage per workspace
   - Growth rate
   - Largest documents
   - Storage by document type

2. **Upload/Download Stats**
   - Upload success/failure rate
   - Average upload time
   - Average download time
   - Peak usage times

3. **Expiry Tracking**
   - Number of expiring documents per workspace
   - Expired documents count
   - Alert history

**Implementation:**
```typescript
// Metrics service
class DocumentMetricsService {
  async getStorageUsage(workspaceId: string): Promise<{
    totalBytes: number;
    documentCount: number;
    byDocumentType: Map<string, number>;
    largestDocuments: Document[];
  }> {
    return {
      totalBytes: await this.calculateTotalStorage(workspaceId),
      documentCount: await this.repository.countByWorkspace(workspaceId),
      byDocumentType: await this.groupByType(workspaceId),
      largestDocuments: await this.findLargest(workspaceId, 10)
    };
  }
}
```

**New Endpoints:**
- `GET /workspaces/:id/documents/metrics` - Get storage metrics
- `GET /workspaces/:id/documents/analytics` - Get usage analytics

**Files to Create:**
- `src/modules/document/application/services/DocumentMetricsService.ts`
- `src/modules/document/interfaces/http/DocumentMetricsController.ts`

---

#### 4.2 Automated Expiry Notifications
**Category:** Operations  
**Effort:** Medium (2-3 days)  
**Status:** Planned (HLR0032 - Currently non-requirement)

**Requirements:**
- Daily cron job to check expiring documents
- Email notifications to workspace admins
- Configurable notification threshold
- Batch notifications to avoid spam

**Implementation:**
```typescript
// Cron job (runs daily at 9 AM)
@Cron('0 9 * * *')
async checkExpiringDocuments() {
  const workspaces = await this.workspaceRepo.findAll();
  
  for (const workspace of workspaces) {
    const expiringDocs = await this.documentRepo.findExpiringDocuments(
      workspace.id,
      30 // 30 days threshold
    );
    
    if (expiringDocs.length > 0) {
      await this.emailService.sendExpiryNotification(
        workspace.adminEmail,
        expiringDocs
      );
    }
  }
}
```

**Dependencies:**
```bash
npm install @nestjs/schedule  # If using NestJS
npm install node-cron         # If using Express
npm install nodemailer        # For emails
```

**Files to Create:**
- `src/jobs/ExpiryNotificationJob.ts`
- `src/modules/document/infrastructure/email/ExpiryEmailTemplate.ts`

---

#### 4.3 Audit Logging for Document Access
**Category:** Security/Compliance  
**Effort:** Low (1-2 days)  
**Status:** Recommended

**Requirements:**
- Log all document access (view, download, update, delete)
- Track who accessed what and when
- Integrate with Audit Log module (HLR0026-0027)
- Support compliance reporting (GDPR, HIPAA, etc.)

**Log Events:**
- `DOCUMENT_UPLOADED`
- `DOCUMENT_VIEWED`
- `DOCUMENT_DOWNLOADED`
- `DOCUMENT_UPDATED`
- `DOCUMENT_DELETED`

**Implementation:**
```typescript
// Middleware to log access
async downloadDocument(req, res, next) {
  const document = await this.getDocumentById(id, workspaceId);
  
  // Log access
  await this.auditLogService.log({
    action: 'DOCUMENT_DOWNLOADED',
    userId: req.user.userId,
    workspaceId,
    resourceId: document.id,
    resourceType: 'DOCUMENT',
    metadata: {
      fileName: document.fileName,
      fileSize: document.fileSize
    }
  });
  
  // ... continue with download
}
```

**Files to Modify:**
- All controller methods to add audit logging
- Integration with Audit Log module

---

## Implementation Priority Matrix

| Enhancement | Impact | Effort | Priority | Timeline |
|-------------|--------|--------|----------|----------|
| AWS S3 Integration | High | Medium | P1 | Q1 2026 |
| Virus Scanning | High | Medium | P1 | Q1 2026 |
| File Type Validation | Medium | Low | P1 | Q1 2026 |
| Pagination | High | Low | P2 | Q1 2026 |
| Caching | High | Medium | P2 | Q2 2026 |
| Query Optimization | Medium | Low | P2 | Q1 2026 |
| Storage Metrics | Medium | Medium | P2 | Q2 2026 |
| Audit Logging | High | Low | P2 | Q1 2026 |
| Document Versioning | Medium | High | P3 | Q3 2026 |
| OCR | Low | High | P3 | Q4 2026 |
| Thumbnails | Low | Medium | P3 | Q3 2026 |
| Bulk Operations | Medium | Medium | P3 | Q3 2026 |
| Expiry Notifications | Low | Medium | P4 | Q2 2026 |

---

## Related Documentation

- [Document Module Implementation Plan](file:///home/ashwin/.gemini/antigravity/brain/b652b70d-300c-409f-8112-e7c4fb027b38/implementation_plan.md)
- [Document Module Test Report](file:///home/ashwin/.gemini/antigravity/brain/b652b70d-300c-409f-8112-e7c4fb027b38/test-report.md)
- [Document Module Walkthrough](file:///home/ashwin/.gemini/antigravity/brain/b652b70d-300c-409f-8112-e7c4fb027b38/walkthrough.md)
- [Project Analysis](file:///home/ashwin/Projects/workspaceops-backend/PLAN/project_analysis.md)

---

**Document Status:** Living Document  
**Owner:** Development Team  
**Review Cycle:** Quarterly
