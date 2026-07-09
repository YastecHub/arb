import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import { uploadPdf } from '../../middleware/upload';
import * as svc from './submissions.service';

const router = Router();
router.use(requireAuth, requireRole('student'));

// tags may arrive as JSON string or repeated fields from multipart forms.
function parseTags(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) return j.map(String);
    } catch {
      return raw.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return undefined;
}

const metaSchema = z.object({
  title: z.string().min(3),
  abstract: z.string().optional().default(''),
  session: z.string().optional(),
});

router.get(
  '/mine',
  asyncHandler(async (req, res) => {
    res.json(await svc.listMine(req.user!.id));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await svc.getOwn(req.user!.id, req.params.id));
  })
);

router.post(
  '/',
  uploadPdf,
  asyncHandler(async (req, res) => {
    const meta = metaSchema.parse(req.body);
    const tags = parseTags(req.body.tags);
    const submit = String(req.body.action ?? 'submit') === 'submit';
    const created = await svc.create(req.user!.id, { ...meta, tags }, req.file, submit);
    res.status(201).json(created);
  })
);

router.put(
  '/:id',
  uploadPdf,
  asyncHandler(async (req, res) => {
    const meta = z
      .object({ title: z.string().min(3).optional(), abstract: z.string().optional(), session: z.string().optional() })
      .parse(req.body);
    const tags = parseTags(req.body.tags);
    const updated = await svc.update(req.user!.id, req.params.id, { ...meta, tags }, req.file);
    res.json(updated);
  })
);

router.post(
  '/:id/submit',
  asyncHandler(async (req, res) => {
    res.json(await svc.submitForReview(req.user!.id, req.params.id));
  })
);

export default router;
