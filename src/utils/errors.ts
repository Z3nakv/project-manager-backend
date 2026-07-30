/**
 * Clase base para todos los errores de negocio de la aplicación.
 * El errorHandler global reconoce cualquier subclase de AppError
 * y usa su statusCode para responder al cliente.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = this.constructor.name;
    // mantiene el stack trace correcto en V8 (Node)
    Error.captureStackTrace(this, this.constructor);
  }
}

/** 404 — el recurso solicitado no existe */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} con id ${id} no encontrado`
      : `${resource} no encontrado`;
    super(message, 404);
  }
}

/** 403 — el usuario está autenticado pero no tiene permiso para esta acción */
export class UnauthorizedError extends AppError {
  constructor(message = "No tienes permiso para realizar esta acción") {
    super(message, 403);
  }
}

/** 401 — el usuario no está autenticado o su sesión/token es inválido */
export class AuthenticationError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401);
  }
}

/** 409 — la acción entra en conflicto con el estado actual del recurso */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/** 400 — los datos recibidos no cumplen una regla de negocio (distinto de validación de schema/Zod) */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}