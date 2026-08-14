import { Types } from "mongoose";
import { IProject } from "../models/ProjectModel";
import Task, { ITask, TaskStatus } from "../models/TaskModel";
import { notifyChangesToTeamSafely } from "./notificationService";
import { ConflictError, NotFoundError, ValidationError } from "../utils/errors";
import { IUser } from "../models/UserModel";
import { getProjectMembers } from "../utils/projectHelpers";
import { CreateTaskInput, UpdateTaskInput } from "../schemas/taskSchema";
import { emitTaskAssigned, emitTaskCreated, emitTaskDeleted, emitTaskStatusUpdated, emitTaskUpdated } from "../socket/taskEvents";

export const createTask = async (
  project: IProject,
  data: CreateTaskInput,
  triggeredBy: Types.ObjectId,
  triggeredByName: string,
) : Promise<ITask> => {
  const task = new Task(data);
  task.project = project._id;
  project.tasks.push(task._id);
  await Promise.all([task.save(), project.save()]);
  const members = getProjectMembers(project);
  await notifyChangesToTeamSafely({
    members: members,
    triggeredBy,
    projectId: project._id!,
    taskId: task._id!,
    actionType: "TASK_CREATED",
    content: `${triggeredByName} creó la tarea "${task.name}"`,
  });
  emitTaskCreated(project, task.name, triggeredBy);
  return task;
};

export const getTasksByProject = async (projectId: Types.ObjectId) : Promise<ITask[]> => {
  return Task.find({ project: projectId }).lean();
};

export const getTaskById = async (taskId: Types.ObjectId) : Promise<ITask> => {
  const task = await Task.findById(taskId)
    .populate({ path: "completedBy", populate: { path: "user" } })
    .populate({ path: "project", populate: [{path:"team", select:"_id"},{path:"manager", select:"_id"}]})
    .populate({
      path: "notes",
      populate: { path: "createdBy", select: "_id email name" },
    })
    .select("-assignedTo")
    .lean();
  if (!task) throw new NotFoundError("Tarea", taskId.toString());
  return task;
};

export const updateTask = async (
  task: ITask,
  project: IProject,
  user: IUser,
  body: UpdateTaskInput,
) : Promise<void> => {
  task.name = body.name;
  task.description = body.description;
  task.deadline = body.deadline ?? task.deadline;
  task.labels = body.labels ?? task.labels;
  await task.save();

  const members = getProjectMembers(project);
  await notifyChangesToTeamSafely({
    members: members,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: task._id,
    actionType: "TASK_UPDATED",
    content: `${user.name} actualizó la tarea "${task.name}"`,
  });
  emitTaskUpdated(project, task.name, user._id,)
};

export const updateTaskStatus = async (
  status: TaskStatus, 
  task: ITask, 
  user: IUser, 
  project: IProject) : Promise<void> => {
        task.status = status;
        const data = {
          user: user._id,
          status,
        };
        task.completedBy.push(data);
        await task.save();
  
        const members = getProjectMembers(project);
        const notification = `${user.name} actualizó el estado de la tarea "${task.name}" del proyecto ${project.projectName} a "${status}"`;
        await notifyChangesToTeamSafely({
          members: members,
          triggeredBy: user!._id!,
          projectId: project._id!,
          taskId: task._id!,
          actionType: "TASK_STATUS_UPDATED",
          content: notification,
        });
  emitTaskStatusUpdated(project, user._id)
}

export const deleteTask = async (
  task: ITask,
  project: IProject,
  user: IUser,
) : Promise<void> => {
  project.tasks = project.tasks.filter(
    (t) => t?._id.toString() !== task?._id.toString(),
  );
  await Promise.all([task.deleteOne(), project.save()]);

  const members = getProjectMembers(project);
  await notifyChangesToTeamSafely({
    members: members,
    triggeredBy: user!._id!,
    projectId: project._id!,
    taskId: task._id!,
    actionType: "TASK_DELETED",
    content: `${user!.name} eliminó la tarea "${task.name}"`,
  });
  emitTaskDeleted(project, task.name, user._id);
};

export const assignTask = async (
  userIds: string[],
  project: IProject,
  task: ITask,
  user: IUser,
) : Promise<ITask> => {

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

  if (!allValid) throw new ValidationError("Solo puedes asignar colaboradores del proyecto");

  task.assignedTo = userIds.map((id) => new Types.ObjectId(id));
  await task.save();

  const members = getProjectMembers(project);
  const assignedTaskMembers = members.filter((member) =>
    task.assignedTo.some((assignedId) => assignedId.equals(member!._id)),
  );
  const notification = `${user.name} te asigno la tarea "${task.name}" del proyecto ${project.projectName}`
  await notifyChangesToTeamSafely({
    members: assignedTaskMembers,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: task._id,
    actionType: "TASK_STATUS_UPDATED",
    content: notification,
  });
  emitTaskAssigned(project, user._id)

  return task;
};
