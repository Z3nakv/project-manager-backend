import { z } from "zod";
import { labelColor } from "../models/TaskModel";

export const createTaskSchema = z.object({
  name: z.string().min(1, "El nombre de la tarea es necesario"),
  description: z.string().min(1, "La descripción es necesaria"),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  name: z.string().min(1, "El nombre de la tarea es necesario"),
  description: z.string().min(1, "La descripción es necesaria"),
  deadline: z.coerce.date().optional(),
  labels: z.array(z.object({ text: z.string(), color: z.enum(Object.values(labelColor))})),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const assignTaskSchema = z.object({
  userIds: z.array(z.string().length(24, "ID de usuario inválido")).min(1, "Debes asignar al menos un usuario"),
});
export type AssignTaskInput = z.infer<typeof assignTaskSchema>;