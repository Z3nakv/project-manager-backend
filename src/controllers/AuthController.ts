import { Request, Response, NextFunction } from "express";
import { checkPasswordService, confirmAccount, createAccount, demoLogin, forgotPassword, getUser, googleAuth, login, refreshAccessToken, requestConfirmationCode, updateCurrentUserPassword, updatePasswordWithToken, updateProfile, validateToken } from "../services/authService";

export class AuthController {
  static createAccount = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { name, email, password } = req.body;
      await createAccount({ name, email, password });
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
      await confirmAccount(token);
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
      const { accessToken, refreshToken } = await login({email, password});

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      res.json({ accessToken });
    } catch (error) {
      next(error);
    }
  };

  static refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const accessToken = await refreshAccessToken(refreshToken);
      res.json({ accessToken });
    } catch (error) {
      next(error)
    }
  }

  static logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
      res.json({ message: "Sesion cerrada correctamente"});
    } catch (error) {
      next(error)
    }
  }

  static requestConfirmationCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { email } = req.body;
      await requestConfirmationCode(email);
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
      await forgotPassword(email);
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
      await validateToken(token);
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
      await updatePasswordWithToken(token, password);
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
      const user = getUser(req.user!);
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
      await updateProfile(req.user!, { name, email });
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
      await updateCurrentUserPassword(
        req.user!._id,
        {current_password,
        password}
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
      await checkPasswordService(req.user!._id, password);
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
      const { user, accessToken, refreshToken } = await googleAuth(token);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
      })
      res.json({ user, accessToken });
    } catch (error) {
      next(error);
    }
  };

  static demoLogin = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { accessToken, refreshToken } = await demoLogin();

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // sesión demo más corta: 1 día en vez de 7
      })
      res.json({ accessToken });
    } catch (error) {
      next(error);
    }
  };
}
