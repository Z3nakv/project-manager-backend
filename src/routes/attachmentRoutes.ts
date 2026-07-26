import { Router } from "express";
import { AttachmentController } from "../controllers/AttachmentController";
import { taskExists } from "../middleware/task";
import { hasProjectAccess, projectExists } from "../middleware/project"; // 👈 agregar hasProjectAccess
import { uploadAttachment } from "../middleware/attachment";
import { handleUploadErrors } from "../middleware/handleUploadErrors";
import { authenticate } from "../middleware/auth";
import { param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";

const router = Router();

router.use(authenticate)
router.param('projectId', projectExists);
router.param('taskId', taskExists);

router.post('/:projectId/tasks/:taskId/images',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    handleInputErrors,
    hasProjectAccess,
    uploadAttachment.single("file"),
    handleUploadErrors,
    AttachmentController.createAttachment);

router.get('/:projectId/tasks/:taskId/images',
    hasProjectAccess,
    AttachmentController.getTaskAttachments);

router.delete('/:projectId/tasks/:taskId/images/:imageId',
    hasProjectAccess,
    AttachmentController.deleteTaskAttachment);

export default router;