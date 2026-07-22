import { Router } from "express";
import { AttachmentController } from "../controllers/AttachmentController";
import { taskExists } from "../middleware/task";
import { projectExists } from "../middleware/project";
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
    uploadAttachment.single("file"),
    handleUploadErrors,
    handleInputErrors,
    AttachmentController.createAttachment);
router.get('/:projectId/tasks/:taskId/images', AttachmentController.getTaskAttachments);
router.delete('/:projectId/tasks/:taskId/images/:imageId', AttachmentController.deleteTaskAttachment);

export default router;