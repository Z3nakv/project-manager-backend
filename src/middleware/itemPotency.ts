import { NextFunction, Request, Response } from "express";
import { IdempotencyKey } from "../models/IdemPotencyKey";

export const idempotencyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers["idempotency-key"] as string;
  if (!key) return next();

  try {
    // create() falla si `key` ya existe (índice único) — esto es lo que resuelve
    // la condición de carrera de forma atómica, sin ventana de tiempo entre check y set
    await IdempotencyKey.create({ key });
  } catch {
    // Índice duplicado = ya se está procesando o ya se procesó esta key
    const existing = await IdempotencyKey.findOne({ key });

    if (existing?.response) {
      // Ya terminó de procesarse antes — devuelve la MISMA respuesta original
      return res.status(existing.statusCode!).json(existing.response);
    }

    // Existe pero todavía no tiene response = está en curso ahora mismo (concurrente)
    return res.status(409).json({ error: "Solicitud en proceso, intenta de nuevo en un momento" });
  }

  // Intercepta res.json para guardar la respuesta real una vez que el controller responda
  const originalJson = res.json.bind(res);
  res.json =  (body: unknown) => {
    IdempotencyKey.updateOne({ key }, { statusCode: res.statusCode, response: body })
    .exec()
    .catch((err) => console.error("Error guardando idempotency response:", err));
    return originalJson(body);
  };

  next();
};