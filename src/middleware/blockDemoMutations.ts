import { NextFunction, Request, Response } from "express";

export const blockDemoMutations = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?._id === process.env.DEMO_USER_ID) {
    return res.status(403).json({ error: "La cuenta demo es de solo lectura" });
  }
  next();
};