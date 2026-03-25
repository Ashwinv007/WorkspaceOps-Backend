# ADR-004: JWT for Authentication (over Server-Side Sessions)

## Status
Accepted

## Date
2026-03-23

## Context

The API needs an authentication mechanism. The two primary approaches are:

1. **Server-side sessions:** On login, the server creates a session record (in memory or Redis), returns a session ID cookie. Every request looks up the session in the store.

2. **JWT (JSON Web Token):** On login, the server signs a token containing user identity claims. The client stores it and sends it on every request. The server verifies the signature — no storage required.

WorkspaceOps is a REST API consumed by a separate frontend (Next.js on Vercel). It is designed to scale horizontally (multiple API instances). Cookie-based sessions require a shared session store (Redis) if running on multiple instances.

## Decision

Use **JWT** with the `jsonwebtoken` library.

- Token payload: `{ userId, email, iat, exp }`
- Algorithm: HS256 (HMAC-SHA256)
- Expiry: 24 hours
- Transport: `Authorization: Bearer <token>` header (not cookies)
- Secret: loaded from `process.env.JWT_SECRET` — never hardcoded

Verification is handled in `authMiddleware.ts`. On success, `req.user = { userId, email }` is attached — no database call required to identify the user.

## Consequences

### Positive
- **Stateless:** No session store required — any API instance can verify any token with just the secret
- **Horizontally scalable:** Add more API containers with no shared state concern
- **Decoupled from frontend:** Bearer token in the Authorization header works for web, mobile, and service-to-service calls equally — no cookie/CORS complications
- **Simple:** `jwt.sign()` to issue, `jwt.verify()` to validate — no session management code

### Negative / Trade-offs
- **No server-side revocation:** A JWT is valid until it expires (24h). If a user is compromised or deleted, their token remains valid until expiry. Mitigation: short expiry + a token blocklist (Redis set of revoked JTIs) if needed in future
- **Token size:** JWTs are larger than session IDs — adds ~200 bytes per request header
- **Secret rotation:** Changing `JWT_SECRET` immediately invalidates all active tokens — all users are logged out. Must plan rotations carefully

### Neutral
- Refresh token pattern (short-lived access token + long-lived refresh token) is the production hardening step — deferred to post-MVP
- 24-hour expiry is a trade-off between security (shorter = safer) and UX (shorter = more frequent re-logins)
