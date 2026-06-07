import { Request, Response } from "express";
import Project from "../models/ProjectModel";

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
        $or: [{ manager: req.user?._id }, { team: { $in: [req.user?._id] } }],
      }).populate("manager", "_id");
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

      await req.project.save();
      res.send("Proyecto Actualizado");
    } catch (error) {
      console.log(error);
    }
  };

  static deleteProject = async (req: Request, res: Response) => {
    try {
      await req.project.deleteOne();
      res.send("Proyecto Eliminado");
    } catch (error) {
      console.log(error);
    }
  };
}
