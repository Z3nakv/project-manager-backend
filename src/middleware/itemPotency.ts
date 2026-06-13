import { NextFunction, Request, Response } from "express";

const processedKeys = new Map<string, number>();

export const idemPotencyMiddleware = (req : Request, res : Response, next : NextFunction) => {
    const key = req.headers['idempotency-key'] as string;
     
    if(!key) return next();
   console.log({key})
    const now = Date.now();

    processedKeys.forEach((timestamp, k) => {
        if(now - timestamp > 60000) processedKeys.delete(k);
    })

    if(processedKeys.has(key)){
        return res.status(409).json({ error: 'Solicitud duplicada' })
    }

    processedKeys.set(key, now);

    next();
}