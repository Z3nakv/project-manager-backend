import { Types } from "mongoose";
import { IProject } from "../models/ProjectModel";
import Task, { ILabel, ITask, TaskStatus } from "../models/TaskModel";
import { notifyChangesToTeamSafely } from "./notificationService";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import { IUser } from "../models/UserModel";

type CreateTaskInput = {
  name: string;
  description: string;
};

export const createTask = async (
  project: IProject,
  data: CreateTaskInput,
  triggeredBy: Types.ObjectId,
  triggeredByName: string,
) => {
  const task = new Task(data);
  task.project = project._id;
  project.tasks.push(task._id);
  await Promise.all([task.save(), project.save()]);
  const members = [...project.team, project.manager].filter(Boolean);
  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy,
    projectId: project._id!,
    taskId: task._id!,
    actionType: "TASK_CREATED",
    content: `${triggeredByName} creó la tarea "${task.name}"`,
  });
  return task;
};

export const getTasksByProject = async (projectId: Types.ObjectId) => {
  return Task.find({ project: projectId });
};

export const getTaskById = async (taskId: Types.ObjectId) => {
  const task = await Task.findById(taskId)
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

  if (!task) {
    throw new NotFoundError("Tarea", taskId.toString());
  }
  return task;
};

type bodyInput = {
  name: string;
  description: string;
  deadline: Date;
  labels: ILabel[];
};

export const updateTask = async (
  task: ITask,
  project: IProject,
  user: IUser,
  body: bodyInput,
) => {
  task.name = body.name;
  task.description = body.description;
  task.deadline = body.deadline;
  task.labels = body.labels ?? task.labels;
  await task.save();

  const members = [...project.team, project.manager].filter(Boolean); // elimina undefined y null

  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: task._id,
    actionType: "TASK_UPDATED",
    content: `${user.name} actualizó la tarea "${task.name}"`,
  });
};

export const updateTaskStatus = async (status: TaskStatus, task: ITask, user: IUser, project: IProject) => {
        task.status = status;
        const data = {
          user: user._id,
          status,
        };
        task.completedBy.push(data);
        await task.save();
  
        const members = [...project.team, project.manager].filter(
          Boolean,
        );
  
        await notifyChangesToTeamSafely({
          members: members as Array<{ _id: Types.ObjectId }>,
          triggeredBy: user!._id!,
          projectId: project._id!,
          taskId: task._id!,
          actionType: "TASK_STATUS_UPDATED",
          content: `${user.name} actualizó el estado de la tarea "${task.name}" a "${status}"`,
        });
}

export const deleteTask = async (
  task: ITask,
  project: IProject,
  user: IUser,
) => {
  project.tasks = project.tasks.filter(
    (t) => t?._id.toString() !== task?._id.toString(),
  );
  await Promise.all([task.deleteOne(), project.save()]);

  const members = [...project.team, project.manager].filter(Boolean); // elimina undefined y null

  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user!._id!,
    projectId: project._id!,
    taskId: task._id!,
    actionType: "TASK_DELETED",
    content: `${user!.name} eliminó la tarea "${task.name}"`,
  });
};

export const assignTask = async (
  userIds: string[],
  project: IProject,
  task: ITask,
  user: IUser,
) => {

  if (!project.manager) {
    throw new ConflictError(
      `El proyecto ${project._id} no tiene manager asignado`,
    );
  }
  const validTeamIds = [
    ...project.team.map((id) => id?.toString()),
    project.manager.toString(),
  ];

  const allValid = userIds.every((id: string) => validTeamIds.includes(id));

  if (!allValid) {
    throw new ValidationError("Solo puedes asignar colaboradores del proyecto");
  }

  task.assignedTo = userIds.map((id) => new Types.ObjectId(id));
  await task.save();

  const members = [...project.team, project.manager].filter(Boolean);

  const assignedTaskMembers = members.filter((member) =>
    task.assignedTo.some((assignedId) => assignedId.equals(member!._id)),
  );

  await notifyChangesToTeamSafely({
    members: assignedTaskMembers as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: task._id,
    actionType: "TASK_STATUS_UPDATED",
    content: `${user.name} te asigno la tarea "${task.name}"`,
  });

  return task;
};
