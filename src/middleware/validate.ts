import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ValidationError } from "../utils/errors";

export const validate = (schema: z.ZodType) => {
return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = result.error.issues[0];
      return next(new ValidationError(firstError.message));
    }

    req.body = result.data;
    next();
  };
};

export const validateParams = (schema: z.ZodType) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(new ValidationError(result.error.issues[0].message));
    }
    next();
  };
};