import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { NotificationController } from "../controllers/NotificationController";
import { idemPotencyMiddleware } from "../middleware/itemPotency";

const router = Router();

router.use(idemPotencyMiddleware);

// routes/notificationRoutes.ts
router.get('/', authenticate, NotificationController.getNotifications)      // GET /api/notifications
router.put('/:notificationId/read', authenticate, NotificationController.markAsRead)  // PUT /api/notifications/:id/read
router.delete('/', authenticate, NotificationController.clearAll)           // DELETE /api/notifications

export default router;