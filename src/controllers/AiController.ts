import { NextFunction, Request, Response } from "express";
import { suggestTasksForProject } from "../services/aiService";

export class AiTasksCreationController {

  static getTasksSuggestions = async (req: Request, res: Response, next: NextFunction) => {
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

      res.json(suggestions.tasks);
    } catch (error) {
      next(error)
    }
  };
}