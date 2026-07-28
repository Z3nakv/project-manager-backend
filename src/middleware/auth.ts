import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/UserModel";

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
  const bearer = req.headers.authorization;

  if (!bearer) {
    const error = new Error("No Autorizado");
    return res.status(401).json({ error: error.message });
  }
  const [, token] = bearer.split(" ");
  try {
    const jwtSecret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, jwtSecret);

    if (typeof decoded === "object" && decoded.id) {
      const user = await User.findById(decoded.id).select("_id name email");
      if (user) {
        req.user = user;
        next();
      } else {
        res.status(401).json({ error: "Token no valido" });
      }
    } else {
      res.status(401).json({ error: "Token no valido" });
    }
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: "Token No Válido" });
  }
};
