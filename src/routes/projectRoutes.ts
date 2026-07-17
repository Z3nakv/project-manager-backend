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

router.get('/:projectID', 
    param('projectID').isMongoId().withMessage('ID del proyecto no es valido'),
    handleInputErrors,
    ProjectController.getProjectByID);

router.post('/create-project', 
    body('projectName').notEmpty().withMessage('El nombre del proyecto es necesario'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    handleInputErrors,
    ProjectController.createProject);

router.param('projectID', projectExists);

router.put('/:projectID',
    param('projectID').isMongoId().withMessage('El ID no es valido'),
    body('projectName').notEmpty().withMessage('El nombre del proyecto es necesario'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    handleInputErrors,
    hasAuthorization,
    ProjectController.updateProject);

router.delete('/:projectID', 
    param('projectID').isMongoId().withMessage('El ID no es valido'),
    handleInputErrors,
    hasAuthorization,
    ProjectController.deleteProject);

    // TASKS

router.post('/:projectID/tasks',
    param('projectID').isMongoId().withMessage('El ID no es valido'),
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

router.get('/:projectID/tasks',
    param('projectID').isMongoId().withMessage('El ID no es valido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.getProjectTasks);

router.param('taskID', taskExists);

router.get('/:projectID/tasks/:taskID',
    param('projectID').isMongoId().withMessage('El ID no es valido'),
    param('taskID').isMongoId().withMessage('El ID de la tarea no es valida'),
    handleInputErrors,
    hasProjectAccess,
    hasProjectAccess,
    TaskController.getProjectTask);

router.put('/:projectID/tasks/:taskID',
    hasAuthorization,
    param('projectID').isMongoId().withMessage('El ID del proyecto no es valido'),
    param('taskID').isMongoId().withMessage('El ID de la tarea no es valida'),
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

router.delete('/:projectID/tasks/:taskID',
    hasAuthorization,
    param('projectID').isMongoId().withMessage('El ID del proyecto no es valido'),
    param('taskID').isMongoId().withMessage('El ID de la tarea no es valida'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.deleteProjectTask);

router.post('/:projectID/tasks/:taskID/status',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'),
    body('status').notEmpty().withMessage('No hay informacion sobre el estado'),
    body('status').isString().withMessage('El estado no es valido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.updateTaskStatus);

router.post('/:projectID/tasks/:taskID/assign',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'), 
    handleInputErrors,
    hasAuthorization,
    TaskController.assignTask)

// NOTES 

router.post('/:projectID/tasks/:taskID/notes',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'),
    body('content').notEmpty().withMessage('El contenido no puede estar vacio'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.createNote)

router.get('/:projectID/tasks/:taskID/notes',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.getTaskNotes)

router.put('/:projectID/tasks/:taskID/notes/:noteID/status',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'),
    param('noteID').isMongoId().withMessage('ID de nota no es valido'),
    NoteController.updateNoteStatus)

router.delete('/:projectID/tasks/:taskID/notes/:noteID',
    param('projectID').isMongoId().withMessage('ID de proyecto no válido'),
    param('taskID').isMongoId().withMessage('ID de tarea no válido'),
    param('noteID').isMongoId().withMessage('ID de nota no válido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.deleteTaskNote);

/** Routes for teams */

router.post('/:projectID/team/find',
    body('email')
        .isEmail().toLowerCase().withMessage('E-mail no válido'),
    handleInputErrors,
    TeamMemberController.findMemberByEmail);

router.get('/:projectID/team',
    TeamMemberController.getProjecTeam);

router.post('/:projectID/team',
    body('_id')
        .isMongoId().withMessage('ID No válido'),
    handleInputErrors,
    TeamMemberController.addMemberById);

router.delete('/:projectID/team/:userID',
    param('userID')
        .isMongoId().withMessage('ID No válido'),
    handleInputErrors,
    TeamMemberController.removeMemberById);
    
export default router;