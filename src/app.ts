import express from 'express';
import authRoutes from './modules/auth/infrastructure/routes/auth.routes';
import { errorHandler } from './shared/interfaces/middleware/errorHandler';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Module routes
app.use('/auth', authRoutes);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
