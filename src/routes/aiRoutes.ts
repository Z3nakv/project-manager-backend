import { Router } from "express"
import { body, param } from "express-validator";
import { AiTasksCreationController } from "../controllers/AiController";
import { handleInputErrors } from "../middleware/validation";

const router = Router();

router.post('/:projectId/suggest-tasks', 
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    body('selectedFields').notEmpty().withMessage('Task props not valid'),
    handleInputErrors,
    AiTasksCreationController.getTasksSuggestions);

export default router;