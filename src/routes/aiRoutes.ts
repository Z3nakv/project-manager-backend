import { Router } from "express"
import { body, param } from "express-validator";
import { AiTasksCreationController } from "../controllers/AiController";
import { handleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { hasProjectAccess, projectExists } from "../middleware/project";

const router = Router();

router.use(authenticate); 
router.param('projectId', projectExists);

/**
 * @openapi
 * /projects/{projectId}/suggest-tasks:
 *   post:
 *     tags: [AI]
 *     summary: Sugerir tareas con IA
 *     description: Genera sugerencias de tareas para un proyecto usando IA (Gemini), evitando duplicar tareas existentes. Permite incluir campos opcionales como estimatedDays y labels.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [selectedFields, quantity]
 *             properties:
 *               selectedFields:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [estimatedDays, labels]
 *                 example: ["estimatedDays", "labels"]
 *               quantity:
 *                 type: integer
 *                 example: 3
 *                 description: Número de tareas a sugerir
 *     responses:
 *       200:
 *         description: Lista de tareas sugeridas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/TaskSuggestion" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       500:
 *         $ref: "#/components/responses/InternalError"
 */
router.post('/suggest-tasks',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    body('selectedFields').notEmpty().withMessage('Task props not valid'),
    handleInputErrors,
    hasProjectAccess,
    AiTasksCreationController.getTasksSuggestions);

export default router;