import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Trello Clone API",
      version: "1.0.0",
      description:
        "API REST para gestión de proyectos, tareas, equipos, notas, notificaciones, adjuntos y sugerencias con IA.\n\n" +
        "La autenticación se realiza mediante **JWT Bearer Token**. " +
        "Incluye el header `Authorization: Bearer <token>` en las peticiones protegidas.\n\n" +
        "Algunas rutas soportan **idempotencia** mediante el header `Idempotency-Key`.",
      contact: {
        name: "Trello Clone Team",
        url: "https://localhost:5000",
      },
    },
    servers: [
      {
        url: "http://localhost:5000/api",
        description: "Servidor de desarrollo local",
      },
    ],
    tags: [
      { name: "Auth", description: "Autenticación, registro y gestión de cuenta de usuario" },
      { name: "Projects", description: "Gestión de proyectos" },
      { name: "Tasks", description: "Gestión de tareas dentro de proyectos" },
      { name: "Team", description: "Gestión de miembros del equipo de un proyecto" },
      { name: "Notes", description: "Notas asociadas a tareas" },
      { name: "Notifications", description: "Notificaciones del usuario" },
      { name: "Attachments", description: "Archivos adjuntos de tareas" },
      { name: "AI", description: "Sugerencias de tareas generadas con IA" },
    ],
    security: [
      {
        bearerAuth: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Introduce únicamente el JWT. Swagger UI enviará automáticamente el header Authorization: Bearer <token>."
        },
      },
      parameters: {
        ProjectId: {
          name: "projectId",
          in: "path",
          required: true,
          description: "ID (MongoDB ObjectId) del proyecto",
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          example: "64b7f1a2e4b0a1c2d3e4f5a6",
        },
        TaskId: {
          name: "taskId",
          in: "path",
          required: true,
          description: "ID (MongoDB ObjectId) de la tarea",
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          example: "64b7f1a2e4b0a1c2d3e4f5a7",
        },
        NoteId: {
          name: "noteId",
          in: "path",
          required: true,
          description: "ID (MongoDB ObjectId) de la nota",
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          example: "64b7f1a2e4b0a1c2d3e4f5a8",
        },
        ImageId: {
          name: "imageId",
          in: "path",
          required: true,
          description: "ID (MongoDB ObjectId) del attachment",
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          example: "64b7f1a2e4b0a1c2d3e4f5a9",
        },
        NotificationId: {
          name: "notificationId",
          in: "path",
          required: true,
          description: "ID (MongoDB ObjectId) de la notificación",
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          example: "64b7f1a2e4b0a1c2d3e4f5aa",
        },
        UserId: {
          name: "userId",
          in: "path",
          required: true,
          description: "ID (MongoDB ObjectId) del usuario",
          schema: { type: "string", pattern: "^[0-9a-fA-F]{24}$" },
          example: "64b7f1a2e4b0a1c2d3e4f5ab",
        },
        IdempotencyKey: {
          name: "Idempotency-Key",
          in: "header",
          required: false,
          description:
            "Clave de idempotencia para evitar solicitudes duplicadas (ventana de 60s)",
          schema: { type: "string" },
          example: "abc-123-unique-key",
        },
      },
      schemas: {
        /* ─────────────── USUARIO ─────────────── */
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5ab" },
            name: { type: "string", example: "Adrian Perez" },
            email: { type: "string", format: "email", example: "adrian@test.com" },
            confirmed: { type: "boolean", example: true },
            authProvider: {
              type: "string",
              enum: ["local", "google"],
              example: "local",
            },
            googleId: { type: "string", nullable: true, example: null },
          },
        },
        UserPublic: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5ab" },
            name: { type: "string", example: "Adrian Perez" },
            email: { type: "string", format: "email", example: "adrian@test.com" },
          },
          description: "Datos públicos de un usuario (sin contraseña)",
        },
        TeamMember: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5ab" },
            email: { type: "string", format: "email", example: "member@test.com" },
            name: { type: "string", example: "Maria Gomez" },
          },
          description: "Miembro del equipo de un proyecto",
        },
        /* ─────────────── PROYECTO ─────────────── */
        Project: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a6" },
            projectName: { type: "string", example: "App Móvil Fitness" },
            clientName: { type: "string", example: "TechCorp" },
            description: { type: "string", example: "App de seguimiento de rutinas" },
            manager: { $ref: "#/components/schemas/UserPublic" },
            team: {
              type: "array",
              items: { $ref: "#/components/schemas/UserPublic" },
            },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  _id: { type: "string" },
                  status: { type: "string" },
                  deadline: { type: "string", format: "date-time", nullable: true },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        /* ─────────────── ETIQUETA ─────────────── */
        Label: {
          type: "object",
          required: ["text", "color"],
          properties: {
            text: { type: "string", example: "Urgente", maxLength: 30 },
            color: {
              type: "string",
              enum: [
                "red", "orange", "amber", "emerald",
                "sky", "indigo", "purple", "pink", "slate",
              ],
              example: "red",
            },
          },
        },
        /* ─────────────── TAREA ─────────────── */
        Task: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a7" },
            name: { type: "string", example: "Diseñar landing page" },
            description: { type: "string", example: "Crear mockup de la home" },
            project: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a6" },
            status: {
              type: "string",
              enum: ["pending", "onHold", "inProgress", "underReview", "completed"],
              example: "pending",
            },
            completedBy: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: { type: "string", description: "ObjectId del usuario" },
                  status: {
                    type: "string",
                    enum: ["pending", "onHold", "inProgress", "underReview", "completed"],
                  },
                },
              },
            },
            notes: {
              type: "array",
              items: { type: "string", description: "ObjectId de nota" },
            },
            deadline: { type: "string", format: "date-time", nullable: true, example: null },
            labels: {
              type: "array",
              items: { $ref: "#/components/schemas/Label" },
            },
            assignedTo: {
              type: "array",
              items: { type: "string", description: "ObjectId del usuario asignado" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        /* ─────────────── NOTA ─────────────── */
        Note: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a8" },
            content: { type: "string", example: "Recordar validar el formulario" },
            createdBy: { $ref: "#/components/schemas/UserPublic" },
            task: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a7" },
            completed: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        /* ─────────────── NOTIFICACIÓN ─────────────── */
        Notification: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5aa" },
            user: { $ref: "#/components/schemas/UserPublic" },
            triggeredBy: { $ref: "#/components/schemas/UserPublic" },
            project: {
              type: "object",
              properties: { _id: { type: "string" } },
            },
            task: {
              type: "object",
              nullable: true,
              properties: { _id: { type: "string" } },
            },
            type: {
              type: "string",
              enum: [
                "task_updated", "task_status_updated", "task_created",
                "task_deleted", "project_updated", "project_deleted",
                "member_added", "member_removed", "note_added", "note_deleted",
              ],
              example: "task_created",
            },
            content: { type: "string", example: "Maria creó la tarea \"Diseñar landing page\"" },
            read: { type: "boolean", example: false },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        /* ─────────────── ADJUNTO ─────────────── */
        Attachment: {
          type: "object",
          properties: {
            _id: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a9" },
            task: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5a7" },
            uploadedBy: { type: "string", example: "64b7f1a2e4b0a1c2d3e4f5ab" },
            filename: { type: "string", example: "documento.pdf" },
            url: { type: "string", example: "https://res.cloudinary.com/demo/image/upload/documento.pdf" },
            publicId: { type: "string", example: "trello-clone/documento" },
            mimeType: { type: "string", example: "application/pdf" },
            size: { type: "string", example: "12345" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        /* ─────────────── SUGERENCIA IA ─────────────── */
        TaskSuggestion: {
          type: "object",
          properties: {
            name: { type: "string", example: "Configurar CI/CD" },
            description: { type: "string", example: "Configurar pipeline de integración continua" },
            estimatedDays: { type: "integer", nullable: true, example: 3 },
            labels: {
              type: "array",
              nullable: true,
              items: { $ref: "#/components/schemas/Label" },
            },
          },
        },
        /* ─────────────── ERRORES ─────────────── */
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Hubo un error" },
          },
          description: "Respuesta de error genérica del errorHandler",
        },
        ValidationError: {
          type: "object",
          properties: {
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", example: "field" },
                  msg: { type: "string", example: "password cannot be empty" },
                  path: { type: "string", example: "password" },
                  location: { type: "string", example: "body" },
                },
              },
            },
          },
          description: "Error de validación de express-validator (HTTP 400)",
        },
        MessageResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Operación exitosa" },
          },
          description: "Respuesta genérica con un mensaje",
        },
      },
      responses: {
        BadRequest: {
          description: "Solicitud inválida o error de validación",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "No se envió ningún archivo" },
            },
          },
        },
        Unauthorized: {
          description: "No autenticado o token inválido",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "No autorizado" },
            },
          },
        },
        Forbidden: {
          description: "No tienes permiso para realizar esta acción",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "No tienes acceso a este proyecto" },
            },
          },
        },
        NotFound: {
          description: "Recurso no encontrado",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Project con id 64b7f1a2e4b0a1c2d3e4f5a6 no encontrado" },
            },
          },
        },
        Conflict: {
          description: "Conflicto con el estado actual del recurso",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "El usuario ya esta registrado!" },
            },
          },
        },
        InternalError: {
          description: "Error interno del servidor",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
              example: { error: "Hubo un error" },
            },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;