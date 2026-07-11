import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error';
import authRoutes from './modules/auth/auth.routes';
import submissionRoutes from './modules/submissions/submissions.routes';
import adminRoutes from './modules/admin/admin.routes';
import libraryRoutes from './modules/library/library.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import assistantRoutes from './modules/assistant/assistant.routes';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.frontendUrl === '*' ? true : [env.frontendUrl], credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'arb-researchhub', env: env.nodeEnv }));

  app.use('/api/auth', authRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/library', libraryRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/assistant', assistantRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
