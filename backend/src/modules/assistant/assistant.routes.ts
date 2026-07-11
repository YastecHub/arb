import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/http';
import * as svc from './assistant.service';

const router = Router();

const assistantLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(2000),
});

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(1200, 'Message is too long'),
  history: z.array(messageSchema).max(10).optional(),
  user: z
    .object({
      role: z.enum(['student', 'admin', 'visitor']).optional(),
      name: z.string().trim().max(120).optional(),
    })
    .optional(),
});

router.post(
  '/chat',
  assistantLimiter,
  asyncHandler(async (req, res) => {
    const input = chatSchema.parse(req.body);
    res.json(await svc.chat(input));
  })
);

export default router;
