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
router.param('projectID', projectExists);
router.param('taskID', taskExists);

router.post('/:projectID/tasks/:taskID/images',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'),
    uploadAttachment.single("file"),
    handleUploadErrors,
    handleInputErrors,
    AttachmentController.createAttachment);
router.get('/:projectID/tasks/:taskID/images', AttachmentController.getTaskAttachments);
router.delete('/:projectID/tasks/:taskID/images/:imageID', AttachmentController.deleteTaskAttachment);

export default router;