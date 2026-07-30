import { z } from "zod";

export const SuggestedTaskSchema = z.object({
  name: z.string(),
  description: z.string(),
  estimatedDays: z.number().optional(),
  label: z.object({text:z.string(), color:z.string()}).optional()
});

export const SuggestTasksResponseSchema = z.object({
  tasks: z.array(SuggestedTaskSchema),
});

export type SuggestTasksResponse = z.infer<typeof SuggestTasksResponseSchema>;