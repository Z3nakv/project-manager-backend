import { NextFunction, Request, Response } from "express";
import {
  createTask,
  getTasksByProject,
  getTaskById,
  updateTask,
  deleteTask,
  assignTask,
  updateTaskStatus,
} from "../services/taskService";

export class TaskController {
  static createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await createTask(req.project, req.body, req.user!._id, req.user!.name);
      res.json({
        message: "Tarea creada correctamente",
        project: {
          projectName: req.project.projectName,
          projectTeam: req.project.team,
          projectId: req.project._id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  static getProjectTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tasks = await getTasksByProject(req.project._id);
      if (!tasks)
        return res
          .status(404)
          .json({ error: "No se pudo encontrar las tareas" });
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  };

  static getProjectTask = async (req: Request, res: Response) => {
    try {
      const task = await getTaskById(req.task._id);
      res.status(200).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updateProjectTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await updateTask(req.task, req.project, req.user!, req.body);
      res.json({
        message: "Tarea Actualizada Correctamente",
        project: { projectTeam: req.project.team, projectId: req.project._id },
        taskName: req.task.name,
      });
    } catch (error) {
      next(error);
    }
  };

  static deleteProjectTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteTask(req.task, req.project, req.user!);
      res.json({
        message: "Tarea Eliminada Correctamente",
        project: {
          projectName: req.project.projectName,
          projectTeam: req.project.team,
          projectId: req.project._id,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  static updateTaskStatus = async (req: Request, res: Response) => {
    try {
      await updateTaskStatus(req.body.status, req.task, req.user!, req.project);
      res.json({
        message: "Tarea Actualizada",
        task: { taskName: req.task.name },
        user: { userName: req.user?.name, userId: req.user?._id },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static assignTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await assignTask(req.body.userIds, req.project, req.task, req.user!);
      res.json({
        message: "Tarea asignada correctamente",
        taskName: req.task.name,
        projectName: req.project.projectName,
        projectId: req.project._id,
        userIds: req.body.userIds,
      });
    } catch (error) {
      next(error);
    }
  };
}
