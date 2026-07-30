import { z } from "zod";

export const findMemberByEmailSchema = z.object({
  email: z.string().email("Email no válido"),
});
export type FindMemberByEmailInput = z.infer<typeof findMemberByEmailSchema>;

export const addMemberByIdSchema = z.object({
  id: z.string().length(24, "ID de usuario inválido"),
});
export type AddMemberByIdInput = z.infer<typeof addMemberByIdSchema>;