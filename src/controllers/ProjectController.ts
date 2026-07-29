import { NextFunction, Request, Response } from "express";
import { createProject, deleteProject, getEditProjectById, getProjectById, getProjects, updateProject } from "../services/projectService";

export class ProjectController {
  static createProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await createProject(req.body, req.user!._id);
      res.status(201).json({message: "Proyecto creado correctamente"});
    } catch (error) {
      next(error);
    }
  };

  static getProjects = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projects = await getProjects(req.user!)
      res.status(200).json(projects);
    } catch (error) {
      next(error);
    }
  };

  static getProjectById = async (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.params.projectId as string;
    try {
      const project = await getProjectById(projectId);
      res.status(200).json(project);
    } catch (error) {
      next(error);
    }
  };

  static getEditProjectById = async (req: Request, res: Response, next: NextFunction) => {
    const projectId = req.params.projectId as string;
    try {
      const project = await getEditProjectById(projectId);
      res.status(200).json({
          projectName: project.projectName,
          clientName: project.clientName,
          description: project.description,
          team: project.team
      });
    } catch (error) {
      next(error);
    }
  }

  static updateProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateProject(req.project, req.body, req.user!);
      res.json({message: "Proyecto Actualizado"});
    } catch (error) {
      next(error)
    }
  };

  static deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteProject(req.project, req.user!);
      res.json({message: "Proyecto Eliminado"});
    } catch (error) {
      next(error);
    }
  };
}
