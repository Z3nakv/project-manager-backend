import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { NotificationController } from "../controllers/NotificationController";
import { projectExists } from "../middleware/project";
import { taskExists } from "../middleware/task";

const router = Router();

// routes/notificationRoutes.ts
router.get('/', authenticate, NotificationController.getNotifications)      // GET /api/notifications
router.put('/:notificationID/read', authenticate, NotificationController.markAsRead)  // PUT /api/notifications/:id/read
router.delete('/', authenticate, NotificationController.clearAll)           // DELETE /api/notifications

export default router;