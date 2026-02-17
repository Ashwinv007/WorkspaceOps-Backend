# WorkspaceOps Backend - Performance Optimization Plan

## Overview

This document outlines performance optimization strategies for the WorkspaceOps backend as the application scales. These optimizations should be implemented **after** MVP launch, based on actual usage patterns and performance metrics.

---

## 1. Caching Strategy for Document Types

### Problem
Document types are frequently accessed but rarely change:
- Every entity creation needs to validate against document type
- Every entity read may need to display document type name
- Document types are workspace-scoped (good for caching)

### Solution: Multi-Layer Caching

#### Layer 1: In-Memory Cache (Node.js)

```typescript
// src/shared/infrastructure/cache/InMemoryCache.ts
import NodeCache from 'node-cache';

export class DocumentTypeCache {
  private cache: NodeCache;
  
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes
      checkperiod: 120, // Check for expired keys every 2 minutes
      useClones: false // Return references (faster)
    });
  }
  
  async get(workspaceId: string): Promise<DocumentType[] | null> {
    return this.cache.get(`workspace:${workspaceId}:doctypes`);
  }
  
  set(workspaceId: string, documentTypes: DocumentType[]): void {
    this.cache.set(`workspace:${workspaceId}:doctypes`, documentTypes);
  }
  
  invalidate(workspaceId: string): void {
    this.cache.del(`workspace:${workspaceId}:doctypes`);
  }
}
```

**Usage in Repository:**
```typescript
class DocumentTypeRepositoryImpl {
  constructor(private cache: DocumentTypeCache) {}
  
  async findByWorkspaceId(workspaceId: string): Promise<DocumentType[]> {
    // Check cache first
    const cached = await this.cache.get(workspaceId);
    if (cached) {
      return cached;
    }
    
    // Cache miss - fetch from database
    const docTypes = await DocumentTypeModel.find({ workspaceId });
    const entities = docTypes.map(doc => this.toDomainDocumentType(doc));
    
    // Store in cache
    this.cache.set(workspaceId, entities);
    
    return entities;
  }
  
  async create(documentType, fields): Promise<DocumentType> {
    const result = await DocumentTypeModel.create(documentType);
    
    // Invalidate cache for this workspace
    this.cache.invalidate(documentType.workspaceId);
    
    return result;
  }
}
```

**Benefits:**
- ✅ 10-100x faster reads (memory vs database)
- ✅ Reduces database load
- ✅ Simple to implement
- ✅ No external dependencies

**Limitations:**
- ⚠️ Cache per server instance (not shared across servers)
- ⚠️ Memory usage grows with workspaces

#### Layer 2: Redis Cache (Distributed)

For multi-server deployments:

```typescript
// src/shared/infrastructure/cache/RedisCache.ts
import Redis from 'ioredis';

export class RedisDocumentTypeCache {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async get(workspaceId: string): Promise<DocumentType[] | null> {
    const data = await this.redis.get(`workspace:${workspaceId}:doctypes`);
    return data ? JSON.parse(data) : null;
  }
  
  async set(workspaceId: string, documentTypes: DocumentType[]): Promise<void> {
    await this.redis.setex(
      `workspace:${workspaceId}:doctypes`,
      600, // 10 minutes TTL
      JSON.stringify(documentTypes)
    );
  }
  
  async invalidate(workspaceId: string): Promise<void> {
    await this.redis.del(`workspace:${workspaceId}:doctypes`);
  }
}
```

**Benefits:**
- ✅ Shared across all server instances
- ✅ Scales horizontally
- ✅ Persistent cache (survives server restarts)

**When to Implement:**
- When running multiple server instances
- When in-memory cache hit rate < 80%
- When database load > 70%

---

## 2. Database Query Optimization

### Current Indexes

```javascript
// document_types
{ workspaceId: 1 }

// document_type_fields  
{ documentTypeId: 1, fieldKey: 1 } // unique
{ documentTypeId: 1 }
```

### Additional Indexes to Consider

#### Compound Index for Filtered Queries

```typescript
// If we frequently query: "Get all document types with expiry in workspace X"
documentTypeSchema.index({ workspaceId: 1, hasExpiry: 1 });

// If we frequently query: "Get all document types with metadata in workspace X"
documentTypeSchema.index({ workspaceId: 1, hasMetadata: 1 });
```

#### Text Index for Search

```typescript
// Enable full-text search on document type names
documentTypeSchema.index({ name: 'text' });

// Usage:
const results = await DocumentTypeModel.find({
  $text: { $search: 'passport driver license' }
});
```

### Query Performance Monitoring

```typescript
// src/shared/infrastructure/monitoring/QueryMonitor.ts
import mongoose from 'mongoose';

export function enableQueryLogging() {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    const duration = Date.now() - query._startTime;
    
    if (duration > 100) { // Log slow queries (>100ms)
      console.warn(`[SLOW QUERY] ${collectionName}.${method}`, {
        duration: `${duration}ms`,
        query: JSON.stringify(query),
        explain: doc
      });
    }
  });
}
```

---

## 3. Denormalization for Read-Heavy Workloads

### Problem
Current architecture requires joining document types and fields:

```typescript
// Current: 2 queries
const docType = await DocumentTypeModel.findById(id);
const fields = await DocumentTypeFieldModel.find({ documentTypeId: id });
```

### Solution: Embed Fields in Document Type

**Option A: Hybrid Approach (Recommended)**

Keep both collections, but cache embedded version:

```typescript
// Cached structure
interface CachedDocumentType {
  id: string;
  workspaceId: string;
  name: string;
  hasMetadata: boolean;
  hasExpiry: boolean;
  fields: DocumentTypeField[]; // Embedded
  _cachedAt: Date;
}

// Repository method
async findByIdWithFieldsCached(id: string): Promise<CachedDocumentType> {
  const cacheKey = `doctype:${id}:full`;
  const cached = await this.cache.get(cacheKey);
  
  if (cached) return cached;
  
  // Fetch and join
  const docType = await DocumentTypeModel.findById(id);
  const fields = await DocumentTypeFieldModel.find({ documentTypeId: id });
  
  const result = {
    ...docType.toObject(),
    fields: fields.map(f => f.toObject()),
    _cachedAt: new Date()
  };
  
  await this.cache.set(cacheKey, result, 600); // 10 min TTL
  return result;
}
```

**Option B: Full Denormalization (For extreme read performance)**

```typescript
// Add embedded fields to DocumentType schema
const documentTypeSchema = new Schema({
  workspaceId: { type: Schema.Types.ObjectId, required: true },
  name: { type: String, required: true },
  hasMetadata: { type: Boolean, default: false },
  hasExpiry: { type: Boolean, default: false },
  
  // Embedded fields
  fields: [{
    fieldKey: String,
    fieldType: String,
    isRequired: Boolean,
    isExpiryField: Boolean
  }]
});

// Keep document_type_fields for normalization
// Sync on every update
```

**Trade-offs:**

| Approach | Read Speed | Write Speed | Storage | Consistency |
|----------|-----------|-------------|---------|-------------|
| Current (Normalized) | Slower (2 queries) | Fast | Efficient | Easy |
| Hybrid (Cache) | Fast (1 query cached) | Fast | Medium | Medium |
| Denormalized | Fastest (1 query) | Slower (2 writes) | Higher | Complex |

**Recommendation:** Start with **Hybrid** approach. Move to full denormalization only if:
- Read:Write ratio > 100:1
- Cache hit rate < 90%
- Response time SLA not met

---

## 4. Connection Pooling Optimization

### Current Configuration

```typescript
// Default Mongoose connection
mongoose.connect(process.env.MONGODB_URI);
```

### Optimized Configuration

```typescript
mongoose.connect(process.env.MONGODB_URI, {
  // Connection pool settings
  maxPoolSize: 50,        // Max connections (default: 100)
  minPoolSize: 10,        // Min connections (default: 0)
  maxIdleTimeMS: 30000,   // Close idle connections after 30s
  
  // Performance settings
  serverSelectionTimeoutMS: 5000,  // Fail fast if no server available
  socketTimeoutMS: 45000,          // Close sockets after 45s of inactivity
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
  
  // Compression
  compressors: ['zlib'],  // Compress network traffic
  zlibCompressionLevel: 6
});
```

### Monitoring Pool Health

```typescript
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
  
  // Monitor pool stats
  setInterval(() => {
    const pool = mongoose.connection.db?.serverConfig?.s?.pool;
    console.log('Connection Pool Stats:', {
      available: pool?.availableConnections,
      inUse: pool?.inUseConnections,
      total: pool?.totalConnections
    });
  }, 60000); // Every minute
});
```

---

## 5. Pagination for Large Result Sets

### Problem
`GET /workspaces/:id/document-types` returns all document types:

```typescript
// Current: Returns all (could be 1000s)
const documentTypes = await DocumentTypeModel.find({ workspaceId });
```

### Solution: Cursor-Based Pagination

```typescript
// Controller
async getDocumentTypes(req: Request, res: Response) {
  const { workspaceId } = req.params;
  const { cursor, limit = 20 } = req.query;
  
  const result = await this.getDocumentTypesUseCase.execute({
    workspaceId,
    cursor: cursor as string,
    limit: parseInt(limit as string)
  });
  
  res.json({
    success: true,
    data: result.documentTypes,
    pagination: {
      nextCursor: result.nextCursor,
      hasMore: result.hasMore
    }
  });
}

// Use Case
async execute(input: GetDocumentTypesInput) {
  const query: any = { workspaceId: input.workspaceId };
  
  if (input.cursor) {
    query._id = { $gt: input.cursor }; // Cursor-based
  }
  
  const documentTypes = await this.repo.findByWorkspaceId(
    query,
    input.limit + 1 // Fetch one extra to check if more exist
  );
  
  const hasMore = documentTypes.length > input.limit;
  const results = hasMore ? documentTypes.slice(0, -1) : documentTypes;
  
  return {
    documentTypes: results,
    nextCursor: hasMore ? results[results.length - 1].id : null,
    hasMore
  };
}
```

**Benefits:**
- ✅ Consistent performance regardless of dataset size
- ✅ No offset/skip (which gets slower with large datasets)
- ✅ Stateless (cursor contains all info needed)

---

## 6. Batch Operations

### Problem
Creating multiple document types requires multiple HTTP requests:

```typescript
// Current: 3 separate requests
await createDocumentType({ name: 'Passport', ... });
await createDocumentType({ name: 'License', ... });
await createDocumentType({ name: 'ID Card', ... });
```

### Solution: Batch Create Endpoint

```typescript
// POST /workspaces/:workspaceId/document-types/batch
async batchCreateDocumentTypes(req: Request, res: Response) {
  const { workspaceId } = req.params;
  const { documentTypes } = req.body; // Array of document types
  
  const results = await this.batchCreateUseCase.execute({
    workspaceId,
    documentTypes
  });
  
  res.status(201).json({
    success: true,
    data: {
      created: results.length,
      documentTypes: results
    }
  });
}

// Use Case with parallel processing
async execute(input: BatchCreateInput) {
  const results = await Promise.all(
    input.documentTypes.map(dto =>
      this.createDocumentTypeUseCase.execute({
        workspaceId: input.workspaceId,
        ...dto
      })
    )
  );
  
  return results;
}
```

**Benefits:**
- ✅ Reduces HTTP overhead
- ✅ Faster for bulk imports
- ✅ Atomic batch (all succeed or all fail with transactions)

---

## 7. Database Read Replicas

For production with high read load:

```typescript
// Primary for writes
const primaryConnection = mongoose.createConnection(MONGODB_PRIMARY_URI);

// Read replica for reads
const replicaConnection = mongoose.createConnection(MONGODB_REPLICA_URI, {
  readPreference: 'secondaryPreferred' // Prefer secondary nodes
});

// Repository
class DocumentTypeRepositoryImpl {
  async findByWorkspaceId(workspaceId: string) {
    // Use read replica
    return replicaConnection.model('DocumentType').find({ workspaceId });
  }
  
  async create(documentType, fields) {
    // Use primary
    return primaryConnection.model('DocumentType').create(documentType);
  }
}
```

---

## Implementation Priority

| Optimization | Complexity | Impact | When to Implement |
|--------------|-----------|--------|-------------------|
| 1. In-Memory Cache | Low | High | After 100 workspaces |
| 2. Query Indexes | Low | Medium | After 1000 document types |
| 3. Connection Pool | Low | Medium | Immediately (low risk) |
| 4. Pagination | Medium | High | After 50 document types per workspace |
| 5. Redis Cache | Medium | High | After 10 server instances |
| 6. Batch Operations | Medium | Medium | When users request it |
| 7. Denormalization | High | High | After cache hit rate < 90% |
| 8. Read Replicas | High | High | After database CPU > 70% |

---

## Monitoring & Metrics

### Key Metrics to Track

```typescript
// src/shared/infrastructure/monitoring/PerformanceMonitor.ts
export class PerformanceMonitor {
  // Response time
  trackResponseTime(endpoint: string, duration: number) {
    // Log to monitoring service (e.g., Datadog, New Relic)
  }
  
  // Cache hit rate
  trackCacheHit(cacheType: string, hit: boolean) {
    // Calculate hit rate percentage
  }
  
  // Database query time
  trackQueryTime(collection: string, operation: string, duration: number) {
    // Alert if > threshold
  }
  
  // Connection pool usage
  trackPoolUsage(available: number, inUse: number, total: number) {
    // Alert if utilization > 80%
  }
}
```

### Performance SLAs

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (p95) | < 200ms | > 500ms |
| Database Query Time (p95) | < 50ms | > 200ms |
| Cache Hit Rate | > 90% | < 80% |
| Connection Pool Utilization | < 70% | > 85% |

---

## Conclusion

These optimizations should be implemented **incrementally** based on actual performance data. Start with low-complexity, high-impact optimizations (caching, indexes) and progress to more complex solutions (denormalization, read replicas) only when metrics justify the effort.

**Next Steps:**
1. Set up performance monitoring
2. Collect baseline metrics for 1 month
3. Identify bottlenecks from real usage patterns
4. Implement optimizations in priority order
5. Measure impact and iterate
