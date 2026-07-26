import { Request, Response } from "express";
import { suggestTasksForProject } from "../services/aiService";

export class AiTasksCreationController {

  static getTasksSuggestions = async (req: Request, res: Response) => {
    try {
      const selectedFields = req.body.selectedFields;
      const quantity = req.body.quantity;

      const suggestions = await suggestTasksForProject({
        projectId: req.project._id.toString(),
        projectName: req.project.projectName,
        projectDescription: req.project.description,
        selectedFields,
        quantity,
      });

      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Hubo un error al generar las sugerencias" });
    }
  };
}