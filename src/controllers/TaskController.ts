import { Request, Response } from "express";
import Task from "../models/TaskModel";
import { notifyChangesToTeam } from "../services/notificationService";
import { Types } from "mongoose";

export class TaskController {
  static createTask = async (req: Request, res: Response) => {
    try {
      const task = new Task(req.body);
      task.project = req.project._id;
      req.project.tasks.push(task._id);
      await Promise.all([task.save(), req.project.save()]);

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id!,
        taskId: task._id!,
        actionType: "TASK_CREATED",
        content: `${req.user!.name} creó la tarea "${task.name}"`,
      });

      res.json({
        message: "Tarea creada correctamente",
        project: {
          projectName: req.project.projectName,
          projectTeam: req.project.team,
          projectId: req.project._id,
        },
      });
    } catch (error) {
      console.error(error);
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
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static getProjectTask = async (req: Request, res: Response) => {
    try {
      const task = await Task.findById(req.task._id)
        .populate({ path: "completedBy", populate: { path: "user" } })
        .populate({
          path: "notes",
          populate: { path: "createdBy", select: "_id email name" },
        })
        .populate({
          path: "project",
          populate: [
            { path: "team", select: "_id" },
            { path: "manager", select: "_id" },
          ],
        })
        .select("-assignedTo");

      res.status(200).json(task);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updateProjectTask = async (req: Request, res: Response) => {
    try {
      req.task.name = req.body.name;
      req.task.description = req.body.description;
      req.task.deadline = req.body.deadline;
      req.task.labels = req.body.labels ?? req.task.labels;
      await req.task.save();

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id!,
        taskId: req.task._id!,
        actionType: "TASK_UPDATED",
        content: `${req.user!.name} actualizó la tarea "${req.task.name}"`,
      });

      res.json({
        message: "Tarea Actualizada Correctamente",
        project: { projectTeam: req.project.team, projectId: req.project._id },
        taskName: req.task.name,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static deleteProjectTask = async (req: Request, res: Response) => {
    try {
      req.project.tasks = req.project.tasks.filter(
        (task) => task?._id.toString() !== req.task._id.toString(),
      );
      await Promise.all([req.task.deleteOne(), req.project.save()]);

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id!,
        taskId: req.task._id!,
        actionType: "TASK_DELETED",
        content: `${req.user!.name} eliminó la tarea "${req.task.name}"`,
      });

      res.json({
        message: "Tarea Eliminada Correctamente",
        project: {
          projectName: req.project.projectName,
          projectTeam: req.project.team,
          projectId: req.project._id,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updateTaskStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      req.task.status = status;
      const data = {
        user: req.user!._id,
        status,
      };
      req.task.completedBy.push(data);
      await req.task.save();

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      ); // elimina undefined y null

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id!,
        taskId: req.task._id!,
        actionType: "TASK_STATUS_UPDATED",
        content: `${req.user!.name} actualizó el estado de la tarea "${req.task.name}" a "${status}"`,
      });

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

  static assignTask = async (req: Request, res: Response) => {
    try {
      const { userIds } = req.body;

      const validTeamIds = [
        ...req.project.team.map((id) => id?.toString()),
        req.project.manager?.toString(),
      ];

      const allValid = userIds.every((id: string) => validTeamIds.includes(id));

      if (!allValid) {
        return res
          .status(400)
          .json({ error: "Solo puedes asignar colaboradores del proyecto" });
      }

      req.task.assignedTo = userIds;
      await req.task.save();

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      );

      const assignedTaskMembers = members.filter((member) =>
        req.task.assignedTo.some((assignedId) =>
          assignedId.equals(member!._id),
        ),
      );

      await notifyChangesToTeam({
        members: assignedTaskMembers as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id!,
        taskId: req.task._id!,
        actionType: "TASK_STATUS_UPDATED",
        content: `${req.user!.name} te asigno la tarea "${req.task.name}"`,
      });

      res.json({
        message: "Tarea asignada correctamente",
        taskName: req.task.name,
        projectName: req.project.projectName,
        projectId: req.project._id,
        userIds: userIds,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };
}
