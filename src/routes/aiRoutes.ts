import { Router } from "express"
import { body, param } from "express-validator";
import { AiTasksCreationController } from "../controllers/AiController";
import { handleInputErrors } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { hasProjectAccess, projectExists } from "../middleware/project";

const router = Router();

router.use(authenticate); 
router.param('projectId', projectExists);

router.post('/:projectId/suggest-tasks',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    body('selectedFields').notEmpty().withMessage('Task props not valid'),
    handleInputErrors,
    hasProjectAccess,
    AiTasksCreationController.getTasksSuggestions);

export default router;