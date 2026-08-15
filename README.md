# TreeWork Backend

API REST para gestión de proyectos tipo Kanban, pensada para coordinar proyectos, tareas, miembros, notas, notificaciones y archivos en tiempo real. La capa backend centraliza autenticación, validación, permisos, idempotencia y sincronización colaborativa con Socket.io, manteniendo la lógica de negocio en services y dejando los controladores delgados.

## Stack principal

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Local%20%2F%20Atlas-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-9.x-880000?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socket.io&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-Testing-6E9F18?logo=vitest&logoColor=white)
![Swagger](https://img.shields.io/badge/OpenAPI-Swagger-85EA2D?logo=swagger&logoColor=black)

## Características

- Arquitectura en capas clara: `routes -> middleware -> controllers -> services -> models`.
- Autenticación con JWT de acceso en el body y refresh token rotativo en cookie `httpOnly`.
- Login por email/password y Google OAuth con account linking por email.
- Middleware de idempotencia basado en `Idempotency-Key` y colección MongoDB con índice único y TTL de 24 horas.
- CORS con whitelist de orígenes permitidos y cookies configuradas con `sameSite` y `secure` según el entorno.
- Sistema demo efímero con usuarios temporales, proyectos y tareas cargadas por seed, limpieza automática al logout y cleanup periódico.
- Rate limiting diferenciado para auth, IA y API general.
- Integración con Gemini AI para sugerencias de tareas con respuesta JSON estructurada.
- Integración con Cloudinary para adjuntos usando `multer` con `memoryStorage` y upload por stream.
- Socket.io para notificaciones y sincronización colaborativa en tiempo real.
- Error handling centralizado con jerarquía de `AppError` y `errorHandler` global.
- Documentación OpenAPI en `/docs` con Swagger.

## Stack técnico

| Categoría | Tecnología | Uso en el proyecto |
| --- | --- | --- |
| Core | Node.js | Runtime del backend |
| Core | Express | Servidor HTTP y routing |
| Core | TypeScript | Tipado fuerte y compilación segura |
| Base de datos | MongoDB | Persistencia principal |
| Base de datos | Mongoose | ODM para modelos, índices y relaciones |
| Auth / Seguridad | JWT + bcrypt + cookie-parser | Tokens, password hashing y cookies |
| Auth / Seguridad | CORS + Helmet + express-rate-limit | Seguridad HTTP y rate limiting |
| Validación | Zod + express-validator | Validación de payloads y contratos |
| Tiempo real | Socket.io | Eventos de notificaciones y sincronización en tiempo real |
| IA | `@google/genai` | Sugerencias de tareas con Gemini |
| Archivos | Cloudinary + Multer | Adjuntos de tareas y archivos subidos |
| Email | Nodemailer | Confirmación de cuenta y reset de password |
| Testing | Vitest + mongodb-memory-server | Tests de integración con Mongo en memoria |
| Documentación | Swagger UI + swagger-jsdoc | API docs en `/docs` |
| Observabilidad | Morgan | Logging de requests |
| Build | TypeScript + `tsconfig.build.json` | Compilación de producción |

## Arquitectura

La infraestructura está separada por capas para evitar mezclar HTTP con lógica de negocio.

```text
routes/           -> endpoints y validación de entrada
  │
  ▼
middleware/       -> auth, permisos, idempotencia, rate limiting, manejo de errores
  │
  ▼
controllers/      -> orquestan la request y delegan a services
  │
  ▼
services/         -> lógica de negocio, reglas, acceso y llamadas externas
  │
  ▼
models/           -> schemas Mongoose y relaciones persistentes
  │
  ▼
MongoDB / APIs externas (Gemini, Cloudinary, email)
```

### Por qué esta separación

- Los controllers son delgados. Evitan que la capa HTTP se convierta en un dominio de negocio.
- Los services guardan las reglas del sistema: autenticación, permisos, creación de proyectos, limpieza demo y operaciones de negocio.
- Los middlewares encapsulan preocupaciones transversales: auth, validación, rate limiting y manejo de errores.
- Los models centralizan persistencia, índices y relaciones MongoDB.

## Decisiones técnicas destacadas

### 1) Refresh tokens rotativos en cookie `httpOnly`

El backend devuelve el access token en el body y guarda el refresh token en una cookie `httpOnly`, con `secure` y `sameSite` según el ambiente. Esto evita que el refresh token quede expuesto a JavaScript, reduciendo la superficie de ataque ante XSS.

Esto es mejor que guardar un JWT largo en `localStorage` o `sessionStorage`, donde cualquier script inyectado puede leerlo. En la práctica, el access token se usa para la sesión activa y el refresh token se mantiene fuera del alcance del navegador para código cliente.

### 2) Idempotencia con índice único en MongoDB

La implementación usa `Idempotency-Key` y el modelo `IdempotencyKey` con índice único sobre `key` y TTL de 24 horas. El middleware intenta crear el registro atómicamente; si ya existe, verifica si la respuesta ya fue almacenada o si la operación sigue en curso.

Esto resuelve un problema real de concurrencia: doble clic en crear tickets, reintentos de red o reenvío del mismo request tras timeout. El backend no duplica la operación porque la clave actúa como un identificador idempotente a nivel de persistencia.

### 3) Cookies cross-domain en producción

La API y el frontend no comparten dominio en Render. Eso rompe la cookie del refresh si no se controla el origen y el `SameSite`. El backend usa `cors` con whitelist de orígenes permitidos y `withCredentials: true` en el cliente; además, `secure` y `sameSite` se ajustan según el entorno.

En la práctica, esto fue un problema real de autenticación cross-domain: una cookie no era aceptada o se descartaba en ciertos navegadores. La solución combina `cors` estricto, cookies `httpOnly` y proxy de rewrites en el frontend para que la API parezca compartir dominio visible al navegador.

### 4) Cuentas demo efímeras con aislamiento real

El flujo demo crea un usuario temporal con `isEphemeralDemo: true`, genera un seed de proyecto y tareas asociados y los elimina al hacer logout o mediante limpieza periódica. El modelo `User` también tiene TTL de 2 horas para usuarios demo con `partialFilterExpression: { isEphemeralDemo: true }`.

Esto evita que visitantes concurrentes compartan datos. La limpieza tiene triple capa:
- logout explícito llama a `cleanupEphemeralDemoUser`
- cleanup periódico cada 30 minutos
- TTL de MongoDB como red de seguridad

### 5) Jerarquía de errores tipada

La base está en `src/utils/errors.ts`: `AppError` con `statusCode` y subclases como `AuthenticationError`, `ValidationError`, `ConflictError` y `NotFoundError`. El `errorHandler` global reconoce la instancia y responde con el código correcto, sin depender de strings sueltos ni `try/catch` repetidos.

Esto da dos ventajas claras:
- el contrato de la API es consistente
- los errores se manejan en un solo punto con trazabilidad uniforme en producción

## Endpoints principales

La documentación completa está en `/docs` con Swagger/OpenAPI.

| Grupo | Método | Ruta (ejemplo) | Descripción |
| --- | --- | --- | --- |
| Auth | `POST` | `/api/auth/login` | Inicia sesión con email/password |
| Auth | `POST` | `/api/auth/google` | Login con Google OAuth |
| Auth | `POST` | `/api/auth/refresh-token` | Rota el access token usando la cookie de refresh |
| Auth | `POST` | `/api/auth/logout` | Cierra sesión y limpia demo si aplica |
| Projects | `GET` | `/api/projects` | Lista proyectos del usuario autenticado |
| Projects | `POST` | `/api/projects/create-project` | Crea un proyecto |
| Projects | `GET` | `/api/projects/:projectId` | Devuelve un proyecto con sus relaciones |
| Projects | `PUT` | `/api/projects/:projectId` | Actualiza proyecto |
| Tasks | `POST` | `/api/projects/:projectId/tasks` | Crea una tarea dentro del proyecto |
| Tasks | `PUT` | `/api/projects/:projectId/tasks/:taskId` | Actualiza tarea |
| Tasks | `POST` | `/api/projects/:projectId/tasks/:taskId/status` | Cambia el estado de una tarea |
| Notifications | `GET` | `/api/notifications` | Lista notificaciones del usuario |
| Attachments | `POST` | `/api/projects/:projectId/tasks/:taskId/attachments` | Sube adjuntos a una tarea |
| IA | `POST` | `/api/projects/:projectId/ai` | Genera sugerencias de tareas con Gemini |
| Health | `GET` | `/health` | Verifica el estado del servicio |

## Cómo correr el proyecto localmente

### Requisitos

- Node.js 20+
- MongoDB local o Atlas
- npm

### 1) Clonar y entrar al proyecto

```bash
git clone <url-del-repo>
cd TreeWork/backend
```

### 2) Instalar dependencias

```bash
npm install
```

### 3) Configurar variables de entorno

Crea un archivo `.env` en la raíz del backend:

```env
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb://localhost:27017/treework

JWT_SECRET=tu-secret-de-acceso
REFRESH_JWT_SECRET=tu-secret-de-refresh

FRONTEND_URL=http://localhost:5173

GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

GEMINI_API_KEY=tu-api-key-de-gemini

CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_USER=tu-email
SMTP_PASS=tu-password
SMTP_FROM=TreeWork <no-reply@tu-dominio.com>

EMAIL_FROM=TreeWork <no-reply@tu-dominio.com>
```

### 4) Levantar MongoDB

Opción A: MongoDB local

```bash
mongod
```

Opción B: MongoDB Atlas

- crea una base y apunta `MONGODB_URI` a la conexión correcta.

### 5) Ejecutar en desarrollo

```bash
npm run dev
```

La API queda disponible en:

```text
http://localhost:5000
```

Swagger queda en:

```text
http://localhost:5000/docs
```

### 6) Build de producción

```bash
npm run build
```

### 7) Ejecutar la versión compilada

```bash
npm start
```

## Testing

El backend usa `Vitest` con `mongodb-memory-server` para correr pruebas de integración sin depender de una base real. Esa decisión es intencional: mockear todo el flujo MongoDB y HTTP no valida el comportamiento real de persistencia, validación y middleware.

### Cómo correr tests

```bash
npm run test -- --run
```

Modo interactivo:

```bash
npm run test
```

Se cubren principalmente:
- controllers: validación de requests y respuestas HTTP
- services: lógica de negocio y casos de error
- middleware: auth, validation, idempotency y rate limit

## Estructura de carpetas

```text
backend/
├── src/
│   ├── config/            # MongoDB, Cloudinary, Swagger, Gemini y email
│   ├── controllers/       # AuthController, ProjectController, TaskController, etc.
│   ├── middleware/        # auth, validation, project guard, idempotency, rate limit, error handler
│   ├── models/            # UserModel, ProjectModel, TaskModel, NotificationModel, IdemPotencyKey
│   ├── routes/            # authRoutes, projectRoutes, notificationRoutes, attachmentRoutes, aiRoutes
│   ├── services/          # lógica de negocio, seed de demo y llamadas a servicios externos
│   ├── socket/            # socket.io server y eventos de tareas/proyectos/notificaciones
│   ├── schemas/           # Zod schemas y contratos de entrada
│   ├── utils/             # errores, JWT, helper de upload, utilidades de auth
│   ├── emails/            # plantillas de confirmación y reset password
│   ├── scripts/           # cleanup de sesiones demo y tareas de mantenimiento
│   ├── __tests__/         # setup de DB y utilidades de testing
│   ├── index.ts           # bootstrap del servidor
│   ├── server.ts          # Express app, CORS, middlewares, routers y Socket.io
│   └── ...
├── .env                   # variables de entorno
├── package.json           # scripts y dependencias
├── tsconfig.json          # config de desarrollo
├── tsconfig.build.json    # build de producción
├── vitest.config.ts       # configuración de tests
├── README.md              # documentación del backend
└── dist/                  # build compilado
```

## Deploy

El backend se despliega en Render como Web Service. La build de producción se realiza con `tsc -p tsconfig.build.json` y el proceso de arranque corre `node dist/index.js`.

La app usa `trust proxy` para manejar requests proxied correctamente en entornos de producción, y la capa de frontend usa un proxy de rewrites para mitigar CORS y cookies cross-domain.

## Demo y repositorios

- [Frontend de TreeWork](../frontend)
- [Demo en vivo](https://tree-work-frontend.onrender.com)
- [Backend API](https://tree-work-backend.onrender.com)

## Contacto / autor

Desarrollado por Adrián Rivarola.

Para revisión técnica, integración o colaboración, contactar desde el repositorio principal del proyecto o el perfil profesional asociado.

---

El backend de TreeWork está construido para tolerar condiciones reales de producción: sesiones con cookies, reintentos de red, errores de negocio tipados, sincronización en tiempo real y limpieza de datos efímeros sin dejar fugas entre usuarios concurrentes.
