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

```text
backend/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── models/
│   ├── socket/
│   ├── emails/
│   ├── utils/
│   ├── tests/
│   ├── server.ts
│   └── index.ts
├── vitest.config.ts
├── tsconfig.json
└── package.json
```

### Responsabilidad de cada carpeta

| Carpeta | Responsabilidad |
|----------|-----------------|
| `config/` | Configuración de servicios externos como MongoDB, Cloudinary, Gemini AI y Nodemailer. |
| `controllers/` | Reciben las peticiones HTTP y coordinan la ejecución de la lógica de negocio. |
| `routes/` | Definición de endpoints y asociación de middlewares y controladores. |
| `middleware/` | Autenticación, autorización, validaciones, manejo de errores e idempotencia. |
| `services/` | Implementación de la lógica de negocio y comunicación con servicios externos. |
| `models/` | Schemas y modelos de Mongoose utilizados por la aplicación. |
| `socket/` | Configuración de Socket.io, eventos y gestión de salas (rooms). |
| `emails/` | Plantillas y utilidades para el envío de correos electrónicos. |
| `utils/` | Funciones auxiliares como JWT, bcrypt, generación de tokens, subida de archivos y filtros de Multer. |
| `tests/` | Configuración global y utilidades para las pruebas automatizadas. |
| `server.ts` | Configuración de Express, middlewares, rutas y Socket.io. |
| `index.ts` | Punto de entrada de la aplicación e inicio del servidor. |

---

## Flujo de una petición

```text
HTTP Request
      │
      ▼
Routes
      │
      ▼
Middleware Pipeline
      │
      ▼
Controller
      │
      ▼
Service
      │
      ▼
Database / External APIs
      │
      ▼
HTTP Response
```

### Middleware Pipeline

```text
authenticate
      │
      ▼
projectExists / taskExists
      │
      ▼
hasProjectAccess
      │
      ▼
hasAuthorization
      │
      ▼
handleInputErrors
```

### Reglas del flujo

- Las **routes** solo definen endpoints y validaciones.
- Los **controllers** orquestan la petición y construyen la respuesta.
- Los **services** contienen la lógica de negocio.
- Los **middlewares** se encargan de autenticación, autorización y validaciones.
---
## Base de datos

### Tecnología

- **Base de datos:** MongoDB
- **ODM:** Mongoose `^9.6.2`
- **Conexión:** Configurada en `src/config/db.ts` mediante `mongoose.connect()`.
- **Resolución DNS:** Utiliza los servidores DNS `8.8.8.8`, `8.8.4.4` y `1.1.1.1` para la resolución de nombres.

### Modelos

| Modelo | Colección | Campos principales |
|---------|-----------|--------------------|
| `UserModel` | `User` | `email` (único), `password` (solo para `authProvider="local"`), `name`, `confirmed`, `authProvider`, `googleId` |
| `ProjectModel` | `Project` | `projectName`, `clientName`, `description`, `tasks[]`, `manager`, `team[]` |
| `TaskModel` | `Task` | `name`, `description`, `status` (5 estados), `labels[]`, `completedBy[]`, `deadline`, `assignedTo[]` |
| `NoteModel` | `Note` | `content`, `createdBy`, `task`, `completed` |
| `NotificationModel` | `Notification` | `user`, `triggeredBy`, `project`, `task` (opcional), `type`, `content`, `read` |
| `TokenModel` | `Token` | `token`, `user`, `createdAt` (TTL de 10 minutos) |
| `AttachmentModel` | `Attachment` | `task`, `uploadedBy`, `filename`, `url`, `publicId`, `mimeType`, `size` |

### Relaciones

| Modelo | Relación |
|---------|----------|
| `Project.tasks` | Referencia a `Task` (`ObjectId[]`). |
| `Project.manager` | Referencia a `User` (`ObjectId`). |
| `Project.team` | Referencia a `User` (`ObjectId[]`). |
| `Task.project` | Referencia a `Project` (`ObjectId`). |
| `Task.completedBy[].user` | Referencia a `User` (`ObjectId`). |
| `Task.assignedTo` | Referencia a `User` (`ObjectId[]`). |
| `Task.notes` | Referencia a `Note` (`ObjectId[]`). |
| `Note.task` | Referencia a `Task` (`ObjectId`). |
| `Notification.user` | Referencia a `User` (`ObjectId`). |
| `Notification.triggeredBy` | Referencia a `User` (`ObjectId`). |
| `Notification.project` | Referencia a `Project` (`ObjectId`). |
| `Attachment.task` | Referencia a `Task` (`ObjectId`). |

### Hooks de los modelos

| Hook | Descripción |
|------|-------------|
| `ProjectSchema.pre('deleteOne')` | Elimina en cascada todas las tareas y notas asociadas al proyecto antes de eliminarlo. |
| `TaskSchema.pre('deleteOne')` | Elimina en cascada todas las notas asociadas a la tarea antes de eliminarla. |

### Índices

| Índice | Descripción |
|--------|-------------|
| `User.email` | Índice **único** que garantiza que no existan usuarios con el mismo correo electrónico. |
| `Token.createdAt` | Índice **TTL** de 10 minutos que elimina automáticamente los tokens expirados. |
| `User.googleId` | Índice **único** con `sparse: true`, aplicado únicamente a usuarios autenticados mediante Google OAuth. |

## API REST

### Organización de rutas

Todas las rutas se montan en `server.ts` bajo el prefijo `/api`.

| Prefijo | Archivo | Descripción |
|---------|---------|-------------|
| `/api/auth` | `authRoutes.ts` | Autenticación local y Google OAuth. |
| `/api/projects` | `projectRoutes.ts` | Gestión de proyectos, tareas, equipo y notas. |
| `/api/projects` | `attachmentRoutes.ts` | Subida y eliminación de imágenes. |
| `/api/projects` | `aiRoutes.ts` | Generación de sugerencias de tareas mediante IA. |
| `/api/notifications` | `notificationRoutes.ts` | Gestión de notificaciones del usuario. |

### Controladores

Cada controlador es una clase con métodos estáticos encargada de recibir la petición HTTP, delegar la lógica de negocio a los servicios y construir la respuesta.

| Controlador | Responsabilidad |
|-------------|-----------------|
| `AuthController` | Registro, autenticación local, Google OAuth, recuperación de contraseña y gestión del perfil del usuario. |
| `ProjectController` | CRUD de proyectos y obtención de información de proyectos. |
| `TaskController` | CRUD de tareas, actualización de estado y asignación de miembros. |
| `NoteController` | Gestión de notas asociadas a tareas. |
| `TeamMemberController` | Administración de miembros del proyecto. |
| `AttachmentController` | Gestión de archivos adjuntos e imágenes de las tareas. |
| `NotificationController` | Consulta y administración de notificaciones. |
| `AiTasksCreationController` | Generación de sugerencias de tareas mediante Gemini AI. |

### Servicios

Los servicios encapsulan la lógica de negocio reutilizable y el acceso a la base de datos o servicios externos.

| Servicio | Responsabilidad |
|----------|-----------------|
| `projectService` | Operaciones relacionadas con proyectos. |
| `taskService` | Operaciones relacionadas con tareas. |
| `notificationService` | Creación y envío de notificaciones. |
| `aiService` | Integración con Gemini AI para generar sugerencias de tareas. |

## Autenticación

### JWT

- **Generación:** `src/utils/jwt.ts` mediante `generateJWT({ id })`.
- **Expiración:** 180 días.
- **Secreto:** Variable de entorno `JWT_SECRET`.
- **Transporte:** El token se envía mediante el encabezado:

```http
Authorization: Bearer <token>
```

### Google OAuth

- **Endpoint:** `POST /api/auth/google`
- El frontend envía el token obtenido mediante `@react-oauth/google`.
- El backend valida el token utilizando la API oficial de Google.
- Si el usuario no existe, crea una nueva cuenta con:
  - `authProvider: "google"`
  - `confirmed: true`
- Si el correo ya está registrado mediante autenticación local, responde con **HTTP 409 (Conflict)** para evitar cuentas duplicadas.

### Middleware de autenticación

El middleware `authenticate` (`middleware/auth.ts`) se encarga de:

1. Extraer el token **Bearer** del encabezado `Authorization`.
2. Verificar el JWT.
3. Buscar el usuario en MongoDB.
4. Asignarlo a `req.user`.
5. Responder con **401 Unauthorized** si la autenticación falla.

### Middleware de autorización

| Middleware | Archivo | Responsabilidad |
|------------|---------|-----------------|
| `projectExists` | `middleware/project.ts` | Carga el proyecto en `req.project`. Responde con **404** si no existe. |
| `hasProjectAccess` | `middleware/project.ts` | Verifica que el usuario sea miembro o manager del proyecto. Responde con **403** si no tiene permisos. |
| `taskExists` | `middleware/task.ts` | Carga la tarea en `req.task`. Responde con **404** si no existe. |
| `taskBelongsToProject` | `middleware/task.ts` | Verifica que la tarea pertenezca al proyecto actual. Responde con **400** si la validación falla. |
| `hasAuthorization` | `middleware/task.ts` | Verifica que el usuario sea el manager del proyecto. Responde con **403** si no tiene permisos. |

### Flujo de autorización

```text
authenticate
      │
      ▼
projectExists
      │
      ▼
hasProjectAccess
      │
      ▼
hasAuthorization (si aplica)
      │
      ▼
Controller
```

## Validaciones

### Express Validator

- **Librería:** `express-validator` `^7.3.2`.
- Las validaciones se definen directamente en las rutas mediante funciones como `body()`, `param()`, `query()`, entre otras.
- El middleware `handleInputErrors` (`middleware/validation.ts`) recopila los errores utilizando `validationResult(req)` y responde con **HTTP 400** junto al listado de errores de validación.

### Patrón utilizado

```ts
router.post(
  "/create-account",
  body("email")
    .isEmail()
    .withMessage("E-mail not valid"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must contain at least 8 characters"),

  handleInputErrors,

  AuthController.createAccount
);
```

## Manejo de errores

| Mecanismo | Descripción |
|-----------|-------------|
| **Controllers** | No existe un middleware global de errores. Cada controlador envuelve su lógica en un bloque `try/catch` y responde con `res.status(500).json({ error: "Hubo un error" })` ante errores inesperados. |
| **`handleUploadErrors`** | Captura errores generados por Multer (tipo de archivo, tamaño máximo, etc.) y responde con **HTTP 400**. |
| **`handleInputErrors`** | Recoge los errores de `express-validator` mediante `validationResult(req)` y responde con **HTTP 400**. |
| **Errores de negocio** | Se manejan directamente en los controladores mediante `throw new Error()` o respuestas como `res.status(code).json({ error: message })`. |

## WebSockets (Socket.io)

### Inicialización

Socket.io se configura en `src/server.ts` junto al servidor HTTP de Express.

```ts
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

setupSocket(io);
```

### Rooms

Cada usuario tiene una sala privada asociada a su `userId` de MongoDB.

Flujo:

```text
Usuario autenticado
        │
        ▼
Emite join_user
        │
        ▼
Socket se une a room(userId)
        │
        ▼
Servidor envía eventos únicamente a usuarios afectados
```

Los eventos dirigidos utilizan rooms específicas:

```ts
socket.to(memberId).emit(...)
```

Esto evita enviar eventos innecesarios mediante broadcast global.

### Eventos del servidor

| Evento (client → server) | Acción |
|--------------------------|--------|
| `join_user` | Une el socket del usuario a su sala privada (`userId`). |
| `project_updated` | Envía `project_updated_notification` a los miembros del proyecto. |
| `project_deleted` | Envía `project_deleted_notification` a los miembros del proyecto. |
| `member_added` | Envía `member_added_notification` al nuevo miembro agregado. |
| `member_removed` | Envía `member_removed_notification` al usuario removido. |
| `task_created` | Envía `task_created_notification` al equipo del proyecto. |
| `taskDeleted` | Envía `task_deleted_notification` al equipo del proyecto. |
| `taskUpdated` | Envía `task_updated_notification` al equipo del proyecto. |
| `task_status_update` | Envía `task_status_updated_notification` al equipo excluyendo al emisor. |
| `assignedTask` | Envía `assigned_task_notification` a los usuarios asignados. |

### Notificaciones desde controllers

El servicio `notifyChangesToTeam` (`notificationService`) gestiona la persistencia y emisión de notificaciones:

1. Crea documentos de notificación en MongoDB para los miembros afectados.
2. Excluye al usuario que realizó la acción.
3. Envía el evento `static_notification` en tiempo real mediante:

```ts
io.to(userId).emit(...)
```

## IA (Gemini)

### Configuración

- **Archivo:** `src/config/gemini.ts`
- Inicializa `GoogleGenAI` utilizando la API key de Gemini.
- **Modelo utilizado:** `gemini-3.1-flash-lite`.

### Generación de sugerencias de tareas

Las sugerencias de tareas se generan mediante el endpoint:

```http
POST /api/projects/:projectId/suggest-tasks
```

El flujo es el siguiente:

```text
Request
  │
  ▼
AiTasksCreationController
  │
  │ Recibe:
  │ - selectedFields
  │ - quantity
  ▼
aiService.suggestTasksForProject()
  │
  ├── Obtiene tareas existentes del proyecto
  │
  ├── Construye prompt con:
  │     - Nombre del proyecto
  │     - Descripción
  │     - Tareas existentes
  │     - Campos opcionales solicitados
  │
  ├── Define schema JSON esperado:
  │     - name
  │     - description
  │     - estimatedDays (opcional)
  │     - labels (opcional)
  │
  ▼
Gemini AI
  │
  ▼
Respuesta JSON estructurada
  │
  ▼
Sugerencias parseadas
```

### Características

- Evita generar tareas duplicadas utilizando las tareas existentes del proyecto como contexto.
- Utiliza respuestas JSON estructuradas para garantizar un formato consistente.
- Permite solicitar campos opcionales como duración estimada (`estimatedDays`) y etiquetas (`labels`).

## Testing

### Configuración

- **Framework:** Vitest.
- **Configuración:** `vitest.config.ts`.
- **Entorno:** `node`.
- **Setup global:** `src/__tests__/setup/env.ts`.
  - Configura variables necesarias para los tests, como `JWT_SECRET`.
- **Globals habilitados:** permite utilizar `describe`, `it`, `test`, `expect`, etc. sin importarlos manualmente.

### Tests existentes

Actualmente el proyecto cuenta con:

- **14 archivos de test** dentro de `src/`.
- Aproximadamente **99 casos de prueba** (`it` / `test`).

| Tipo | Archivos | Casos aproximados |
|------|----------|-------------------|
| Controllers | 7 | 76 |
| Middleware | 3 | 9 |
| Services | 4 | 14 |

### Comandos

```bash
npm run test        # Ejecuta los tests en modo CLI
npm run test:ui     # Ejecuta Vitest con interfaz gráfica
npm run coverage    # Genera reporte de cobertura
```

### Base de datos en pruebas

Los tests de controladores y servicios utilizan `mongodb-memory-server` para ejecutar pruebas aisladas sin depender de una instancia externa de MongoDB.

## Variables de entorno

El backend requiere las siguientes variables de entorno para configurar la base de datos, autenticación, servicios externos y comunicación con el frontend.

Crear un archivo `.env` en la raíz del backend:

```env
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

# Frontend URL (usada para enlaces enviados por email)
FRONTEND_URL=http://localhost:5173
```
## Instalación

### Instalar dependencias

```bash
npm install
```

### Desarrollo

Ejecuta el servidor en modo desarrollo con recarga automática mediante `nodemon` + `ts-node`:

```bash
npm run dev
```

### Build de producción

Compila TypeScript a JavaScript dentro de la carpeta `dist/`:

```bash
npm run build
```

### Linting

Ejecuta el análisis estático del código:

```bash
npm run lint
```

### Servidor

Por defecto, el backend estará disponible en:

```text
http://localhost:5000
```

## Convenciones de código

| Convención | Regla |
|------------|-------|
| **Controllers** | Clases con métodos estáticos. Cada método representa una acción HTTP específica. |
| **Services** | Funciones exportadas que contienen la lógica de negocio y operaciones con la base de datos. |
| **Models** | Schemas de Mongoose con interfaces TypeScript asociadas. Incluyen hooks del modelo cuando es necesario. |
| **Middleware** | Funciones `req`, `res`, `next` con una única responsabilidad por middleware. |
| **Validaciones** | Uso de `express-validator` directamente en las rutas junto a `handleInputErrors` como middleware final. |
| **Tipos compartidos** | Interfaces ubicadas junto al modelo correspondiente o exportadas desde archivos dedicados. |
| **Uso de `any`** | Evitar `any`. Preferir tipos concretos o `unknown` con validación mediante type narrowing. |
| **Imports** | Utilizar sintaxis ES Modules (`import/export`) en lugar de `require`. |
| **ESLint** | Configurado con `typescript-eslint` para análisis estático del código. |
| **Respuestas HTTP** | Mantener respuestas consistentes: `{ message }` para operaciones exitosas y `{ error }` para errores. |
| **Manejo de errores** | Cada método del controlador utiliza `try/catch`, registra errores con `console.error` y responde con estado `500` como fallback. |
| **Nombres de archivos** | `PascalCase` para clases/componentes y `camelCase` para funciones, servicios y utilidades. |

## Performance

| Optimización | Implementación |
|--------------|----------------|
| **Índices en base de datos** | Índice único en `User.email`, índice único con `sparse` en `User.googleId` e índice TTL en `Token.createdAt` (10 minutos). |
| **Paginación** | No implementada actualmente. Los endpoints retornan los datos completos. |
| **Compresión HTTP** | No implementada actualmente. |
| **Rate limiting** | No implementado actualmente. |
| **Caché de consultas** | No implementada actualmente. |
| **Population de MongoDB** | Uso de `populate()` selectivo en controladores y servicios para evitar cargar información innecesaria. |
| **Subida de archivos** | Multer utiliza `memoryStorage` y envía los buffers directamente hacia Cloudinary mediante streams. |
| **WebSockets** | Uso de rooms por `userId` y eventos dirigidos para evitar broadcasts globales innecesarios. |
| **Eliminación en cascada** | Hooks `pre('deleteOne')` en `Project` y `Task` eliminan automáticamente datos relacionados. |

## Seguridad

| Medida | Implementación |
|--------|----------------|
| **CORS** | Configurado mediante `cors()`. Actualmente permite origen abierto (`*`). |
| **JWT** | Tokens con expiración de 180 días. La validación se realiza mediante el middleware `authenticate`. |
| **Hash de contraseñas** | Uso de `bcrypt` con 10 rounds de salt para almacenar contraseñas de forma segura. |
| **Idempotencia** | Middleware `idemPotencyMiddleware` evita solicitudes duplicadas durante una ventana de 60 segundos. |
| **Validación de entrada** | Validaciones mediante `express-validator` en rutas y procesamiento centralizado con `handleInputErrors`. |
| **Filtro de archivos** | Multer utiliza `fileFilter` para aceptar únicamente archivos de tipo `image/*`. |
| **Límite de archivos** | Multer limita el tamaño máximo de subida a `5 MB` mediante `fileSize: 5 * 1024 * 1024`. |
| **Google OAuth** | Validación del token de Google contra la API oficial antes de crear o autenticar usuarios. |
| **Protección de secretos** | Las credenciales sensibles se almacenan en variables de entorno mediante `process.env` y no están incluidas en el código fuente. |

### Pendientes de seguridad

Actualmente no se utilizan:

- `Helmet` para cabeceras HTTP de seguridad.
- `express-rate-limit` para limitar solicitudes por IP.
---
## Roadmap

### Documentación de API

**Estado:** WIP

Implementar documentación interactiva de endpoints mediante:

- `swagger-jsdoc`
- `swagger-ui-express`

Objetivo: permitir explorar y probar la API directamente desde una interfaz Swagger.

### Paginación

**Estado:** Pendiente

Implementar paginación en endpoints de:

- Proyectos.
- Notificaciones.

Actualmente estos endpoints retornan todos los registros disponibles.