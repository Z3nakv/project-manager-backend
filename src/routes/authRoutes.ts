import { Router } from "express";
import { body, param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middleware/auth";
import { authLimiter, registerLimiter } from "../middleware/limiter";
import { validate } from "../middleware/validate";
import { loginSchema } from "../schemas/authSchema";
import { idempotencyMiddleware } from "../middleware/itemPotency";

const router = Router();

router.use(idempotencyMiddleware);

/**
 * @openapi
 * /auth/create-account:
 *   post:
 *     tags: [Auth]
 *     summary: Crear cuenta de usuario
 *     description: Registra un nuevo usuario, hashea la contraseña y envía un email de confirmación con un token de 6 dígitos.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, password_confirmation]
 *             properties:
 *               name: { type: string, example: "Adrian Perez" }
 *               email: { type: string, format: email, example: "adrian@test.com" }
 *               password: { type: string, minLength: 8, example: "password123" }
 *               password_confirmation: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: Cuenta creada correctamente
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Cuenta creada! Revisa tu email para confirmarla" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 */
router.post('/create-account',
    registerLimiter,
    body('name')
    .notEmpty().withMessage('Name cannot be empty'),
    body('password')
    .notEmpty().withMessage('password cannot be empty')
    .isLength({min:8}).withMessage('Password has to be at least 8 digits'),
    body('password_confirmation')
    .custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Loas password no son iguales')
        }
        return true;
    }),
    body('email')
    .notEmpty().withMessage('Name cannot be empty')
    .isEmail().withMessage('E-mail not valid'),
    handleInputErrors,
    AuthController.createAccount);

/**
 * @openapi
 * /auth/confirm-account:
 *   post:
 *     tags: [Auth]
 *     summary: Confirmar cuenta
 *     description: Verifica el token de 6 dígitos enviado por email y activa la cuenta del usuario.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: Cuenta confirmada correctamente
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Cuenta confirmada correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/confirm-account',
    body('token')
    .notEmpty().withMessage('El token no puede ir vacio'),
    handleInputErrors,
    AuthController.confirmAccount);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Iniciar sesión
 *     description: Autentica al usuario con email y contraseña. Si la cuenta no está confirmada, reenvía un email de confirmación. Devuelve un JWT.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "adrian@test.com" }
 *               password: { type: string, example: "password123" }
 *     responses:
 *       200:
 *         description: JWT de autenticación
 *         content:
 *           application/json:
 *             schema: { type: string }
 *             example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         description: Cuenta no confirmada o password incorrecto
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *             example: { error: "Password incorrecto" }
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/login',
    authLimiter,
    validate(loginSchema),
    AuthController.login);

router.post("/refresh-token", AuthController.refreshToken);

router.post("/logout", AuthController.logout);

;/**
 * @openapi
 * /auth/request-code:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar nuevo código de confirmación
 *     description: Genera y envía un nuevo token de confirmación por email si el usuario existe y aún no ha confirmado su cuenta.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "adrian@test.com" }
 *     responses:
 *       200:
 *         description: Nuevo token enviado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Se envio un nuevo token, Revisa tu email para confirmarla" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 */
router.post('/request-code',
body('email')
.isEmail().withMessage('Email no valido'),
handleInputErrors,
AuthController.requestConfirmationCode);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Solicitar restablecimiento de contraseña
 *     description: Genera un token de restablecimiento y lo envía por email al usuario.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email, example: "adrian@test.com" }
 *     responses:
 *       200:
 *         description: Email de restablecimiento enviado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Revisa tu email para instrucciones" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/forgot-password',
body('email')
.isEmail().withMessage('Email no valido'),
handleInputErrors,
AuthController.forgotPassword);

/**
 * @openapi
 * /auth/validate-token:
 *   post:
 *     tags: [Auth]
 *     summary: Validar token de restablecimiento
 *     description: Verifica que un token de restablecimiento de contraseña existe y es válido.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: "111222" }
 *     responses:
 *       200:
 *         description: Token válido
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Token valido, Define tu nuevo password" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/validate-token',
    body('token')
    .notEmpty().withMessage('El token no puede ir vacio'),
    handleInputErrors,
    AuthController.validateToken);

/**
 * @openapi
 * /auth/update-password/{token}:
 *   post:
 *     tags: [Auth]
 *     summary: Restablecer contraseña con token
 *     description: Establece una nueva contraseña usando un token de restablecimiento válido. El token se elimina tras usarse.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *       - name: token
 *         in: path
 *         required: true
 *         description: Token numérico de restablecimiento
 *         schema: { type: string }
 *         example: "333444"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password, password_confirmation]
 *             properties:
 *               password: { type: string, minLength: 8, example: "nuevoPassword123" }
 *               password_confirmation: { type: string, example: "nuevoPassword123" }
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "El password se modifico correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       404:
 *         $ref: "#/components/responses/NotFound"
 */
router.post('/update-password/:token',
    param('token').isNumeric().withMessage('Token no valido'),
    body('password')
    .notEmpty().withMessage('password cannot be empty')
    .isLength({min:8}).withMessage('Password has to be at least 8 digits'),
    body('password_confirmation')
    .custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Loas password no son iguales')
        }
        return true;
    }),
    handleInputErrors,
    AuthController.updatePasswordWithToken);

/**
 * @openapi
 * /auth/user:
 *   get:
 *     tags: [Auth]
 *     summary: Obtener usuario autenticado
 *     description: Devuelve los datos del usuario actual a partir del JWT.
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/User" }
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 */
router.get('/user',
    authenticate,
    AuthController.user);

// PROFILE

/**
 * @openapi
 * /auth/profile:
 *   put:
 *     tags: [Auth]
 *     summary: Actualizar perfil de usuario
 *     description: Actualiza el nombre y email del usuario autenticado. El email debe no estar en uso por otro usuario.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email]
 *             properties:
 *               name: { type: string, example: "Adrian Perez Actualizado" }
 *               email: { type: string, format: email, example: "nuevo@test.com" }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Perfil actualizado correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 */
router.put('/profile', 
    authenticate,
    body('name')
    .notEmpty().withMessage('Name cannot be empty'),
    body('email')
    .notEmpty().withMessage('Name cannot be empty')
    .isEmail().withMessage('E-mail not valid'),
    handleInputErrors,
    AuthController.updateProfile);

/**
 * @openapi
 * /auth/update-password:
 *   post:
 *     tags: [Auth]
 *     summary: Actualizar contraseña del usuario actual
 *     description: Cambia la contraseña del usuario autenticado validando primero la contraseña actual.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, password, password_confirmation]
 *             properties:
 *               current_password: { type: string, example: "passwordActual" }
 *               password: { type: string, minLength: 8, example: "passwordNuevo123" }
 *               password_confirmation: { type: string, example: "passwordNuevo123" }
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "El password se modifico correctamente" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         description: Contraseña actual incorrecta
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *             example: { error: "El password actual es incorrecto!" }
 */
router.post('/update-password',
    authenticate,
    body('current_password')
    .notEmpty().withMessage('Current password cannot be empty'),
    body('password')
    .notEmpty().withMessage('password cannot be empty')
    .isLength({min:8}).withMessage('Password has to be at least 8 digits'),
    body('password_confirmation')
    .custom((value, {req}) => {
        if(value !== req.body.password){
            throw new Error('Loas password no son iguales')
        }
        return true;
    }),
    handleInputErrors,
    AuthController.updateCurrentUserPassword);

/**
 * @openapi
 * /auth/check-password:
 *   post:
 *     tags: [Auth]
 *     summary: Verificar contraseña
 *     description: Comprueba si la contraseña proporcionada coincide con la del usuario autenticado (sin modificar nada).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, example: "miPasswordActual" }
 *     responses:
 *       200:
 *         description: Contraseña correcta
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MessageResponse" }
 *             example: { message: "Password Correcto" }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         description: Contraseña incorrecta
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ErrorResponse" }
 *             example: { error: "El Password es incorrecto" }
 */
router.post('/check-password',
    authenticate,
    body('password')
        .notEmpty().withMessage('El password no puede ir vacio'),
    handleInputErrors,
    AuthController.checkPassword);

/**
 * @openapi
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Autenticación con Google
 *     description: Verifica un token de Google, crea o reutiliza el usuario y devuelve un JWT de la aplicación.
 *     security: []
 *     parameters:
 *       - $ref: "#/components/parameters/IdempotencyKey"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: "ya29.a0ARrdaM..." }
 *     responses:
 *       200:
 *         description: Autenticación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: "#/components/schemas/User" }
 *                 token: { type: string, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
 *       400:
 *         $ref: "#/components/responses/BadRequest"
 *       401:
 *         $ref: "#/components/responses/Unauthorized"
 *       409:
 *         $ref: "#/components/responses/Conflict"
 */
router.post('/google',
    body('token')
    .notEmpty().withMessage('El token de Google es obligatorio'),
    handleInputErrors,
    AuthController.googleAuth
)

export default router;