import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError } from '../utils/http';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }
  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'PDF files must be 30 MB or smaller' : err.message;
    return res.status(status).json({ error: message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err?.__isStorageError || err?.namespace === 'storage') {
    const message = String(err?.message ?? '');
    const isAuthProblem = /JWS|JWT|signature|auth|unauthorized|forbidden/i.test(message) || String(err?.statusCode) === '403';
    return res.status(isAuthProblem ? 502 : 500).json({
      error: isAuthProblem
        ? 'File storage is not configured correctly. Please check the Supabase service-role key and storage bucket.'
        : 'The file could not be saved. Please try again.',
    });
  }
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}
