import { Request, Response } from "express";
import Project from "../models/ProjectModel";
import { Types } from "mongoose";
import { notifyChangesToTeam } from "../services/notificationService";
import { createProject, getEditProjectById, getProjectById, updateProject } from "../services/projectService";

export class ProjectController {
  static createProject = async (req: Request, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "No autenticado" });
      return;
    }
    const userId = req.user._id;
    const body = req.body;
    try {
      await createProject(body, userId);
      res.status(201).json({message: "Proyecto creado correctamente"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error al crear el proyecto" });
    }
  };

  static getProjects = async (req: Request, res: Response) => {
    try {
      const projects = await Project.find({
        $or: [{ manager: req.user?._id }, { team: { $in: [req.user?._id] } }],
      })
        .populate("manager")
        .populate("team")
        .populate({
          path: "tasks",
          select: "status deadline",
        });
      res.status(200).json(projects);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error al obtener los proyectos" });
    }
  };

  static getProjectById = async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;
    try {
      const project = await getProjectById(projectId);

      if (!project) {
        const error = new Error("Proyecto no encontrado");
        return res.status(404).json({ error: error.message });
      }

      res.status(200).json(project);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error al obtener el proyecto" });
    }
  };

  static getEditProjectById = async (req: Request, res: Response) => {
    const projectId = req.params.projectId as string;
    try {
      const project = await getEditProjectById(projectId);
       if (!project) {
        const error = new Error("Proyecto no encontrado");
        return res.status(404).json({ error: error.message });
      }
      res.status(200).json({
          projectName: project.projectName,
          clientName: project.clientName,
          description: project.description,
          team: project.team
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error al obtener el proyecto" });
    }
  }

  static updateProject = async (req: Request, res: Response) => {
    const project = req.project;
    const body = req.body;
    try {
      await updateProject({project, body});
      await req.project.save();
      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null
      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: null, // No hay una tarea específica asociada a esta notificación
        actionType: "PROJECT_UPDATED",
        content: `${req.user!.name} actualizó el proyecto "${req.project.projectName}"`,
      });
      res.json({message: "Proyecto Actualizado"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error al actualizar el proyecto" });
    }
  };

  static deleteProject = async (req: Request, res: Response) => {
    try {
      await req.project.deleteOne();
      const members = [...req.project.team, req.project.manager].filter(Boolean); // elimina undefined y null
      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: null, // No hay una tarea específica asociada a esta notificación
        actionType: "PROJECT_DELETED",
        content: `${req.user!.name} eliminó el proyecto "${req.project.projectName}"`,
      });
      res.json({message: "Proyecto Eliminado"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error al eliminar el proyecto" });
    }
  };
}
