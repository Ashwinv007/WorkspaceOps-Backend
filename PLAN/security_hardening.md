# WorkspaceOps Backend - Security Hardening Plan

## Overview

This document outlines security hardening measures for the WorkspaceOps backend. These should be implemented before production deployment to protect against common attack vectors.

---

## 1. Rate Limiting

### Problem
Without rate limiting, attackers can:
- Brute force authentication
- DoS (Denial of Service) the API
- Scrape data by making unlimited requests
- Exhaust database connections

### Solution: Multi-Layer Rate Limiting

#### Layer 1: Global Rate Limiting

```typescript
// src/common/middleware/rateLimiter.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Global rate limiter - applies to all routes
export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes per IP
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later',
      statusCode: 429
    }
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false
});

// Apply in app.ts
app.use(globalRateLimiter);
```

#### Layer 2: Authentication Rate Limiting

```typescript
// Stricter limits for auth endpoints
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: {
    success: false,
    error: {
      message: 'Too many login attempts, please try again after 15 minutes',
      statusCode: 429
    }
  }
});

// Apply to auth routes
router.post('/auth/login', authRateLimiter, authController.login);
router.post('/auth/signup', authRateLimiter, authController.signup);
```

#### Layer 3: Endpoint-Specific Rate Limiting

```typescript
// Document type creation - prevent spam
export const createDocumentTypeRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:doctype:create:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 document types per minute
  keyGenerator: (req) => {
    // Rate limit per user, not IP
    return req.user?.userId || req.ip;
  },
  message: {
    success: false,
    error: {
      message: 'You are creating document types too quickly. Please slow down.',
      statusCode: 429
    }
  }
});

router.post(
  '/workspaces/:workspaceId/document-types',
  authMiddleware,
  requireAdmin,
  createDocumentTypeRateLimiter, // ← Add rate limiter
  documentTypeController.createDocumentType
);
```

#### Layer 4: User-Specific Rate Limiting

```typescript
// Rate limit per authenticated user
export const userRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:user:'
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per user
  keyGenerator: (req) => req.user?.userId || req.ip,
  skip: (req) => !req.user, // Skip if not authenticated
  message: {
    success: false,
    error: {
      message: 'You are making requests too quickly. Please slow down.',
      statusCode: 429
    }
  }
});

app.use(userRateLimiter);
```

### Rate Limit Configuration Matrix

| Endpoint | Window | Max Requests | Scope |
|----------|--------|--------------|-------|
| Global | 15 min | 1000 | Per IP |
| Auth (login/signup) | 15 min | 5 | Per IP |
| Create Document Type | 1 min | 10 | Per User |
| Update Document Type | 1 min | 20 | Per User |
| Add Field | 1 min | 30 | Per User |
| Delete Document Type | 1 min | 5 | Per User |
| Read Operations | 1 min | 100 | Per User |

---

## 2. Input Sanitization

### Problem
Malicious input can cause:
- NoSQL injection
- XSS (Cross-Site Scripting)
- Path traversal
- Command injection

### Solution: Multi-Layer Validation

#### Layer 1: Schema Validation with Joi

```typescript
// src/common/validation/schemas/documentType.schema.ts
import Joi from 'joi';

export const createDocumentTypeSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(255)
    .pattern(/^[a-zA-Z0-9\s\-_]+$/) // Only alphanumeric, spaces, hyphens, underscores
    .required()
    .messages({
      'string.pattern.base': 'Document type name contains invalid characters',
      'string.max': 'Document type name must not exceed 255 characters'
    }),
  
  hasMetadata: Joi.boolean().default(false),
  hasExpiry: Joi.boolean().default(false),
  
  fields: Joi.array().items(
    Joi.object({
      fieldKey: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .pattern(/^[a-zA-Z0-9_]+$/) // Only alphanumeric and underscores
        .required()
        .messages({
          'string.pattern.base': 'Field key must contain only alphanumeric characters and underscores'
        }),
      
      fieldType: Joi.string()
        .valid('text', 'date')
        .required(),
      
      isRequired: Joi.boolean().default(false),
      isExpiryField: Joi.boolean().default(false)
    })
  ).default([])
});

// Validation middleware
export function validateRequest(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: error.details.map(d => d.message),
          statusCode: 400
        }
      });
    }
    
    req.body = value; // Use sanitized value
    next();
  };
}

// Apply to routes
router.post(
  '/workspaces/:workspaceId/document-types',
  authMiddleware,
  requireAdmin,
  validateRequest(createDocumentTypeSchema), // ← Add validation
  documentTypeController.createDocumentType
);
```

#### Layer 2: NoSQL Injection Prevention

```typescript
// src/common/middleware/sanitize.middleware.ts
import mongoSanitize from 'express-mongo-sanitize';

// Remove $ and . from user input to prevent NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_', // Replace $ and . with _
  onSanitize: ({ req, key }) => {
    console.warn(`Sanitized input: ${key} in ${req.path}`);
  }
}));

// Example attack prevented:
// Before: { "email": { "$gt": "" } } // Returns all users
// After:  { "email": { "_gt": "" } } // Treated as literal string
```

#### Layer 3: XSS Prevention

```typescript
import helmet from 'helmet';
import xss from 'xss-clean';

// Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// Sanitize user input to prevent XSS
app.use(xss());
```

#### Layer 4: Field Key Sanitization

```typescript
// src/common/utils/sanitize.ts
export class InputSanitizer {
  /**
   * Sanitize field key to prevent injection and ensure valid MongoDB field names
   */
  static sanitizeFieldKey(fieldKey: string): string {
    return fieldKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_') // Replace invalid chars with underscore
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .substring(0, 100); // Enforce max length
  }
  
  /**
   * Sanitize document type name
   */
  static sanitizeDocumentTypeName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single
      .replace(/[<>]/g, '') // Remove HTML brackets
      .substring(0, 255); // Enforce max length
  }
}

// Use in use case
const sanitizedFieldKey = InputSanitizer.sanitizeFieldKey(input.fieldKey);
```

---

## 2.5. CSRF (Cross-Site Request Forgery) Protection

### What is CSRF?

**CSRF** is an attack where a malicious website tricks a user's browser into making unwanted requests to a different website where the user is authenticated.

#### How CSRF Attacks Work

**Scenario: Banking Website Attack**

1. **User logs into bank.com:**
   ```
   User → bank.com/login
   Response: Set-Cookie: session=abc123; HttpOnly
   ```
   Browser automatically stores the session cookie.

2. **User visits malicious site (while still logged in to bank):**
   ```html
   <!-- evil.com -->
   <html>
     <body>
       <h1>Click here to win a prize!</h1>
       <form action="https://bank.com/transfer" method="POST" id="hack">
         <input type="hidden" name="to" value="attacker-account">
         <input type="hidden" name="amount" value="10000">
       </form>
       <script>
         document.getElementById('hack').submit(); // Auto-submit
       </script>
     </body>
   </html>
   ```

3. **Browser automatically sends request to bank.com:**
   ```
   POST https://bank.com/transfer
   Cookie: session=abc123  ← Browser automatically includes this!
   
   to=attacker-account&amount=10000
   ```

4. **Bank.com processes the request:**
   - Sees valid session cookie
   - Thinks request is legitimate
   - Transfers $10,000 to attacker
   - **User didn't intend to do this!**

#### Why This Works

The browser **automatically** includes cookies with every request to a domain, even if the request originated from a different site. The bank can't tell if the request came from:
- ✅ Legitimate: User clicking "Transfer" on bank.com
- ❌ Malicious: Evil.com auto-submitting a form

### CSRF Attack Example for WorkspaceOps

**Without CSRF Protection:**

```html
<!-- attacker.com -->
<html>
  <body>
    <h1>Free Workspace Tools!</h1>
    <form action="https://workspaceops.com/workspaces/123/document-types" 
          method="POST" 
          id="attack">
      <input type="hidden" name="name" value="Hacked Document Type">
      <input type="hidden" name="hasMetadata" value="true">
    </form>
    <script>
      // Auto-submit when user visits page
      document.getElementById('attack').submit();
    </script>
  </body>
</html>
```

If user is logged into WorkspaceOps and visits attacker.com:
1. Browser auto-submits form to workspaceops.com
2. Browser includes session cookie automatically
3. WorkspaceOps sees valid session, creates document type
4. User didn't intend to create this!

### Do We Need CSRF Protection?

**Short Answer: NO** ✅

**Why Not?**

Our API uses **JWT tokens in Authorization headers**, not cookies. Here's the key difference:

#### Cookie-Based Authentication (Vulnerable to CSRF)

```typescript
// Login response sets cookie
res.cookie('session', 'abc123', { httpOnly: true });

// Subsequent requests
// Browser AUTOMATICALLY includes cookie
GET /api/data
Cookie: session=abc123  ← Automatic! Even from evil.com
```

**Problem:** Browser sends cookies automatically from ANY site.

#### JWT in Authorization Header (NOT Vulnerable to CSRF)

```typescript
// Login response returns token
res.json({ token: 'eyJhbGciOi...' });

// Client stores token (localStorage, memory, etc.)
localStorage.setItem('token', 'eyJhbGciOi...');

// Subsequent requests
// Client MANUALLY adds token to header
GET /api/data
Authorization: Bearer eyJhbGciOi...  ← Manual! JavaScript required
```

**Protection:** Browsers do NOT automatically include Authorization headers. JavaScript is required to add the header, and JavaScript from evil.com **cannot** access tokens from workspaceops.com (Same-Origin Policy).

### Why JWT-Based APIs Are Safe from CSRF

```javascript
// On workspaceops.com
localStorage.setItem('token', 'my-jwt-token');

// On evil.com - trying to attack
const token = localStorage.getItem('token'); 
// ❌ ERROR: Cannot access localStorage from different origin!

fetch('https://workspaceops.com/api/data', {
  headers: {
    'Authorization': `Bearer ${token}` // token is undefined
  }
});
// ❌ Request fails - no valid token
```

**Same-Origin Policy** prevents evil.com from:
- Reading localStorage from workspaceops.com
- Reading sessionStorage from workspaceops.com
- Accessing cookies marked `HttpOnly` or `SameSite`

### When You WOULD Need CSRF Protection

**Use CSRF tokens if:**

1. **Using Cookie-Based Sessions:**
   ```typescript
   // Login sets cookie
   res.cookie('sessionId', 'abc123', { 
     httpOnly: true,
     secure: true,
     sameSite: 'lax' // Helps but not enough
   });
   ```

2. **Using Traditional Server-Side Rendering:**
   ```html
   <!-- Form on your website -->
   <form action="/transfer" method="POST">
     <input type="hidden" name="_csrf" value="random-token">
     <input name="amount" value="100">
     <button>Transfer</button>
   </form>
   ```

3. **Accepting Requests Without Authorization Headers:**
   ```typescript
   // Vulnerable: relies only on cookies
   app.post('/api/data', (req, res) => {
     const userId = req.session.userId; // From cookie
     // Process request
   });
   ```

### CSRF Protection Methods (If Needed)

If you ever switch to cookie-based auth, here's how to protect:

#### Method 1: CSRF Tokens (Synchronizer Token Pattern)

```typescript
import csrf from 'csurf';

// Setup CSRF protection
const csrfProtection = csrf({ cookie: true });

// Generate token
app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Validate token
app.post('/submit', csrfProtection, (req, res) => {
  // If token invalid, middleware rejects request
  res.send('Success!');
});
```

```html
<!-- Client includes token in form -->
<form method="POST" action="/submit">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <button>Submit</button>
</form>
```

#### Method 2: SameSite Cookie Attribute

```typescript
res.cookie('session', 'abc123', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict' // or 'lax'
});
```

**SameSite Values:**
- `strict`: Cookie NEVER sent from other sites
- `lax`: Cookie sent for top-level navigation (clicking links), not forms
- `none`: Cookie always sent (requires `secure: true`)

#### Method 3: Double Submit Cookie

```typescript
// Set CSRF token in cookie AND require it in header
res.cookie('csrf-token', randomToken, { httpOnly: false });

// Client reads cookie and sends in header
fetch('/api/data', {
  headers: {
    'X-CSRF-Token': getCookie('csrf-token')
  }
});

// Server validates
app.use((req, res, next) => {
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];
  
  if (cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
});
```

### Our Current Architecture (No CSRF Needed)

```typescript
// ✅ Safe from CSRF
app.post('/workspaces/:id/document-types', 
  authMiddleware, // Requires Authorization header with JWT
  requireAdmin,
  controller.createDocumentType
);

// authMiddleware.ts
export async function authMiddleware(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token' });
  }
  
  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  const decoded = jwt.verify(token, JWT_SECRET);
  req.user = decoded;
  next();
}
```

**Why this is safe:**
1. Token is in Authorization header (not cookie)
2. Browser doesn't auto-include Authorization headers
3. Evil.com can't access our token (Same-Origin Policy)
4. Evil.com can't make authenticated requests

### Security Checklist

| Scenario | CSRF Protection Needed? | Our Status |
|----------|------------------------|------------|
| JWT in Authorization header | ❌ No | ✅ We use this |
| JWT in cookie | ✅ Yes | ❌ We don't do this |
| Session ID in cookie | ✅ Yes | ❌ We don't do this |
| OAuth tokens in cookie | ✅ Yes | ❌ We don't do this |
| Server-side rendered forms | ✅ Yes | ❌ We're API-only |

### Interview Talking Points

- "CSRF attacks exploit the browser's automatic cookie inclusion"
- "Our API uses JWT in Authorization headers, which browsers don't auto-include"
- "Same-Origin Policy prevents malicious sites from accessing our tokens"
- "We don't need CSRF protection because we're not using cookie-based authentication"
- "If we ever add cookie-based sessions, we'd implement CSRF tokens or SameSite cookies"

### Additional Security Measures We Already Have

Even though CSRF isn't a concern, we have other protections:

1. **CORS Policy:**
   ```typescript
   app.use(cors({
     origin: ['https://workspaceops.com'], // Only our frontend
     credentials: true
   }));
   ```
   Prevents evil.com from making requests to our API from browser.

2. **Content-Type Validation:**
   ```typescript
   app.use(express.json()); // Only accepts application/json
   ```
   Simple forms can't send JSON (they send form-urlencoded).

3. **Authorization Checks:**
   ```typescript
   // Every endpoint verifies workspace ownership
   if (documentType.workspaceId !== req.user.workspaceId) {
     return res.status(403).json({ error: 'Forbidden' });
   }
   ```

### When to Revisit This Decision

**Add CSRF protection if:**
- You add cookie-based authentication
- You add server-side rendered forms
- You add OAuth with cookies
- You add "remember me" functionality with cookies
- Compliance requires it (PCI-DSS, etc.)

**For now:** ✅ **No CSRF protection needed** - our JWT-in-header approach is inherently safe.

---

## 3. Audit Logging

### Problem
Without audit logs, you can't:
- Track who made changes
- Investigate security incidents
- Comply with regulations (GDPR, SOC2)
- Debug production issues

### Solution: Comprehensive Audit Trail

#### Audit Log Schema

```typescript
// src/shared/domain/entities/AuditLog.ts
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  workspaceId?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  metadata: {
    ip: string;
    userAgent: string;
    method: string;
    path: string;
    statusCode: number;
    duration: number;
  };
}

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  FAILED_LOGIN = 'FAILED_LOGIN'
}

export enum AuditResource {
  USER = 'USER',
  WORKSPACE = 'WORKSPACE',
  DOCUMENT_TYPE = 'DOCUMENT_TYPE',
  DOCUMENT_TYPE_FIELD = 'DOCUMENT_TYPE_FIELD',
  ENTITY = 'ENTITY',
  DOCUMENT = 'DOCUMENT'
}
```

#### Audit Logging Middleware

```typescript
// src/common/middleware/auditLog.middleware.ts
import { AuditLogModel } from '../infrastructure/mongoose/AuditLogModel';

export function auditLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();
  
  // Capture original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  let responseBody: any;
  
  // Intercept response
  res.send = function(data) {
    responseBody = data;
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    responseBody = data;
    return originalJson.call(this, data);
  };
  
  // Log after response is sent
  res.on('finish', async () => {
    const duration = Date.now() - startTime;
    
    // Only log admin operations
    if (shouldAuditLog(req)) {
      try {
        await AuditLogModel.create({
          timestamp: new Date(),
          userId: req.user?.userId,
          userEmail: req.user?.email,
          workspaceId: req.params.workspaceId,
          action: mapMethodToAction(req.method),
          resource: extractResource(req.path),
          resourceId: extractResourceId(req),
          changes: extractChanges(req, responseBody),
          metadata: {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration
          }
        });
      } catch (error) {
        console.error('Failed to create audit log:', error);
        // Don't fail the request if audit logging fails
      }
    }
  });
  
  next();
}

function shouldAuditLog(req: Request): boolean {
  // Only audit authenticated requests
  if (!req.user) return false;
  
  // Only audit write operations
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return false;
  
  // Only audit admin operations
  const adminPaths = ['/document-types', '/workspaces', '/users'];
  return adminPaths.some(path => req.path.includes(path));
}
```

#### Audit Log Queries

```typescript
// src/modules/audit/application/use-cases/GetAuditLogs.ts
export class GetAuditLogs {
  async execute(input: GetAuditLogsInput) {
    const query: any = {};
    
    if (input.workspaceId) {
      query.workspaceId = input.workspaceId;
    }
    
    if (input.userId) {
      query.userId = input.userId;
    }
    
    if (input.resource) {
      query.resource = input.resource;
    }
    
    if (input.action) {
      query.action = input.action;
    }
    
    if (input.startDate || input.endDate) {
      query.timestamp = {};
      if (input.startDate) query.timestamp.$gte = input.startDate;
      if (input.endDate) query.timestamp.$lte = input.endDate;
    }
    
    const logs = await AuditLogModel.find(query)
      .sort({ timestamp: -1 })
      .limit(input.limit || 100)
      .skip(input.offset || 0);
    
    return logs;
  }
}
```

### What to Audit

| Action | Resource | Log Level | Retention |
|--------|----------|-----------|-----------|
| Create Document Type | DOCUMENT_TYPE | INFO | 1 year |
| Update Document Type | DOCUMENT_TYPE | INFO | 1 year |
| Delete Document Type | DOCUMENT_TYPE | WARNING | 2 years |
| Add Field | DOCUMENT_TYPE_FIELD | INFO | 1 year |
| Delete Field | DOCUMENT_TYPE_FIELD | WARNING | 2 years |
| Failed Login | USER | WARNING | 90 days |
| Successful Login | USER | INFO | 30 days |
| Add Workspace Member | WORKSPACE | INFO | 1 year |
| Remove Workspace Member | WORKSPACE | WARNING | 2 years |
| Change User Role | WORKSPACE | WARNING | 2 years |

---

## 4. Additional Security Measures

### CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400 // 24 hours
}));
```

### Request Size Limiting

```typescript
app.use(express.json({ 
  limit: '10mb', // Prevent large payload attacks
  verify: (req, res, buf) => {
    // Verify JSON is valid before parsing
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));
```

### Parameter Pollution Prevention

```typescript
import hpp from 'hpp';

// Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['fields', 'sort', 'filter'] // Allow arrays for these params
}));

// Example attack prevented:
// ?name=Passport&name=License → Only uses first value
```

### Security Headers

```typescript
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
});
```

---

## 5. Secrets Management

### Problem
Hardcoded secrets in code:
- Can be leaked via version control
- Difficult to rotate
- Same secrets across environments

### Solution: Environment Variables + Secrets Manager

```typescript
// .env (NOT committed to git)
JWT_SECRET=your-super-secret-jwt-key-here
MONGODB_URI=mongodb://localhost:27017/workspaceops
REDIS_URL=redis://localhost:6379

// src/config/secrets.ts
import dotenv from 'dotenv';

dotenv.config();

export const secrets = {
  jwtSecret: process.env.JWT_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  redisUrl: process.env.REDIS_URL
};

// Validate required secrets on startup
export function validateSecrets() {
  const required = ['JWT_SECRET', 'MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Call in server.ts
validateSecrets();
```

### Production: AWS Secrets Manager

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function loadSecrets() {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: 'workspaceops/production' })
  );
  
  const secrets = JSON.parse(response.SecretString);
  
  process.env.JWT_SECRET = secrets.JWT_SECRET;
  process.env.MONGODB_URI = secrets.MONGODB_URI;
}

// Load secrets before starting server
await loadSecrets();
```

---

## Implementation Checklist

### Pre-Production (Required)

- [ ] Implement rate limiting (global + auth)
- [ ] Add input validation with Joi
- [ ] Enable NoSQL injection prevention
- [ ] Configure security headers (helmet)
- [ ] Set up CORS properly
- [ ] Implement audit logging for admin operations
- [ ] Move secrets to environment variables
- [ ] Add request size limits
- [ ] Enable XSS protection

### Production (Required)

- [ ] Use Redis for distributed rate limiting
- [ ] Integrate with AWS Secrets Manager
- [ ] Set up audit log retention policy
- [ ] Configure log aggregation (e.g., CloudWatch, Datadog)
- [ ] Enable HTTPS only
- [ ] Set up Web Application Firewall (WAF)
- [ ] Implement IP whitelisting for admin endpoints
- [ ] Add DDoS protection (CloudFlare, AWS Shield)

### Post-Production (Recommended)

- [ ] Penetration testing
- [ ] Security audit
- [ ] Compliance certification (SOC2, ISO 27001)
- [ ] Bug bounty program
- [ ] Regular security updates
- [ ] Incident response plan

---

## Security Monitoring

### Alerts to Configure

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| Rate Limit Exceeded | > 10 times in 1 hour | WARNING | Log IP, consider blocking |
| Failed Login Attempts | > 5 in 15 minutes | WARNING | Lock account temporarily |
| Suspicious Input | NoSQL injection detected | CRITICAL | Block IP, alert security team |
| Audit Log Failure | Can't write audit log | CRITICAL | Alert ops team immediately |
| Unusual Admin Activity | Admin action outside business hours | WARNING | Notify admin, require MFA |

---

## Conclusion

Security is an ongoing process, not a one-time implementation. These measures provide a strong foundation, but should be continuously reviewed and updated based on:
- New vulnerabilities discovered
- Changes in threat landscape
- Compliance requirements
- Security audit findings

**Priority:** Implement all "Pre-Production Required" items before launching to production.
