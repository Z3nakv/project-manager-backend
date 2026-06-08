import { Request, Response } from "express";
import Project from "../models/ProjectModel";
import { Types } from "mongoose";
import { notifyChangesToTeam } from "../services/notificationService";

export class ProjectController {
  static createProject = async (req: Request, res: Response) => {
    try {
      const project = await Project.create(req.body);
      project.manager = req.user?._id;
      await project.save();
      res.status(201).send("Proyecto creado correctamente");
    } catch (error) {
      console.log(error);
    }
  };

  static getProjects = async (req: Request, res: Response) => {
    try {
      const projects = await Project.find({
        $or: [{ manager: req.user?._id }, { team: { $in: [req.user?._id] } }]})
        .populate("manager", "_id")
        .populate("team", "_id")
        .populate("tasks", "_id");
      res.status(200).json(projects);
    } catch (error) {
      console.log(error);
    }
  };

  static getProjectByID = async (req: Request, res: Response) => {
    try {
      const projectID = req.params.projectID;

      const project = await Project.findById(projectID)
        .populate({
          path: "tasks",
          populate: [
            {
              path: "notes",
              populate: {
                path: "createdBy",
              },
            },
            {
              path: "completedBy",
              populate: {
                path: "user",
                select: "_id email name",
              },
            },
          ],
        })
        .populate("manager", "_id")
        .populate("team", "_id");

      if (!project) {
        const error = new Error("Proyecto no encontrado");
        return res.status(404).json({ error: error.message });
      }

      res.status(200).json(project);
    } catch (error) {
      console.log(error);
    }
  };

  static updateProject = async (req: Request, res: Response) => {
    try {
      req.project.clientName = req.body.clientName;
      req.project.projectName = req.body.projectName;
      req.project.description = req.body.description;

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null
      await req.project.save();

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: null, // No hay una tarea específica asociada a esta notificación
        content: `${req.user!.name} actualizó el proyecto "${req.project.projectName}"`,
      });
      
      res.send("Proyecto Actualizado");
    } catch (error) {
      console.log(error);
    }
  };

  static deleteProject = async (req: Request, res: Response) => {
    try {
      await req.project.deleteOne();

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: null, // No hay una tarea específica asociada a esta notificación
        content: `${req.user!.name} actualizó el proyecto "${req.project.projectName}"`,
      });

      res.send("Proyecto Eliminado");
    } catch (error) {
      console.log(error);
    }
  };
}
