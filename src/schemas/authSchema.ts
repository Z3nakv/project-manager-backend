import { z } from "zod";
import { IUser } from "../models/UserModel";

export const createAccountSchema = z.object({
  name: z.string().min(1, "El nombre es necesario"),
  email: z.email("Email no válido"),
  password: z.string().min(8, "El password debe tener al menos 8 caracteres"),
});
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const loginSchema = z.object({
  email: z.email("Email no válido"),
  password: z.string().min(1, "El password es necesario"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(1, "El nombre es necesario"),
  email: z.email("Email no válido"),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updatePasswordSchema = z.object({
  current_password: z.string().min(1, "El password actual es necesario"),
  password: z.string().min(8, "El nuevo password debe tener al menos 8 caracteres"),
});
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export interface GoogleAuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}