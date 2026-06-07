import { Router } from "express";
import { body, param } from "express-validator";
import { handleInputErrors } from "../middleware/validation";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post('/create-account', 
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

router.post('/confirm-account',
    body('token')
    .notEmpty().withMessage('El token no puede ir vacio'),
    handleInputErrors,
    AuthController.confirmAccount);

router.post('/login',
    body('email')
    .notEmpty().withMessage('Email no valido'),
    body('password')
    .notEmpty().withMessage('password cannot be empty'),
    handleInputErrors,
    AuthController.login);

router.post('/request-code',
body('email')
.isEmail().withMessage('Email no valido'),
handleInputErrors,
AuthController.requestConfirmationCode);

router.post('/forgot-password',
body('email')
.isEmail().withMessage('Email no valido'),
handleInputErrors,
AuthController.forgotPassword);

router.post('/validate-token',
    body('token')
    .notEmpty().withMessage('El token no puede ir vacio'),
    handleInputErrors,
    AuthController.validateToken);

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

router.get('/user',
    authenticate,
    AuthController.user);

// PROFILE

router.put('/profile', 
    authenticate,
    body('name')
    .notEmpty().withMessage('Name cannot be empty'),
    body('email')
    .notEmpty().withMessage('Name cannot be empty')
    .isEmail().withMessage('E-mail not valid'),
    handleInputErrors,
    AuthController.updateProfile);

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

router.post('/check-password',
    authenticate,
    body('password')
        .notEmpty().withMessage('El password no puede ir vacio'),
    handleInputErrors,
    AuthController.checkPassword);

export default router;