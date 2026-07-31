import { Types } from "mongoose";
import Project, { IProject } from "../models/ProjectModel";
import { IUser } from "../models/UserModel";
import { NotFoundError } from "../utils/errors";
import { notifyChangesToTeamSafely } from "./notificationService";
import { CreateProject } from "../schemas/projectSchema";
import { getProjectMembers } from "../utils/projectHelpers";
import { emitProjectDeleted, emitProjectUpdated } from "../socket/projectEvents";

export const createProject = async (body: CreateProject,userId: Types.ObjectId) : Promise<IProject> => {
  const project = await Project.create({ ...body, manager: userId });
  return project;
};

export const getProjects = async (user: IUser) : Promise<IProject[]> => {
  return Project.find({
    $or: [{ manager: user._id }, { team: { $in: [user._id] } }],
  })
    .populate({path:"manager", select:"_id name avatar"})
    .populate({path:"team", select:"_id name avatar"})
    .populate({
      path: "tasks",
      select: "_id status deadline",
    })
    .lean();
};

export const getProjectById = async (projectId: string) : Promise<IProject> => {
  const project = await Project.findById(projectId)
    .select("_id projectName clientName description tasks manager")
    .populate({
      path: "tasks",
      select: ("-completedBy -updatedAt -project"),
      populate: [
        {
          path: "notes",
          select: "_id completed content"
        },
        {
          path: "assignedTo",
          select: "_id name avatar",
        },
      ],
    })
    .populate({path: "manager", select: "_id name avatar"})
    .populate({path: "team", select: "_id name avatar"})
    .lean();

  if (!project) throw new NotFoundError("Project", projectId);
  return project;
};

export const getEditProjectById = async (projectId: string) : Promise<IProject> => {
  const project = await Project.findById(projectId).populate({path: "team",select: "_id"}).lean();
  if (!project) throw new NotFoundError("Project", projectId);
  return project;
};

export const updateProject = async (project: IProject, body: CreateProject, user: IUser) : Promise<void> => {
  project.clientName = body.clientName;
  project.projectName = body.projectName;
  project.description = body.description;

  await project.save();
  const members = getProjectMembers(project);
  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: null,
    actionType: "PROJECT_UPDATED",
    content: `${user.name} actualizó el proyecto "${project.projectName}"`,
  });
  emitProjectUpdated(project, user._id);
};

export const deleteProject = async (project: IProject, user: IUser) : Promise<void> => {
  await project.deleteOne();
  const members = getProjectMembers(project);
  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: null,
    actionType: "PROJECT_DELETED",
    content: `${user.name} eliminó el proyecto "${project.projectName}"`,
  });
  emitProjectDeleted(project, user._id, user.name);
};
