import { Router } from "express";
import { AttachmentController } from "../controllers/AttachmentController";
import { taskExists } from "../middleware/task";
import { hasProjectAccess, projectExists } from "../middleware/project";
import { uploadAttachment } from "../middleware/attachment";
import { handleUploadErrors } from "../middleware/handleUploadErrors";
import { authenticate } from "../middleware/auth";
import { param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";

const router = Router();

router.use(authenticate)
router.param('projectId', projectExists);
router.param('taskId', taskExists);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/images:
 *   post:
 *     tags: [Attachments]
 *     summary: Subir archivo adjunto
 *     description: Sube un archivo a Cloudinary y lo asocia a la tarea. Máximo 5MB. Requiere acceso al proyecto.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Archivo a subir (máx 5MB)
 *     responses:
 *       200:
 *         description: Adjunto creado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Attachment" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/:projectId/tasks/:taskId/images',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    handleInputErrors,
    hasProjectAccess,
    uploadAttachment.single("file"),
    handleUploadErrors,
    AttachmentController.createAttachment);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/images:
 *   get:
 *     tags: [Attachments]
 *     summary: Listar adjuntos de una tarea
 *     description: Devuelve todos los adjuntos de la tarea con la URL optimizada de Cloudinary. Requiere acceso al proyecto.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *     responses:
 *       200:
 *         description: Lista de adjuntos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Attachment" }
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId/tasks/:taskId/images',
    hasProjectAccess,
    AttachmentController.getTaskAttachments);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/images/{imageId}:
 *   delete:
 *     tags: [Attachments]
 *     summary: Eliminar archivo adjunto
 *     description: Elimina el adjunto de la BD y de Cloudinary. Solo puede eliminarlo quien lo subió. El adjunto debe pertenecer a la tarea indicada.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/ImageId"
 *     responses:
 *       200:
 *         description: Adjunto eliminado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Attachment eliminado correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.delete('/:projectId/tasks/:taskId/images/:imageId',
    hasProjectAccess,
    AttachmentController.deleteTaskAttachment);

export default router;