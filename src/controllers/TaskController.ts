import { Request, Response } from "express";
import Task from "../models/TaskModel";
import { notifyTaskStatusUpdated } from "../services/notificationService";
import { Types } from "mongoose";

export class TaskController {
  static createTask = async (req: Request, res: Response) => {
    try {
      const task = new Task(req.body);
      task.project = req.project._id;
      req.project.tasks.push(task._id);
      await Promise.allSettled([task.save(), req.project.save()]);

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyTaskStatusUpdated({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: task._id,
        content: `${req.user!.name} creó la tarea "${task.name}"`,
      });

      res.json({ message: "Tarea creada correctamente", project: req.project });
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static getProjectTasks = async (req: Request, res: Response) => {
    try {
      const tasks = await Task.find({ project: req.project._id }).populate(
        "project",
      );
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static getProjectTask = async (req: Request, res: Response) => {
    try {
      const task = await Task.findById(req.task._id)
        .populate({ path: "notes" })
        .populate({ path: "completedBy.user" });

      res.status(200).json(task);
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updateProjectTask = async (req: Request, res: Response) => {
    try {
      req.task.name = req.body.name;
      req.task.description = req.body.description;
      await req.task.save();

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyTaskStatusUpdated({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: req.task._id,
        content: `${req.user!.name} actualizó el estado de la tarea "${req.task.name}" a "${status}"`,
      });
      
      res.send("Tarea Actualizada Correctamente");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static deleteProjectTask = async (req: Request, res: Response) => {
    try {
      req.project.tasks = req.project.tasks.filter(
        (task) => task?._id.toString() !== req.task._id.toString(),
      );
      await Promise.allSettled([req.task.deleteOne(), req.project.save()]);

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyTaskStatusUpdated({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: req.task._id,
        content: `${req.user!.name} eliminó la tarea "${req.task.name}"`,
      });

      res.send({
        message: "Tarea Eliminada Correctamente",
        project: req.project,
      });
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updateTaskStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      req.task.status = status;
      const data = {
        user: req.user?._id!,
        status,
      };
      req.task.completedBy.push(data);
      await req.task.save();

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyTaskStatusUpdated({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: req.task._id,
        content: `${req.user!.name} actualizó el estado de la tarea "${req.task.name}" a "${status}"`,
      });

      res.send({
        message: "Tarea Actualizada",
        project: req.project,
        task: req.task,
      });
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };
}
