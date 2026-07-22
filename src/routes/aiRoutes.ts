import { Router } from "express"
import { getTasksSuggestions } from "../controllers/aiController";
import { param } from "express-validator";

const router = Router();

router.get('/:projectId/suggest-tasks', 
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    getTasksSuggestions);

export default router;