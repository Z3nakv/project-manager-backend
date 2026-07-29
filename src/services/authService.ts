import User, { IUser } from "../models/UserModel";
import Token from "../models/TokenModel";
import { Types } from "mongoose";
import { hashPassword, checkPassword } from "../utils/auth";
import { generateToken } from "../utils/token";
import { generateJWT } from "../utils/jwt";
import { AuthEmail } from "../emails/authEmail";
import {
  NotFoundError,
  AuthenticationError,
  ConflictError,
  ValidationError,
} from "../utils/errors";

/* ──────────── HELPERS PRIVADOS ──────────── */

async function findTokenOrThrow(token: string) {
  const doc = await Token.findOne({ token });
  if (!doc) throw new NotFoundError("Token");
  return doc;
}

async function findUserByIdOrThrow(userId: Types.ObjectId | string) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError("Usuario");
  return user;
}

async function findUserByEmailOrThrow(email: string) {
  const user = await User.findOne({ email });
  if (!user) throw new NotFoundError("Usuario", email);
  return user;
}

/* ──────────── MÉTODOS PÚBLICOS ──────────── */

export const createAccount = async (data: {
  name: string;
  email: string;
  password: string;
}) => {
  const { name, email, password } = data;

  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ConflictError("El usuario ya esta registrado!");
  }

  const user = new User({ name, email });
  user.password = await hashPassword(password);

  const token = new Token();
  token.token = generateToken();
  token.user = user._id;

  try {
    await AuthEmail.sendConfirmationEmail({
      email: user.email,
      name: user.name,
      token: token.token,
    });
  } catch (emailError) {
    console.error("Fallo el envío de email de confirmación:", emailError);
  }

  await Promise.all([user.save(), token.save()]);
};

export const confirmAccount = async (tokenValue: string) => {
  const tokenDoc = await findTokenOrThrow(tokenValue);

  const user = await User.findById(tokenDoc.user);
  if (!user) {
    throw new NotFoundError("Usuario asociado a este token");
  }

  user.confirmed = true;
  await Promise.all([user.save(), tokenDoc.deleteOne()]);
};

export const login = async (email: string, password: string) => {
  const user = await findUserByEmailOrThrow(email);

  if (!user.confirmed) {
    const token = new Token();
    token.user = user._id;
    token.token = generateToken();
    await token.save();

    try {
      await AuthEmail.sendConfirmationEmail({
        email: user.email,
        name: user.name,
        token: token.token,
      });
    } catch (emailError) {
      console.error("Fallo el reenvío de email de confirmación:", emailError);
    }

    throw new AuthenticationError(
      "La cuenta no ha sido confirmada, hemos enviado un email de confirmacion",
    );
  }

  const isPasswordCorrect = await checkPassword(password, user.password);
  if (!isPasswordCorrect) {
    throw new AuthenticationError("Password incorrecto");
  }

  return generateJWT({ id: user._id });
};

export const requestConfirmationCode = async (email: string) => {
  const user = await findUserByEmailOrThrow(email);

  if (user.confirmed) {
    throw new ConflictError("El usuario ya esta confirmado!");
  }

  const token = new Token();
  token.token = generateToken();
  token.user = user._id;

  try {
    await AuthEmail.sendConfirmationEmail({
      email: user.email,
      name: user.name,
      token: token.token,
    });
  } catch (emailError) {
    console.error("Fallo el reenvío de email de confirmación:", emailError);
  }

  await Promise.allSettled([user.save(), token.save()]);
};

export const forgotPassword = async (email: string) => {
  const user = await findUserByEmailOrThrow(email);

  const token = new Token();
  token.token = generateToken();
  token.user = user._id;
  await token.save();

  try {
    await AuthEmail.sendPasswordResetToken({
      email: user.email,
      name: user.name,
      token: token.token,
    });
  } catch (emailError) {
    console.error("Fallo el envío de email de reset password:", emailError);
  }
};

export const validateToken = async (tokenValue: string) => {
  await findTokenOrThrow(tokenValue);
};

export const updatePasswordWithToken = async (
  tokenValue: string,
  password: string,
) => {
  const tokenDoc = await findTokenOrThrow(tokenValue);

  const user = await findUserByIdOrThrow(tokenDoc.user);

  user.password = await hashPassword(password);
  await Promise.all([user.save(), tokenDoc.deleteOne()]);
};

export const getUser = (user: IUser) => {
  return user;
};

export const updateProfile = async (
  user: IUser,
  data: { name: string; email: string },
) => {
  const { name, email } = data;

  const userExists = await User.findOne({ email });
  if (userExists && !userExists._id.equals(user._id)) {
    throw new ConflictError("El email ya esta registrado");
  }

  user.name = name;
  user.email = email;
  await user.save();
};

export const updateCurrentUserPassword = async (
  userId: Types.ObjectId,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await findUserByIdOrThrow(userId);

  if (!user.password) {
    throw new ValidationError(
      "Este usuario no tiene contraseña configurada (inició con Google)",
    );
  }

  const isPasswordCorrect = await checkPassword(currentPassword, user.password);
  if (!isPasswordCorrect) {
    throw new AuthenticationError("El password actual es incorrecto!");
  }

  user.password = await hashPassword(newPassword);
  await user.save();
};

export const checkPasswordService = async (
  userId: Types.ObjectId,
  password: string,
) => {
  const user = await findUserByIdOrThrow(userId);

  const isPasswordCorrect = await checkPassword(password, user.password);
  if (!isPasswordCorrect) {
    throw new AuthenticationError("El Password es incorrecto");
  }
};

export const googleAuth = async (googleToken: string) => {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${googleToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new AuthenticationError("Token de Google inválido");
  }

  const payload = await response.json();

  if (!payload) {
    throw new ValidationError("Token inválido");
  }

  const { email, name, sub: googleId, email_verified } = payload;

  if (!email_verified) {
    throw new ValidationError("Email de Google no verificado");
  }

  let user = await User.findOne({ email });

  if (user && user.authProvider !== "google") {
    throw new ConflictError(
      "Este email ya está registrado con otro método. Inicia sesión con tu contraseña.",
    );
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

  const token = generateJWT({ id: user._id });

  return { user, token };
};
