import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../utils/http';
import { requireAuth, requireRole } from '../../middleware/auth';
import { ENGINEERING_DEPARTMENTS } from '../../config/departments';
import * as svc from './admin.service';

const router = Router();
router.use(requireAuth, requireRole('admin'));

const academicSessionSchema = z
  .string()
  .trim()
  .regex(/^20\d{2}\/20\d{2}$/, 'Academic session must use the format 2024/2025')
  .refine((value) => {
    const [start, end] = value.split('/').map(Number);
    return end === start + 1;
  }, 'Academic session must be one academic year, such as 2024/2025');

const statusSchema = z.enum([
  'draft',
  'pending_review',
  'revision_requested',
  'rejected',
  'published',
  'unpublished',
]);

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json(await svc.stats());
  })
);

router.get(
  '/submissions',
  asyncHandler(async (req, res) => {
    const status = req.query.status === undefined ? undefined : statusSchema.parse(req.query.status);
    res.json(await svc.listSubmissions(status));
  })
);

router.get(
  '/submissions/:id/download',
  asyncHandler(async (req, res) => {
    const { buffer, filename } = await svc.downloadSubmission(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  })
);

router.get(
  '/submissions/:id/thread/:eventId/download',
  asyncHandler(async (req, res) => {
    const { buffer, filename } = await svc.downloadThreadPdf(req.params.id, req.params.eventId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(buffer);
  })
);

router.get(
  '/submissions/:id',
  asyncHandler(async (req, res) => {
    res.json(await svc.getSubmission(req.params.id));
  })
);

router.get(
  '/submissions/:id/thread',
  asyncHandler(async (req, res) => {
    res.json(await svc.listThread(req.params.id));
  })
);

router.post(
  '/submissions/:id/approve',
  asyncHandler(async (req, res) => {
    res.json(await svc.approve(req.params.id, req.user!.id));
  })
);

router.post(
  '/submissions/:id/request-revision',
  asyncHandler(async (req, res) => {
    const { comment } = z.object({ comment: z.string().min(1) }).parse(req.body);
    res.json(await svc.requestRevision(req.params.id, comment, req.user!.id));
  })
);

router.post(
  '/submissions/:id/reject',
  asyncHandler(async (req, res) => {
    const { comment } = z.object({ comment: z.string().optional() }).parse(req.body);
    res.json(await svc.reject(req.params.id, comment, req.user!.id));
  })
);

router.post(
  '/papers/:id/unpublish',
  asyncHandler(async (req, res) => {
    res.json(await svc.unpublish(req.params.id, req.user!.id));
  })
);

router.post(
  '/papers/:id/republish',
  asyncHandler(async (req, res) => {
    res.json(await svc.republish(req.params.id, req.user!.id));
  })
);

router.put(
  '/papers/:id',
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        title: z.string().min(3).optional(),
        abstract: z.string().optional(),
        department: z.enum(ENGINEERING_DEPARTMENTS).optional(),
        session: academicSessionSchema.optional(),
        tags: z.array(z.string()).optional(),
      })
      .parse(req.body);
    res.json(await svc.editPaper(req.params.id, input));
  })
);

export default router;
