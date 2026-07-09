import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/http';
import * as lib from './library.service';
import { search } from './search.service';

const router = Router();

// Public endpoints are rate-limited to prevent abuse (NFR "Public Access").
const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });
router.use(publicLimiter);

router.get(
  '/facets',
  asyncHandler(async (_req, res) => {
    res.json(await lib.facets());
  })
);

router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const mode = req.query.mode === 'ai' ? 'ai' : 'keyword';
    const limit = Math.min(50, Number(req.query.limit) || 20);
    res.json(await search(q, mode, limit));
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const f = z
      .object({
        department: z.string().optional(),
        session: z.string().optional(),
        tag: z.string().optional(),
        page: z.coerce.number().optional(),
        pageSize: z.coerce.number().optional(),
      })
      .parse(req.query);
    res.json(await lib.browse(f));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await lib.detail(req.params.id));
  })
);

router.get(
  '/:id/download',
  asyncHandler(async (req, res) => {
    const { buffer, filename } = await lib.download(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  })
);

export default router;
