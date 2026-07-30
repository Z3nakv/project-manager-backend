import { z } from "zod";

export const createNoteSchema = z.object({
  content: z.string().min(1, "El contenido de la nota es necesario").max(500, "La nota es demasiado larga"),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;