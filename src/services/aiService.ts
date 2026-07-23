import { ai } from "../config/gemini";
import { getTasksByProject } from "./taskService";

type suggestTasksForProjectProps = {
  projectId: string;
  projectName: string;
  projectDescription: string;
  selectedFields: string[];
  quantity: number;
};
export async function suggestTasksForProject({
  projectId,
  projectName,
  projectDescription,
  selectedFields,
  quantity,
}: suggestTasksForProjectProps) {
  const existingTasks = await getTasksByProject(projectId);
  const existingNames = existingTasks.map((task) => task.name).join(", ");

  const fieldSpecs: Record<string, string> = {
    labels:
      'sugiere etiquetas solo si son claramente relevantes (ej: "Bug", "Backend", "UI"); usa null si ninguna aplica con claridad, no fuerces etiquetas genéricas.',
    estimatedDays:
      "incluye un número si podés estimar la complejidad con criterio; usa null solo si la tarea es demasiado ambigua para estimar.",
  };

  const optionalFields = selectedFields.map((f) => f);

  const fieldsInstruction =
    optionalFields.length > 0
      ? `Cada tarea debe incluir "name" (string) y "description" (string), además de:\n` +
        optionalFields.map((f) => `- ${f}: ${fieldSpecs[f]}`).join("\n")
      : `Cada tarea debe incluir "name" (string) y "description" (string).`;

  const prompt = `
  Proyecto: "${projectName}"
  Descripción: "${projectDescription}"
  Tareas ya existentes: ${existingNames || "ninguna todavía"}

  Sugiere EXACTAMENTE ${quantity} tareas nuevas y relevantes para este proyecto.
  No repitas tareas ya existentes. Sé específico, no genérico.

  ${fieldsInstruction}
  `.trim();

  const properties: Record<string, unknown> = {
    name: { type: "string", description: "Nombre corto de la tarea" },
    description: {
      type: "string",
      description: "Descripción detallada de la tarea",
    },
  };

  if(selectedFields.includes("estimatedDays")) {
    properties.estimatedDays = {
      type: ["integer", "null"],
          description:
            "Días estimados según complejidad: simple 1-3, media 4-7, compleja 8-14. null si no aplica.",
    }
  }
  if(selectedFields.includes("labels")) {
    properties.labels = {
      type: ["array", "null"],
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              color: {
                type: "string",
                enum: [
                  "red",
                  "orange",
                  "amber",
                  "emerald",
                  "sky",
                  "indigo",
                  "purple",
                  "pink",
                  "slate",
                ],
              },
            },
            required: ["text", "color"],
          },
          description: "Etiquetas relevantes para la tarea. null si no aplica."}
  }

  const responseJsonSchema = {
    type: "array",
    items: {
      type: "object",
      properties: properties,
      required: ["name", "description"],
    },
  };

  const interaction = await ai.interactions.create({
    model: "gemini-3.1-flash-lite",
    input: prompt,
    generation_config: {
      thinking_level: "low",
    },
    response_format: responseJsonSchema,
  });

  if (!interaction.output_text) {
    throw new Error("La IA no generó una respuesta de texto.");
  }

  const raw = JSON.parse(interaction.output_text);
  return raw;
}
