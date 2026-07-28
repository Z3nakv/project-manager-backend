import { Request, Response } from "express";
import User from "../models/UserModel";
import { checkPassword, hashPassword } from "../utils/auth";
import Token from "../models/TokenModel";
import { generateToken } from "../utils/token";
import { AuthEmail } from "../emails/authEmail";
import { generateJWT } from "../utils/jwt";

export class AuthController {
  static createAccount = async (req: Request, res: Response) => {
    try {
      const { password, email } = req.body;

      //prevenir duplicados
      const userExists = await User.findOne({ email });
      if (userExists) {
        const error = new Error("El usuario ya esta registrado!");
        return res.status(409).json({ error: error.message });
      }

      //cre a un usuario
      const user = new User(req.body);
      //hash password
      user.password = await hashPassword(password);
      //generar token
      const token = new Token();
      token.token = generateToken();
      token.user = user._id;

      //enviar el email
      await AuthEmail.sendConfirmationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
      });

      await Promise.all([user.save(), token.save()]);
      res.json({message: "Cuenta creada!, Revisa tu email para confirmarla"});
    } catch (error) {
      console.error(error);
      res.status(500).send("Hubo un error");
    }
  };

  static confirmAccount = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const tokenExists = await Token.findOne({ token });
      if (!tokenExists) {
        const error = new Error("Token no valido");
        return res.status(404).json({ error: error.message });
      }

      const user = await User.findById(tokenExists.user);
      if (!user) {
        const error = new Error(
          "El usuario asociado a este token ya no existe",
        );
        return res.status(404).json({ error: error.message });
      }
      user.confirmed = true;
      await Promise.all([user?.save(), tokenExists.deleteOne()]);

      res.json({message: "Cuenta confirmada correctamente"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static login = async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      //confirmar si usuario existe
      const user = await User.findOne({ email });

      if (!user) {
        const error = new Error("Usuario no encontrado");
        return res.status(404).json({ error: error.message });
      }
      //revisar si usuario esta confirmado
      if (!user.confirmed) {
        const token = new Token();
        token.user = user._id;
        token.token = generateToken();
        await token.save();

        //enviar el email
        await AuthEmail.sendConfirmationEmail({
          email: user.email,
          name: user.name,
          token: token.token,
        });

        const error = new Error(
          "La cuenta no ha sido confirmada, hemos enviado un email de confirmacion",
        );
        return res.status(401).json({ error: error.message });
      }

      //revisar password
      const isPasswordCorrect = await checkPassword(password, user.password);
      if (!isPasswordCorrect) {
        const error = new Error("Password incorrecto");
        return res.status(401).json({ error: error.message });
      }

      const token = generateJWT({ id: user._id });

      res.json(token);
    } catch (error) {
      console.log(error);

      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static requestConfirmationCode = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      //usuario existe
      const user = await User.findOne({ email });
      if (!user) {
        const error = new Error("El usuario no esta registrado!");
        return res.status(404).json({ error: error.message });
      }

      if (user.confirmed) {
        const error = new Error("El usuario ya esta confirmado!");
        return res.status(409).json({ error: error.message });
      }

      //generar token
      const token = new Token();
      token.token = generateToken();
      token.user = user._id;

      //enviar el email
      await AuthEmail.sendConfirmationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
      });

      await Promise.allSettled([user.save(), token.save()]);

      res.json({message: "Se envio un nuevo token, Revisa tu email para confirmarla"});
    } catch (error) {
      console.error(error);
      res.status(500).send("Hubo un error");
    }
  };

  static forgotPassword = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      //usuario existe
      const user = await User.findOne({ email });
      if (!user) {
        const error = new Error("El usuario no esta registrado!");
        return res.status(404).json({ error: error.message });
      }

      //generar token
      const token = new Token();
      token.token = generateToken();
      token.user = user._id;

      await token.save();

      //enviar el email
      await AuthEmail.sendPasswordResetToken({
        email: user.email,
        name: user.name,
        token: token.token,
      });

      res.json({message: "Revisa tu email para instrucciones"});
    } catch (error) {
      console.error(error);
      res.status(500).send("Hubo un error");
    }
  };

  static validateToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      const tokenExists = await Token.findOne({ token });

      if (!tokenExists) {
        const error = new Error("Token no valido");
        return res.status(404).json({ error: error.message });
      }

      res.json({message: "Token valido, Define tu nuevo password"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updatePasswordWithToken = async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      const tokenExists = await Token.findOne({ token });

      if (!tokenExists) {
        const error = new Error("Token no valido");
        return res.status(404).json({ error: error.message });
      }

      const user = await User.findById(tokenExists.user);
      if (!user) {
        const error = new Error(
          "El usuario asociado a este token ya no existe",
        );
        return res.status(404).json({ error: error.message });
      }
      user.password = await hashPassword(req.body.password);

      await Promise.all([user?.save(), tokenExists.deleteOne()]);

      res.json({message: "El password se modifico correctamente"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static user = async (req: Request, res: Response) => {
    return res.json(req.user);
  };

  static updateProfile = async (req: Request, res: Response) => {
    const { name, email } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists && userExists._id.toString() !== req.user?._id.toString()) {
      const error = new Error("El email ya esta registrado");
      return res.status(409).json({ error: error.message });
    }

    if (req.user?.name && req.user?.email) {
      req.user.name = name;
      req.user.email = email;
    }

    try {
      await req.user?.save();
      res.json({message: "Perfil actualizado correctamente"});
    } catch (error) {
      console.error(error);
      res.status(500).send("Hubo un error");
    }
  };

  static updateCurrentUserPassword = async (req: Request, res: Response) => {
    const { current_password, password } = req.body;

    const user = await User.findById(req.user?._id);

    if(!user) return res.status(404).json({error: "No se pudo encontrar al usuario"})

    const isPasswordCorrect = await checkPassword(
      current_password,
      user.password,
    );

    if (!isPasswordCorrect) {
      const error = new Error("El password actual es incorrecto!");
      return res.status(401).json({ error: error.message });
    }

    try {
      user!.password = await hashPassword(password);
      await user!.save();
      res.json({message: "El password se modifico correctamente"});
    } catch (error) {
      console.error(error);
      res.status(500).send("Hubo un error");
    }
  };

  static checkPassword = async (req: Request, res: Response) => {
    const { password } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await checkPassword(password, user!.password);
    if (!isPasswordCorrect) {
      const error = new Error("El Password es incorrecto");
      return res.status(401).json({ error: error.message });
    }

    res.json({message: "Password Correcto"});
  };

  static googleAuth = async (req: Request, res: Response) => {
    const { token } = req.body;
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        return res.status(401).json({ error: "Token de Google inválido" });
      }
      const payload = await response.json();

      if (!payload) {
        const error = new Error("Token inválido");
        return res.status(400).json({ error: error.message });
      }

      const { email, name, sub: googleId, email_verified } = payload;

      if (!email_verified) {
        const error = new Error("Email de Google no verificado");
        return res.status(400).json({ error: error.message });
      }

      let user = await User.findOne({ email });

      if (user && user.authProvider !== 'google') {
      const error = new Error(
        'Este email ya está registrado con otro método. Inicia sesión con tu contraseña.'
      );
      return res.status(409).json({ error: error.message });
    }

      if (!user) {
        user = await User.create({
          email,
          name,
          authProvider: "google",
          googleId,
          confirmed: true, 
        });
      }

      const jwtToken = generateJWT({ id: user._id }); 

      res.json({ user, token: jwtToken });
    } catch (error) {
      console.error(error);
      res.status(401).json({ error: "No se pudo verificar el token de Google" });
    }
  };
}
