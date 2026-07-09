import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/http';
import { requireAuth } from '../../middleware/auth';
import * as svc from './auth.service';

const router = Router();

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  department: z.string().min(2),
  matricNumber: z.string().min(3),
});

router.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const result = await svc.register(input);
    res.status(201).json(result);
  })
);

router.get(
  '/verify',
  asyncHandler(async (req, res) => {
    const token = z.string().min(1).parse(req.query.token);
    await svc.verifyEmail(token);
    res.json({ ok: true });
  })
);

router.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
    res.json(await svc.login(email, password));
  })
);

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    res.json(svc.refresh(refreshToken));
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await svc.me(req.user!.id));
  })
);

router.post(
  '/forgot-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await svc.requestPasswordReset(email);
    res.json({ ok: true });
  })
);

router.post(
  '/reset-password',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { token, password } = z.object({ token: z.string(), password: z.string().min(8) }).parse(req.body);
    await svc.resetPassword(token, password);
    res.json({ ok: true });
  })
);

export default router;
