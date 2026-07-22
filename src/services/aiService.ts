import { ai } from "../config/gemini";
import { getTasksByProject } from "./taskService";

type suggestTasksForProjectProps = {
  projectId: string;
  projectName: string;
  projectDescription: string;
};
export async function suggestTasksForProject({
  projectId,
  projectName,
  projectDescription,
}: suggestTasksForProjectProps) {
  const existingTasks = await getTasksByProject(projectId);
  const existingNames = existingTasks.map((task) => task.name).join(", ");

  const prompt = `
    Proyecto: "${projectName}"
    Descripcion: "${projectDescription}"
    Tareas ya existentes: ${existingNames || "ninguna todavia"}

    Sugiere entre 4 y 6 tareas nuevas y relevantes para este proyecto.
    No repitas tareas ya existentes. Se especifico, no generico.
    Responde SOLO con un JSON array de objetos {name, description}.
    `.trim();

  const interaction  = await ai.interactions.create({
    model: "gemini-3.5-flash",
    input: prompt,
    generation_config: {
    thinking_level: 'low',
  },
  });

  if (!interaction.output_text) {
  throw new Error('La IA no generó una respuesta de texto.')
}

  const raw = JSON.parse(interaction.output_text);
  return raw
}
