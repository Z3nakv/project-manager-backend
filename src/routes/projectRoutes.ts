import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { body, param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { TaskController } from "../controllers/TaskController";
import { NoteController } from "../controllers/NoteController";
import { hasProjectAccess, projectExists } from "../middleware/project";
import { hasAuthorization, taskExists } from "../middleware/task";
import { authenticate } from "../middleware/auth";
import { TeamMemberController } from "../controllers/TeamController";
import { idemPotencyMiddleware } from "../middleware/itemPotency";


const router = Router();

router.use(authenticate);
router.use(idemPotencyMiddleware);

router.get('/', ProjectController.getProjects);

router.get('/:projectId', 
    param('projectId').isMongoId().withMessage('Id del proyecto no es valido'),
    handleInputErrors,
    ProjectController.getProjectById);

router.post('/create-project', 
    body('projectName').notEmpty().withMessage('El nombre del proyecto es necesario'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    handleInputErrors,
    ProjectController.createProject);

router.param('projectId', projectExists);

router.put('/:projectId',
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    body('projectName').notEmpty().withMessage('El nombre del proyecto es necesario'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    handleInputErrors,
    hasAuthorization,
    ProjectController.updateProject);

router.delete('/:projectId', 
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    handleInputErrors,
    hasAuthorization,
    ProjectController.deleteProject);

    // TASKS

router.post('/:projectId/tasks',
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    body('name').notEmpty().withMessage('El nombre de la tarea es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    body('labels')
        .optional()
        .isArray().withMessage('Las etiquetas deben ser un arreglo'),
    body('labels.*.text')
        .notEmpty().withMessage('El texto de la etiqueta es necesario')
        .isLength({ max: 30 }).withMessage('Máximo 30 caracteres por etiqueta'),
    body('labels.*.color')
        .isIn(['red', 'orange', 'amber', 'emerald', 'sky', 'indigo', 'purple', 'pink', 'slate'])
        .withMessage('Color de etiqueta no válido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.createTask);

router.get('/:projectId/tasks',
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.getProjectTasks);

router.param('taskId', taskExists);

router.get('/:projectId/tasks/:taskId',
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    param('taskId').isMongoId().withMessage('El Id de la tarea no es valida'),
    handleInputErrors,
    hasProjectAccess,
    hasProjectAccess,
    TaskController.getProjectTask);

router.put('/:projectId/tasks/:taskId',
    hasAuthorization,
    param('projectId').isMongoId().withMessage('El Id del proyecto no es valido'),
    param('taskId').isMongoId().withMessage('El Id de la tarea no es valida'),
    body('name').notEmpty().withMessage('El nombre de la tarea es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    body('labels')
        .optional()
        .isArray().withMessage('Las etiquetas deben ser un arreglo'),
    body('labels.*.text')
        .notEmpty().withMessage('El texto de la etiqueta es necesario')
        .isLength({ max: 30 }).withMessage('Máximo 30 caracteres por etiqueta'),
    body('labels.*.color')
        .isIn(['red', 'orange', 'amber', 'emerald', 'sky', 'indigo', 'purple', 'pink', 'slate'])
        .withMessage('Color de etiqueta no válido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.updateProjectTask);

router.delete('/:projectId/tasks/:taskId',
    hasAuthorization,
    param('projectId').isMongoId().withMessage('El Id del proyecto no es valido'),
    param('taskId').isMongoId().withMessage('El Id de la tarea no es valida'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.deleteProjectTask);

router.post('/:projectId/tasks/:taskId/status',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    body('status').notEmpty().withMessage('No hay informacion sobre el estado'),
    body('status').isString().withMessage('El estado no es valido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.updateTaskStatus);

router.post('/:projectId/tasks/:taskId/assign',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'), 
    handleInputErrors,
    hasAuthorization,
    TaskController.assignTask)

// NOTES 

router.post('/:projectId/tasks/:taskId/notes',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    body('content').notEmpty().withMessage('El contenido no puede estar vacio'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.createNote)

router.get('/:projectId/tasks/:taskId/notes',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.getTaskNotes)

router.put('/:projectId/tasks/:taskId/notes/:noteId/status',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    param('noteId').isMongoId().withMessage('Id de nota no es valido'),
    NoteController.updateNoteStatus)

router.delete('/:projectId/tasks/:taskId/notes/:noteId',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    param('noteId').isMongoId().withMessage('Id de nota no válido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.deleteTaskNote);

/** Routes for teams */

router.post('/:projectId/team/find',
    body('email')
        .isEmail().toLowerCase().withMessage('E-mail no válido'),
    handleInputErrors,
    TeamMemberController.findMemberByEmail);

router.get('/:projectId/team',
    TeamMemberController.getProjecTeam);

router.post('/:projectId/team',
    body('_id')
        .isMongoId().withMessage('Id No válido'),
    handleInputErrors,
    TeamMemberController.addMemberById);

router.delete('/:projectId/team/:userId',
    param('userId')
        .isMongoId().withMessage('Id No válido'),
    handleInputErrors,
    TeamMemberController.removeMemberById);
    
export default router;