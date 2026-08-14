import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/UserModel";
import { AuthenticationError } from "../utils/errors";

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const bearer = req.headers.authorization;

    if (!bearer) {
      throw new AuthenticationError("No autorizado");
    }
    const [, token] = bearer.split(" ");
    const jwtSecret = process.env.JWT_SECRET!;
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (jwtError) {
      if (jwtError instanceof Error && jwtError.name === "TokenExpiredError") {
        throw new AuthenticationError(
          "Tu sesión ha expirado, inicia sesión de nuevo",
        );
      }
      throw new AuthenticationError("Token no válido");
    }

    if (typeof decoded !== "object" || !decoded.id) {
      throw new AuthenticationError("Token no válido");
    }

    const user = await User.findById(decoded.id).select("_id name email isEphemeralDemo");
    if (!user) {
      throw new AuthenticationError("Token no válido");
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
