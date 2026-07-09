import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../utils/http';
import * as svc from './notifications.service';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [items, unread] = await Promise.all([
      svc.listNotifications(req.user!.id),
      svc.unreadCount(req.user!.id),
    ]);
    res.json({ items, unread });
  })
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    await svc.markAllRead(req.user!.id);
    res.json({ ok: true });
  })
);

router.post(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await svc.markRead(req.user!.id, req.params.id);
    res.json({ ok: true });
  })
);

export default router;
