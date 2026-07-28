---
# Trello Clone — Backend
API REST para la gestión de proyectos tipo Trello. Responsable de la autenticación (JWT + Google OAuth), CRUD de proyectos y tareas con tablero Kanban, asignación de miembros, notas por tarea, subida de imágenes a Cloudinary, notificaciones en tiempo real vía WebSocket, sugerencias de tareas con Gemini AI y envío de emails transaccionales.
---
## Stack tecnológico
| Categoría              | Tecnología                            | Versión      |
| ---------------------- | ------------------------------------- | ------------ |
| Runtime                | Node.js                               | —            |
| Framework HTTP         | Express                               | ^5.2.1       |
| Lenguaje               | TypeScript                            | ^6.0.3       |
| Base de datos          | MongoDB                               | —            |
| ODM                    | Mongoose                              | ^9.6.2       |
| Validación             | express-validator                     | ^7.3.2       |
| Autenticación JWT      | jsonwebtoken                          | ^9.0.3       |
| Hashing de contraseñas | bcrypt                                | ^6.0.0       |
| Google OAuth           | google-auth-library (verificación)    | ^10.9.0      |
| WebSocket              | Socket.io                             | ^4.8.3       |
| IA                     | @google/genai (Gemini)                | ^2.13.0      |
| Cloud Storage          | Cloudinary ^2.10.0 + Multer ^2.2.0    | —            |
| Email                  | nodemailer                            | ^8.0.10      |
| Testing                | Vitest ^4.1.10 + mongodb-memory-server| ^11.2.0      |
| Variables de entorno   | dotenv                                | ^17.4.2      |
| Transpilación          | ts-node                               | ^10.9.2      |
| Dev server             | nodemon                               | ^3.1.14      |
| Linter                 | ESLint ^10.8.0 + typescript-eslint    | ^8.65.0      |
---
## Arquitectura del proyecto
backend/
├── src/
│   ├── config/           # Conexiones externas: MongoDB, Cloudinary, Gemini, nodemailer
│   ├── controllers/      # Manejadores de petición (clases con métodos estáticos)
│   ├── routes/           # Definición de rutas Express + validación con express-validator
│   ├── middleware/        # Pipeline de autenticación, autorización, validación, idempotencia
│   ├── services/         # Lógica de negocio (servicio de IA, notificaciones, proyectos, tareas)
│   ├── models/           # Schemas Mongoose (7 modelos)
│   ├── socket/           # Configuración de Socket.io (eventos y rooms)
│   ├── emails/           # Plantillas de email (confirmación, reset password)
│   ├── utils/            # Utilidades: JWT, tokens, bcrypt, Cloudinary upload, multer filter
│   ├── tests/        # Setup global de testing
│   ├── server.ts         # Configuración de Express + Socket.io
│   └── index.ts          # Entry point (listen en puerto 5000)
├── vitest.config.ts
├── tsconfig.json
└── package.json
### Responsabilidad de cada capa
| Carpeta        | Responsabilidad                                                                  |
| -------------- | -------------------------------------------------------------------------------- |
| `routes/`      | Define endpoints, aplica validaciones con express-validator y conecta middleware.|
| `middleware/`  | Pipeline de seguridad: autenticación JWT, autorización por rol, validación.      |
| `controllers/` | Clases con métodos estáticos. Orquestan la respuesta HTTP. No contienen lógica de negocio pesada. |
| `services/`    | Lógica de negocio reutilizable: IA, notificaciones, consultas a BD.              |
| `models/`      | Schemas Mongoose con interfaces TypeScript. Hooks pre-delete para limpieza.      |
| `config/`      | Conexión a MongoDB, configuración de Cloudinary, Gemini AI y nodemailer.         |
| `socket/`      | Eventos WebSocket: rooms por usuario, reenvío de eventos entre miembros.         |
| `utils/`       | Helpers: generación de JWT, tokens numéricos, bcrypt, subida a Cloudinary.       |
---
## Flujo de una petición
```text
HTTP Request
      │
      ▼
Routes (definición del endpoint + validación express-validator)
      │
      ▼
Middleware Pipeline (según ruta):
  ├── authenticate (JWT → req.user)
  ├── projectExists / taskExists (carga documento → req.project / req.task)
  ├── hasProjectAccess (verifica membresía en equipo)
  ├── hasAuthorization (solo manager del proyecto)
  └── handleInputErrors (errores de validación)
      │
      ▼
Controller (método estático, orquesta la respuesta)
      │
      ▼
Service (lógica de negocio, llamadas a BD o APIs externas)
      │
      ▼
Database (MongoDB) / Cloudinary / Gemini AI / Socket.io
      │
      ▼
HTTP Response (JSON)
Reglas del flujo:
- Las routes solo definen el camino y las validaciones. No contienen lógica.
- Los controllers son delgados: validan condiciones, llaman servicios y responden.
- Los services contienen lógica reutilizable (IA, notificaciones, consultas complejas).
- Los middleware se encargan de la seguridad y carga de documentos en req.
---
Base de datos
Tecnología
- MongoDB con Mongoose ODM versión ^9.6.2.
- Conexión en src/config/db.ts mediante mongoose.connect().
- Usa DNS de Google (8.8.8.8, 8.8.4.4, 1.1.1.1) para resolución.
Modelos (7)
Modelo	Colección	Propósitos clave
UserModel	User	email (único), password (solo si authProvider=local), name, confirmed, authProvider, googleId
ProjectModel	Project	projectName, clientName, description, tasks[], manager, team[]
TaskModel	Task	name, description, status (5 estados), labels[], completedBy[], deadline, assignedTo[]
NoteModel	Note	content, createdBy, task, completed (boolean)
NotificationModel	Notification	user, triggeredBy, project, task (opcional), type, content, read
TokenModel	Token	token (string numérico), user, createdAt (expirado a los 10 min TTL)
Attachment	Attachment	task, uploadedBy, filename, url, publicId, mimeType, size
Relaciones
- Project.tasks → referencia a Task (ObjectId[]).
- Project.manager → referencia a User (ObjectId).
- Project.team → referencia a User (ObjectId[]).
- Task.project → referencia a Project (ObjectId).
- Task.completedBy[].user → referencia a User.
- Task.assignedTo → referencia a User (ObjectId[]).
- Task.notes → referencia a Note (ObjectId[]).
- Note.task → referencia a Task.
- Notification.user/triggeredBy → referencia a User.
- Notification.project → referencia a Project.
- Attachment.task → referencia a Task.
Hooks / Middleware de modelo
- ProjectSchema.pre('deleteOne'): al eliminar un proyecto, elimina en cascada todas sus tareas y notas.
- TaskSchema.pre('deleteOne'): al eliminar una tarea, elimina todas sus notas asociadas.
Índices
- User.email: único (definido en schema).
- Token.createdAt: TTL index de 10 minutos (expira automático).
- User.googleId: único con sparse: true (solo para usuarios de Google).
---
API REST
Organización de rutas
Montadas en server.ts bajo /api:
Prefijo	Archivo de rutas	Módulo
/api/auth	authRoutes.ts	Autenticación local y Google
/api/projects	projectRoutes.ts	Proyectos, tareas, notas, equipo
/api/projects	attachmentRoutes.ts	Subida/eliminación de imágenes
/api/projects	aiRoutes.ts	Sugerencias de tareas con IA
/api/notifications	notificationRoutes.ts	Notificaciones del usuario
Controladores (clases con métodos estáticos)
Controlador	Métodos principales
AuthController	createAccount, confirmAccount, login, requestCode, forgotPassword, validateToken, updatePasswordWithToken, user, updateProfile, updateCurrentUserPassword, checkPassword, googleAuth
ProjectController	getProjects, getProjectById, getEditProjectById, createProject, updateProject, deleteProject
TaskController	createTask, getProjectTasks, getProjectTask, updateProjectTask, deleteProjectTask, updateTaskStatus, assignTask
NoteController	createNote, getTaskNotes, updateNoteStatus, deleteTaskNote
TeamMemberController	findMemberByEmail, getProjecTeam, addMemberById, removeMemberById
AttachmentController	createAttachment, getTaskAttachments, deleteTaskAttachment
NotificationController	getNotifications, markAsRead, clearAll
AiTasksCreationController	getTasksSuggestions
Servicios
Servicio	Función
projectService	getProjectById, getEditProjectById, createProject, updateProject
taskService	getTasksByProject
notificationService	createNotification, notifyChangesToTeam
aiService	suggestTasksForProject (Gemini AI)
---
Autenticación
JWT (jsonwebtoken)
- Generación en src/utils/jwt.ts con generateJWT({ id }).
- Expiración: 180 días.
- Secreto: variable de entorno JWT_SECRET.
- El token se envía en el header Authorization: Bearer <token>.
Google OAuth
- Endpoint POST /api/auth/google.
- El frontend envía el token de Google obtenido con @react-oauth/google.
- El backend verifica el token contra https://www.googleapis.com/oauth2/v3/userinfo.
- Si el email no existe, crea usuario con authProvider: 'google' y confirmed: true.
- Previene duplicados: si el email ya está registrado con método local, rechaza con 409.
Middleware de autenticación (middleware/auth.ts)
- authenticate: extrae el Bearer token, verifica JWT, busca el usuario en BD y lo asigna a req.user. Devuelve 401 si falla.
Middleware de autorización
Middleware	Ubicación	Función
projectExists	middleware/project.ts	Carga el proyecto por projectId param y lo asigna a req.project. 404 si no existe.
hasProjectAccess	middleware/project.ts	Verifica que req.user sea miembro del equipo o manager del proyecto. 403 si no.
taskExists	middleware/task.ts	Carga la tarea por taskId param y la asigna a req.task. 404 si no existe.
taskBelongsToProject	middleware/task.ts	Verifica que la tarea pertenezca al proyecto actual. 400 si no.
hasAuthorization	middleware/task.ts	Verifica que req.user sea el manager del proyecto. 400 si no.
El patrón de autorización sigue este orden típico en las rutas protegidas:
authenticate → projectExists → hasProjectAccess → [hasAuthorization] → Controller
---
Validaciones
- Librería: express-validator ^7.3.2.
- Las validaciones se definen inline en cada ruta usando body(), param(), etc.
- El middleware handleInputErrors (middleware/validation.ts) recoge los errores con validationResult(req) y responde con 400 y el array de errores.
Ejemplo de patrón:
router.post('/create-account',
    body('email').isEmail().withMessage('E-mail not valid'),
    body('password').isLength({ min: 8 }).withMessage('...'),
    handleInputErrors,
    AuthController.createAccount
);
---
## Manejo de errores
- **No hay middleware global de errores.** Cada controller envuelve su lógica en `try/catch` y responde con `res.status(500).json({ error: "Hubo un error" })`.
- **Middleware de subida:** `handleUploadErrors` captura errores de Multer (límite de tamaño, tipo de archivo) y responde con 400.
- **Middleware de validación:** `handleInputErrors` responde con 400 si hay errores de express-validator.
- **Errores de negocio:** se manejan con `new Error()` y `res.status(xxx).json({ error: message })` dentro de los controllers.
---
WebSockets (Socket.io)
Inicialización
En src/server.ts:
export const io = new Server(httpServer, { cors: { origin: '*' } });
setupSocket(io);
Rooms
- Cada usuario se une a una sala con su _id de MongoDB cuando emite join_user.
- Los eventos se emiten a salas específicas usando socket.to(memberId).emit(...).
Eventos del servidor
Evento (client → server)	Acción
join_user	Une al socket a la sala userId.
project_updated	Reenvía project_updated_notification a los miembros del equipo.
project_deleted	Reenvía project_deleted_notification a los miembros del equipo.
member_added	Reenvía member_added_notification al usuario agregado.
member_removed	Reenvía member_removed_notification al usuario removido.
task_created	Reenvía task_created_notification al equipo del proyecto.
taskDeleted	Reenvía task_deleted_notification al equipo del proyecto.
taskUpdated	Reenvía task_updated_notification al equipo del proyecto.
task_status_update	Reenvía task_status_updated_notification al equipo (excluye al emisor).
assignedTask	Reenvía assigned_task_notification a los usuarios asignados.
Notificaciones desde controllers
El método notifyChangesToTeam en notificationService:
1. Crea documentos de notificación en MongoDB para cada miembro (excluye al que ejecuta la acción).
2. Emite static_notification en tiempo real a la sala de cada miembro afectado vía io.to(userId).emit().
---
IA (Gemini)
Configuración
- src/config/gemini.ts: inicializa GoogleGenAI con la API key de Gemini.
- Modelo usado: gemini-3.1-flash-lite.
Funcionalidad
- Sugerencias de tareas via POST /api/projects/:projectId/suggest-tasks.
- El controlador AiTasksCreationController.getTasksSuggestions recibe selectedFields y quantity.
- El service aiService.suggestTasksForProject:
  1. Obtiene las tareas existentes del proyecto para evitar duplicados.
  2. Construye un prompt con nombre, descripción, tareas existentes y campos opcionales.
  3. Define un schema de respuesta JSON estructurado (nombre, descripción, estimatedDays opcional, labels opcional).
  4. Llama a Gemini con response_format para forzar JSON válido.
  5. Retorna las sugerencias parseadas.
---
Testing
Configuración
- Framework: Vitest con configuración en vitest.config.ts.
- Entorno: node.
- Setup global: src/__tests__/setup/env.ts (setea JWT_SECRET para tests).
- Globals habilitados.
Tests existentes
14 archivos de test en src/, aproximadamente 99 casos (it/test):
Tipo	Archivos	Casos aprox.
Controllers	7	76
Middleware	3	9
Services	4	14
Scripts
npm run test        # Vitest en modo CLI
npm run test:ui     # Vitest con interfaz gráfica
npm run coverage    # Reporte de cobertura
Los tests de controladores y servicios utilizan mongodb-memory-server para no depender de una base de datos externa.
---
Variables de entorno
# Server
PORT=5000
# MongoDB
DATABASE_URL=mongodb://localhost:27017/trello-clone
# JWT
JWT_SECRET=your-jwt-secret
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
# SMTP / Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email-user
SMTP_PASS=your-email-password
# Frontend URL (para enlaces en emails)
FRONTEND_URL=http://localhost:5173
---
Instalación
# Clonar el repositorio e instalar dependencias
npm install
# Desarrollo con recarga automática (nodemon + ts-node)
npm run dev
# Build a JavaScript (tsc → dist/)
npm run build
# Linting
npm run lint
El servidor escucha en http://localhost:5000 por defecto.
---
Convenciones de código
Convención	Regla
Controllers	Clases con métodos estáticos. Un método por acción HTTP.
Services	Funciones exportadas. Lógica de negocio y acceso a BD.
Models	Schemas con interfaces TypeScript. Hooks pre-delete en el schema.
Middleware	Funciones (req, res, next). Cada una con una responsabilidad única.
Validaciones	express-validator inline en rutas + handleInputErrors al final.
Tipos compartidos	Interfaces en el mismo archivo del modelo o exportadas desde allí.
any	Evitar. Usar tipos concretos o unknown con type narrowing.
Imports	Usar import en lugar de require. verbatimModuleSyntax no está activo.
ESLint	Configurado con typescript-eslint.
Respuestas HTTP	JSON consistente: { message } para éxito, { error } para errores.
Manejo de errores	Try/catch en cada método del controller. console.error + status 500 como fallback.
Nombres de archivos	PascalCase para clases/componentes, camelCase para funciones y utilidades.
---
## AI Coding Guidelines
Esta sección está dirigida a agentes de IA (Cline, Claude Code, Cursor Copilot, etc.) que modifiquen el código.
1. **Analiza patrones existentes antes de modificar código.** Revisa un controlador, servicio o middleware similar antes de crear uno nuevo. No asumas convenciones que no estén en el código.
2. **Mantén la separación Route → Middleware → Controller → Service.**
   - No accedas a la base de datos desde un controller.
   - No pongas lógica de validación en un service.
   - No definas rutas dentro de controladores.
3. **Reutiliza middlewares existentes.** El pipeline de `authenticate` → `projectExists` → `hasProjectAccess` → `hasAuthorization` cubre la mayoría de los casos. No crees nuevas verificaciones de autorización a menos que sea estrictamente necesario.
4. **Valida entradas antes de que lleguen al controlador.** Usa express-validator en la ruta y `handleInputErrors` como middleware. El controlador debe recibir datos ya validados.
5. **No dupliques servicios.** Antes de crear una función en `services/`, verifica si ya existe lo que necesitas en `projectService`, `taskService`, `notificationService` o `aiService`.
6. **Mantén tipado estricto.** Usa las interfaces de los modelos (`IUser`, `IProject`, `ITask`, etc.) y no tipes con `any`. Usa `Types.ObjectId` para referencias.
7. **Crea tests para lógica nueva.** Coloca los tests en `src/<carpeta>/__tests__/`. Usa `mongodb-memory-server` para tests que requieran BD. Sigue el patrón `describe` / `it` / `expect`.
8. **No modifiques configuraciones globales** (server.ts, index.ts, vitest.config.ts, tsconfig.json) sin justificación explícita.
9. **Mantén consistencia con las respuestas HTTP.** Usa `res.json({ message })` para éxito y `res.status(code).json({ error })` para errores.
10. **Los eventos de Socket.io deben seguir el naming existente.** Los eventos se definen como constantes en el frontend (`SocketEvents`) y se emiten con strings literales desde el backend. Mantén coherencia entre ambos lados.
---
Performance
Optimización	Estado
Índices en BD	email único en User, googleId sparse único, TTL en Token (10 min)
Paginación	No implementada
Compresión	No implementada
Rate limiting	No implementada
Caché de consultas	No implementada
Lazy loading / population	populate() selectivo en controladores y servicios
Subida de archivos	Multer con memoryStorage + buffer → Cloudinary stream
WebSocket	Rooms por userId, eventos dirigidos, sin broadcast innecesario
Limpieza en cascada	Hooks pre('deleteOne') en Project y Task eliminan datos relacionados
---
Seguridad
Medida	Implementación
CORS	server.use(cors()) con origen abierto (*).
JWT	Tokens con expiración de 180 días. Verificación en middleware authenticate.
bcrypt	Hash de contraseñas con 10 rounds de salt.
Idempotencia	Middleware idemPotencyMiddleware evita solicitudes duplicadas (ventana de 60s).
Validación de entrada	express-validator en rutas. Middleware handleInputErrors centralizado.
Filtro de archivos	Multer fileFilter solo permite archivos de tipo image/.
Límite de tamaño	Multer con fileSize: 5 * 1024 * 1024 (5 MB).
Google OAuth verificación	Validación del token de Google contra la API de Google.
No_expone secretos	Las variables sensibles viajan en process.env, no en el código.
Nota: No se utiliza Helmet ni rate-limit (express-rate-limit) actualmente.
---
Roadmap
- Documentación de API con Swagger — Implementación de swagger-jsdoc + swagger-ui-express para documentación interactiva de los endpoints. (WIP)
- Paginación en endpoints de proyectos y notificaciones — Actualmente no hay paginación; proyectos y notificaciones se devuelven completos.