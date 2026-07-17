import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const handleUploadErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "El archivo excede el límite de 5MB" });
    }
    return res.status(400).json({ error: err.message });
  }

  if (err) {
    // Este es el error que lanzas tú mismo en imageFilter
    return res.status(400).json({ error: err.message });
  }

  next();
};