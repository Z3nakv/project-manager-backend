import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { NotificationController } from "../controllers/NotificationController";
import { idempotencyMiddleware } from "../middleware/itemPotency";

const router = Router();

router.use(idempotencyMiddleware);

// routes/notificationRoutes.ts

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Obtener notificaciones del usuario
 *     description: Devuelve las últimas 20 notificaciones del usuario autenticado, ordenadas por más recientes, con triggeredBy, project, task y user populados.
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Notification" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/', authenticate, NotificationController.getNotifications)      // GET /api/notifications

/**
 * @openapi
 * /notifications/{notificationId}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Marcar notificación como leída
 *     description: Marca una notificación como leída. Solo el propietario de la notificación puede marcarla.
 *     parameters:
 *       - $ref: "#/components/parameters/NotificationId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Notificación marcada como leída
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Notificación leída" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.put('/:notificationId/read', authenticate, NotificationController.markAsRead)  // PUT /api/notifications/:id/read

/**
 * @openapi
 * /notifications:
 *   delete:
 *     tags: [Notifications]
 *     summary: Eliminar todas las notificaciones
 *     description: Elimina todas las notificaciones del usuario autenticado.
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Notificaciones eliminadas
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Notificaciones eliminadas" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.delete('/', authenticate, NotificationController.clearAll)           // DELETE /api/notifications

export default router;