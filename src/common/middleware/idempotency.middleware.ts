import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { IdempotencyModel } from '../../infrastructure/idempotency/IdempotencyModel';

/**
 * Idempotency Middleware
 *
 * Prevents duplicate effects from network retries on mutation endpoints.
 * Computes a fingerprint from (userId + method + path + requestBody) and
 * caches the response in MongoDB for 24 hours.
 *
 * If the same fingerprint arrives again within 24h, the cached response is
 * returned immediately — no use case is executed a second time.
 *
 * No client-side header is required. This is fully server-side.
 *
 * Apply only to non-idempotent POST routes where duplicates are harmful:
 *   - POST /workspaces/:id/members        (invite)
 *   - POST /workspaces/:id/work-items     (create)
 *   - POST /workspaces/:id/work-items/:id/documents  (link)
 *
 * NOT applied to file uploads (multipart/form-data — body not hashable this way).
 */
export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction): void {
    const userId = (req as any).user?.userId;

    // Skip if no authenticated user (shouldn't happen on protected routes)
    if (!userId) {
        return next();
    }

    // Build a deterministic fingerprint
    const bodyString = JSON.stringify(req.body, Object.keys(req.body ?? {}).sort());
    const raw = `${userId}:${req.method}:${req.path}:${bodyString}`;
    const key = crypto.createHash('sha256').update(raw).digest('hex');

    // Check cache
    IdempotencyModel.findOne({ key })
        .then(existing => {
            if (existing) {
                // Duplicate detected — return cached response
                res.status(existing.statusCode).json(existing.responseBody);
                return;
            }

            // Intercept res.json to cache the response before sending
            const originalJson = res.json.bind(res);
            res.json = function (body: any) {
                // Only cache successful responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    IdempotencyModel.create({ key, statusCode: res.statusCode, responseBody: body })
                        .catch(() => { /* silent — idempotency cache failure must never block the response */ });
                }
                return originalJson(body);
            };

            next();
        })
        .catch(() => {
            // Cache lookup failure — let the request through (fail open, not closed)
            next();
        });
}
