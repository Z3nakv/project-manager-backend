import { Request, Response } from "express";
import { suggestTasksForProject } from "../services/aiService";
import { getProjectById } from "../services/projectService";

export class AiTasksCreationController {

  static getTasksSuggestions = async (req: Request, res: Response) => {
  const projectId = req.params.projectId.toString()!;
  const selectedFields = req.body.selectedFields; 
  const quantity = req.body.quantity;

  const project = await getProjectById(projectId);
  if (!project) {
    res.status(404).json({ error: "Proyecto no encontrado." });
    return;
  }
  const suggestions = await suggestTasksForProject({
    projectId: project._id.toString(),
    projectName: project.projectName,
    projectDescription: project.description,
    selectedFields,
    quantity
  });
  
  res.json(suggestions);
};
}

