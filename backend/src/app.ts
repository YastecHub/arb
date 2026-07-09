import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/error';
import authRoutes from './modules/auth/auth.routes';
import submissionRoutes from './modules/submissions/submissions.routes';
import adminRoutes from './modules/admin/admin.routes';
import libraryRoutes from './modules/library/library.routes';
import notificationRoutes from './modules/notifications/notifications.routes';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.frontendUrl === '*' ? true : [env.frontendUrl], credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Local-disk storage is served here (dev fallback; prod uses S3/Supabase + CDN).
  if (env.storage.driver === 'local') {
    app.use('/files', express.static(path.resolve(process.cwd(), env.storage.localDir)));
  }

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'arb-researchhub', env: env.nodeEnv }));

  app.use('/api/auth', authRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/library', libraryRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
