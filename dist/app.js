"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_routes_1 = __importDefault(require("./modules/auth/infrastructure/routes/auth.routes"));
const workspace_routes_1 = __importDefault(require("./modules/workspace/infrastructure/routes/workspace.routes"));
const entity_routes_1 = __importDefault(require("./modules/entity/infrastructure/routes/entity.routes"));
const documentType_routes_1 = __importDefault(require("./modules/document-type/infrastructure/routes/documentType.routes"));
const document_routes_1 = __importDefault(require("./modules/document/infrastructure/routes/document.routes"));
const errorHandler_1 = require("./shared/interfaces/middleware/errorHandler");
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// Module routes
app.use('/auth', auth_routes_1.default);
app.use('/workspaces', workspace_routes_1.default);
app.use(entity_routes_1.default); // Entity routes are nested under /workspaces/:workspaceId/entities
app.use(documentType_routes_1.default); // Document type routes are nested under /workspaces/:workspaceId/document-types
app.use(document_routes_1.default); // Document routes are nested under /workspaces/:workspaceId/documents
// Global error handler (must be last)
app.use(errorHandler_1.errorHandler);
exports.default = app;
