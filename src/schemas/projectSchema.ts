import z from "zod";

export const CreateProjectSchema = z.object({
  projectName: z.string().min(1, "El nombre del proyecto es necesario"),
  clientName: z.string().min(1, "El nombre del cliente es necesario"),
  description: z.string().min(1, "La descripción es necesaria")
});

export type CreateProject = z.infer<typeof CreateProjectSchema>