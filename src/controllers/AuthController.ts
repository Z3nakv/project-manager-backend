import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";

export class AuthController {
  static createAccount = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { name, email, password } = req.body;
      await authService.createAccount({ name, email, password });
      res.json({
        message:
          "Cuenta creada! Revisa tu email para confirmarla",
      });
    } catch (error) {
      next(error);
    }
  };

  static confirmAccount = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { token } = req.body;
      await authService.confirmAccount(token);
      res.json({ message: "Cuenta confirmada correctamente" });
    } catch (error) {
      next(error);
    }
  };

  static login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { email, password } = req.body;
      const jwt = await authService.login(email, password);
      res.json(jwt);
    } catch (error) {
      next(error);
    }
  };

  static requestConfirmationCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { email } = req.body;
      await authService.requestConfirmationCode(email);
      res.json({
        message:
          "Se envio un nuevo token, Revisa tu email para confirmarla",
      });
    } catch (error) {
      next(error);
    }
  };

  static forgotPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.json({
        message: "Revisa tu email para instrucciones",
      });
    } catch (error) {
      next(error);
    }
  };

  static validateToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { token } = req.body;
      await authService.validateToken(token);
      res.json({
        message: "Token valido, Define tu nuevo password",
      });
    } catch (error) {
      next(error);
    }
  };

  static updatePasswordWithToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const token = req.params.token as string;
      const { password } = req.body;
      await authService.updatePasswordWithToken(token, password);
      res.json({
        message: "El password se modifico correctamente",
      });
    } catch (error) {
      next(error);
    }
  };

  static user = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const user = authService.getUser(req.user!);
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  static updateProfile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { name, email } = req.body;
      await authService.updateProfile(req.user!, { name, email });
      res.json({ message: "Perfil actualizado correctamente" });
    } catch (error) {
      next(error);
    }
  };

  static updateCurrentUserPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { current_password, password } = req.body;
      await authService.updateCurrentUserPassword(
        req.user!._id,
        current_password,
        password,
      );
      res.json({
        message: "El password se modifico correctamente",
      });
    } catch (error) {
      next(error);
    }
  };

  static checkPassword = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { password } = req.body;
      await authService.checkPasswordService(req.user!._id, password);
      res.json({ message: "Password Correcto" });
    } catch (error) {
      next(error);
    }
  };

  static googleAuth = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { token } = req.body;
      const result = await authService.googleAuth(token);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}
