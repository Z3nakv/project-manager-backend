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

/**
 * @openapi
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: Listar proyectos del usuario
 *     description: Devuelve los proyectos donde el usuario autenticado es manager o miembro del equipo, con manager, team y tareas populados.
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Lista de proyectos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Project" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get('/', ProjectController.getProjects);

/**
 * @openapi
 * /projects/{projectId}:
 *   get:
 *     tags: [Projects]
 *     summary: Obtener proyecto por ID
 *     description: Devuelve un proyecto con sus tareas, notas, completedBy, manager y team populados.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Proyecto encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Project" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId', 
    param('projectId').isMongoId().withMessage('Id del proyecto no es valido'),
    handleInputErrors,
    ProjectController.getProjectById);

/**
 * @openapi
 * /projects/{projectId}/edit:
 *   get:
 *     tags: [Projects]
 *     summary: Obtener datos para editar proyecto
 *     description: Devuelve los campos editables del proyecto (projectName, clientName, description, team) con el team poblado.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Datos de edición del proyecto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectName: { type: string }
 *                 clientName: { type: string }
 *                 description: { type: string }
 *                 team:
 *                   type: array
 *                   items: { type: string, description: "ObjectId" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId/edit',
    param('projectId').isMongoId().withMessage('Id del proyecto no es valido'),
    handleInputErrors,
    ProjectController.getEditProjectById);

/**
 * @openapi
 * /projects/create-project:
 *   post:
 *     tags: [Projects]
 *     summary: Crear proyecto
 *     description: Crea un nuevo proyecto asignando al usuario autenticado como manager.
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectName, clientName, description]
 *             properties:
 *               projectName: { type: string, example: "App Móvil Fitness" }
 *               clientName: { type: string, example: "TechCorp" }
 *               description: { type: string, example: "App de seguimiento de rutinas" }
 *     responses:
 *       201:
 *         description: Proyecto creado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Proyecto creado correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.post('/create-project', 
    body('projectName').notEmpty().withMessage('El nombre del proyecto es necesario'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    handleInputErrors,
    ProjectController.createProject);

router.param('projectId', projectExists);

/**
 * @openapi
 * /projects/{projectId}:
 *   put:
 *     tags: [Projects]
 *     summary: Actualizar proyecto
 *     description: Actualiza los campos del proyecto. Requiere ser el manager del proyecto. Notifica al equipo del cambio.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [projectName, clientName, description]
 *             properties:
 *               projectName: { type: string, example: "App Móvil Fitness v2" }
 *               clientName: { type: string, example: "TechCorp" }
 *               description: { type: string, example: "App rediseñada" }
 *     responses:
 *       200:
 *         description: Proyecto actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Proyecto Actualizado" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.put('/:projectId',
    hasAuthorization,
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    body('projectName').notEmpty().withMessage('El nombre del proyecto es necesario'),
    body('clientName').notEmpty().withMessage('El nombre del cliente es necesario'),
    body('description').notEmpty().withMessage('La descripcion es necesaria'),
    handleInputErrors,
    ProjectController.updateProject);

/**
 * @openapi
 * /projects/{projectId}:
 *   delete:
 *     tags: [Projects]
 *     summary: Eliminar proyecto
 *     description: Elimina el proyecto, sus tareas y notas asociadas. Requiere ser el manager. Notifica al equipo.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Proyecto eliminado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Proyecto Eliminado" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.delete('/:projectId', 
    hasAuthorization,
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    handleInputErrors,
    ProjectController.deleteProject);

    // TASKS

/**
 * @openapi
 * /projects/{projectId}/tasks:
 *   post:
 *     tags: [Tasks]
 *     summary: Crear tarea
 *     description: Crea una nueva tarea en el proyecto y la agrega al array de tareas. Requiere acceso al proyecto (manager o miembro). Notifica al equipo.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description]
 *             properties:
 *               name: { type: string, example: "Diseñar landing page" }
 *               description: { type: string, example: "Crear mockup de la home" }
 *               labels:
 *                 type: array
 *                 items: { $ref: "#/components/schemas/Label" }
 *     responses:
 *       200:
 *         description: Tarea creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Tarea creada correctamente" }
 *                 project:
 *                   type: object
 *                   properties:
 *                     projectName: { type: string }
 *                     projectTeam: { type: array, items: { type: string } }
 *                     projectId: { type: string }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
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

/**
 * @openapi
 * /projects/{projectId}/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: Listar tareas de un proyecto
 *     description: Devuelve todas las tareas del proyecto. Requiere acceso al proyecto.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Lista de tareas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Task" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId/tasks',
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.getProjectTasks);

router.param('taskId', taskExists);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}:
 *   get:
 *     tags: [Tasks]
 *     summary: Obtener tarea por ID
 *     description: Devuelve una tarea con completedBy, notas, proyecto, team y manager populados.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Tarea encontrada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Task" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId/tasks/:taskId',
    param('projectId').isMongoId().withMessage('El Id no es valido'),
    param('taskId').isMongoId().withMessage('El Id de la tarea no es valida'),
    handleInputErrors,
    hasProjectAccess,
    hasProjectAccess,
    TaskController.getProjectTask);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}:
 *   put:
 *     tags: [Tasks]
 *     summary: Actualizar tarea
 *     description: Actualiza nombre, descripción, deadline y labels de la tarea. Requiere acceso al proyecto. Notifica al equipo.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description]
 *             properties:
 *               name: { type: string, example: "Tarea Editada" }
 *               description: { type: string, example: "Desc Editada" }
 *               deadline: { type: string, format: date, example: "2026-12-31" }
 *               labels:
 *                 type: array
 *                 items: { $ref: "#/components/schemas/Label" }
 *     responses:
 *       200:
 *         description: Tarea actualizada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Tarea Actualizada Correctamente" }
 *                 project: { type: object }
 *                 taskName: { type: string }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
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

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}:
 *   delete:
 *     tags: [Tasks]
 *     summary: Eliminar tarea
 *     description: Elimina la tarea del proyecto y de la BD. Requiere ser el manager del proyecto. Notifica al equipo.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Tarea eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Tarea Eliminada Correctamente" }
 *                 project: { type: object }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.delete('/:projectId/tasks/:taskId',
    hasAuthorization,
    param('projectId').isMongoId().withMessage('El Id del proyecto no es valido'),
    param('taskId').isMongoId().withMessage('El Id de la tarea no es valida'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.deleteProjectTask);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/status:
 *   post:
 *     tags: [Tasks]
 *     summary: Actualizar estado de la tarea
 *     description: Cambia el estado de la tarea y registra quién lo cambió en completedBy. Requiere acceso al proyecto. Notifica al equipo.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, onHold, inProgress, underReview, completed]
 *                 example: "completed"
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Tarea Actualizada" }
 *                 task: { type: object }
 *                 user: { type: object }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/:projectId/tasks/:taskId/status',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    body('status').notEmpty().withMessage('No hay informacion sobre el estado'),
    body('status').isString().withMessage('El estado no es valido'),
    handleInputErrors,
    hasProjectAccess,
    TaskController.updateTaskStatus);

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/assign:
 *   post:
 *     tags: [Tasks]
 *     summary: Asignar tarea a miembros
 *     description: Asigna la tarea a uno o más miembros del equipo. Requiere ser el manager del proyecto. Solo se pueden asignar miembros del proyecto. Notifica a los asignados.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items: { type: string, description: "ObjectId del usuario" }
 *                 example: ["64b7f1a2e4b0a1c2d3e4f5ab"]
 *     responses:
 *       200:
 *         description: Tarea asignada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Tarea asignada correctamente" }
 *                 taskName: { type: string }
 *                 projectName: { type: string }
 *                 projectId: { type: string }
 *                 userIds: { type: array, items: { type: string } }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/:projectId/tasks/:taskId/assign',
    hasAuthorization,
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'), 
    handleInputErrors,
    TaskController.assignTask)

// NOTES 

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/notes:
 *   post:
 *     tags: [Notes]
 *     summary: Crear nota en tarea
 *     description: Crea una nota asociada a la tarea y la agrega al array de notas. Requiere acceso al proyecto. Notifica al equipo por Socket.io.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, example: "Recordar validar el formulario" }
 *     responses:
 *       200:
 *         description: Nota creada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Nota Creada Correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/:projectId/tasks/:taskId/notes',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    body('content').notEmpty().withMessage('El contenido no puede estar vacio'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.createNote)

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/notes:
 *   get:
 *     tags: [Notes]
 *     summary: Listar notas de una tarea
 *     description: Devuelve todas las notas de la tarea con el creador populado. Requiere acceso al proyecto.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Lista de notas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Note" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId/tasks/:taskId/notes',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.getTaskNotes)

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/notes/{noteId}/status:
 *   put:
 *     tags: [Notes]
 *     summary: Alternar estado completado de la nota
 *     description: Invierte el valor booleano `completed` de la nota.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/NoteId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Estado de nota actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Estado de nota actualizado!" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.put('/:projectId/tasks/:taskId/notes/:noteId/status',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    param('noteId').isMongoId().withMessage('Id de nota no es valido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.updateNoteStatus)

/**
 * @openapi
 * /projects/{projectId}/tasks/{taskId}/notes/{noteId}:
 *   delete:
 *     tags: [Notes]
 *     summary: Eliminar nota
 *     description: Elimina la nota si el usuario es el creador y la nota pertenece a la tarea indicada. Notifica al equipo.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/TaskId"
 *       - $ref: "#/components/parameters/NoteId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Nota eliminada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Nota Eliminada" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         description: No tienes permiso para eliminar esta nota
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *             example: { error: "No tienes permiso para eliminar esta nota" }
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 */
router.delete('/:projectId/tasks/:taskId/notes/:noteId',
    param('projectId').isMongoId().withMessage('Id de proyecto no válido'),
    param('taskId').isMongoId().withMessage('Id de tarea no válido'),
    param('noteId').isMongoId().withMessage('Id de nota no válido'),
    handleInputErrors,
    hasProjectAccess,
    NoteController.deleteTaskNote);

/** Routes for teams */

/**
 * @openapi
 * /projects/{projectId}/team/find:
 *   post:
 *     tags: [Team]
 *     summary: Buscar miembro por email
 *     description: Busca un usuario por su email para agregarlo al equipo. Requiere acceso al proyecto.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "member@test.com" }
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/TeamMember" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/:projectId/team/find',
    body('email')
        .isEmail().toLowerCase().withMessage('E-mail no válido'),
    handleInputErrors,
    hasProjectAccess,
    TeamMemberController.findMemberByEmail);

/**
 * @openapi
 * /projects/{projectId}/team:
 *   get:
 *     tags: [Team]
 *     summary: Obtener equipo del proyecto
 *     description: Devuelve los miembros del equipo del proyecto con _id, email y name. Requiere acceso al proyecto.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Equipo del proyecto
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/TeamMember" }
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.get('/:projectId/team',
    hasProjectAccess,
    TeamMemberController.getProjecTeam);

/**
 * @openapi
 * /projects/{projectId}/team:
 *   post:
 *     tags: [Team]
 *     summary: Agregar miembro al equipo
 *     description: Agrega un usuario al equipo del proyecto por su ID. Requiere ser el manager del proyecto. Notifica al miembro agregado.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [_id]
 *             properties:
 *               _id: { type: string, description: "ObjectId del usuario a agregar", example: "64b7f1a2e4b0a1c2d3e4f5ab" }
 *     responses:
 *       200:
 *         description: Miembro agregado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Usuario agregado correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 */
router.post('/:projectId/team',
    body('_id')
        .isMongoId().withMessage('Id No válido'),
    handleInputErrors,
    hasAuthorization,
    TeamMemberController.addMemberById);

/**
 * @openapi
 * /projects/{projectId}/team/{userId}:
 *   delete:
 *     tags: [Team]
 *     summary: Eliminar miembro del equipo
 *     description: Elimina un miembro del equipo del proyecto. Requiere ser el manager del proyecto. Notifica al miembro eliminado.
 *     parameters:
 *       - $ref: "#/components/parameters/ProjectId"
 *       - $ref: "#/components/parameters/UserId"
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     responses:
 *       200:
 *         description: Miembro eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Usuario eliminado correctamente" }
 *                 manager: { type: string }
 *                 colaborador: { type: string }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       403:
 *         $ref: "#/components/responses/Forbidden"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.delete('/:projectId/team/:userId',
    param('userId')
        .isMongoId().withMessage('Id No válido'),
    handleInputErrors,
    hasAuthorization,
    TeamMemberController.removeMemberById);
    
export default router;