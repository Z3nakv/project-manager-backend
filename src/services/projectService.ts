import { Types } from "mongoose";
import Project, { IProject } from "../models/ProjectModel";
import { IUser } from "../models/UserModel";
import { NotFoundError } from "../utils/errors";
import { notifyChangesToTeamSafely } from "./notificationService";

export const createProject = async (
  body: { projectName: string; clientName: string; description: string },
  userId: Types.ObjectId,
) => {
  const project = await Project.create({ ...body, manager: userId });
  return project;
};

export const getProjects = async (user: IUser) => {
  return Project.find({
    $or: [{ manager: user._id }, { team: { $in: [user._id] } }],
  })
    .populate("manager")
    .populate("team")
    .populate({
      path: "tasks",
      select: "status deadline",
    });
};

export const getProjectById = async (projectId: string) => {
  const project = await Project.findById(projectId)
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
        {
          path: "project",
          populate: [
            {
              path: "team",
              select: "_id",
            },
            {
              path: "manager",
              select: "_id",
            },
          ],
        },
        {
          path: "assignedTo",
          select: "_id email name avatar",
        },
      ],
    })
    .populate("manager")
    .populate("team");

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return project;
};

export const getEditProjectById = async (projectId: string) => {
  const project = await Project.findById(projectId).populate({
    path: "team",
    select: "_id",
  });

  if (!project) {
    throw new NotFoundError("Project", projectId);
  }

  return project;
};

export const updateProject = async (
  project: IProject,
  body: { clientName: string; projectName: string; description: string },
  user: IUser,
) => {
  project.clientName = body.clientName;
  project.projectName = body.projectName;
  project.description = body.description;

  await project.save();
  const members = [...project.team, project.manager].filter(Boolean); // elimina undefined y null
  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user!._id!,
    projectId: project._id,
    taskId: null,
    actionType: "PROJECT_UPDATED",
    content: `${user!.name} actualizó el proyecto "${project.projectName}"`,
  });
};

export const deleteProject = async (project: IProject, user: IUser) => {
  await project.deleteOne();
  const members = [...project.team, project.manager].filter(Boolean); // elimina undefined y null
  await notifyChangesToTeamSafely({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: null,
    actionType: "PROJECT_DELETED",
    content: `${user.name} eliminó el proyecto "${project.projectName}"`,
  });
};
