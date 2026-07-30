import { z } from "zod";

export const projectIdParamSchema = z.object({
  projectId: z.string().length(24, "ID de proyecto inválido"),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().length(24, "ID de tarea inválido"),
});

// si una ruta tiene ambos params en la URL (ej: /:projectId/tasks/:taskId)
export const projectAndTaskIdParamSchema = z.object({
  projectId: z.string().length(24, "ID de proyecto inválido"),
  taskId: z.string().length(24, "ID de tarea inválido"),
});