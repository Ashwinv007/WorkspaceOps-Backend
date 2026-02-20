import express from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './modules/auth/infrastructure/routes/auth.routes';
import workspaceRoutes from './modules/workspace/infrastructure/routes/workspace.routes';
import entityRoutes from './modules/entity/infrastructure/routes/entity.routes';
import documentTypeRoutes from './modules/document-type/infrastructure/routes/documentType.routes';
import documentRoutes from './modules/document/infrastructure/routes/document.routes';
import workItemRoutes from './modules/work-item/infrastructure/routes/workItem.routes';
import auditLogRoutes from './modules/audit-log/infrastructure/routes/auditLog.routes';
import overviewRoutes from './modules/overview/infrastructure/routes/overview.routes';
import { errorHandler } from './shared/interfaces/middleware/errorHandler';

const app = express();

app.use(express.json());

// Swagger UI — interactive API docs at /api-docs
const swaggerSpec = yaml.load(
  fs.readFileSync(path.resolve(process.cwd(), 'swagger.yaml'), 'utf8')
) as object;
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Module routes
app.use('/auth', authRoutes);
app.use('/workspaces', workspaceRoutes);
app.use(entityRoutes); // Entity routes are nested under /workspaces/:workspaceId/entities
app.use(documentTypeRoutes); // Document type routes are nested under /workspaces/:workspaceId/document-types
app.use(documentRoutes); // Document routes are nested under /workspaces/:workspaceId/documents
app.use(workItemRoutes);   // Work item routes: /workspaces/:workspaceId/work-item-types & work-items
app.use(auditLogRoutes);  // Audit log routes: /workspaces/:workspaceId/audit-logs
app.use(overviewRoutes); // Overview routes: /workspaces/:workspaceId/overview



// Global error handler (must be last)
app.use(errorHandler);

export default app;
