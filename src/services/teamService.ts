import { Types } from "mongoose";
import Project, { IProject } from "../models/ProjectModel";
import User, { IUser } from "../models/UserModel";
import { ConflictError, NotFoundError } from "../utils/errors";
import { notifyChangesToTeam } from "./notificationService";

export const findMemberByEmail = async (email: string) => {
  const user = await User.findOne({ email }).select("_id email name");
  if (!user) {
    throw new NotFoundError("Usuario", email);
  }
  return user;
};

export const getProjectTeam = async (projectId: Types.ObjectId) => {
  const project = await Project.findById(projectId).populate({
    path: "team",
    select: "_id email name",
  });
  if (!project) {
    throw new NotFoundError("Proyecto", projectId.toString());
  }
  return project.team;
};

export const addMemberById = async (
  userId: Types.ObjectId,
  project: IProject,
) => {
  const user = await User.findById(userId).select("_id");
  if (!user) {
    throw new NotFoundError("Usuario", userId.toString());
  }
  const isProjectMember = project.team.some(
    (team) => team?.toString() === user._id.toString(),
  );
  if (isProjectMember) {
    throw new ConflictError("El usuario ya es miembro de este proyecto");
  };

  project.team.push(user._id);
  await project.save();

  const members = [{ _id: userId }];

  await notifyChangesToTeam({
    members: members as Array<{ _id: Types.ObjectId }>,
    triggeredBy: user._id,
    projectId: project._id,
    taskId: null,
    actionType: "MEMBER_ADDED",
    content: `${user.name} te agrego al proyecto "${project.projectName}"`,
  });
};

export const removeMemberById = async (userId: string, project: IProject, user: IUser) => {
    
    if (!project.team.some((team) => team?.toString() === userId.toString())) {
        throw new NotFoundError("Usuario", userId)
      };

      project.team = project.team.filter(
        (teamMember) => teamMember?.toString() !== userId.toString(),
      );
      await project.save();

      const members = [{ _id: new Types.ObjectId(userId) }];

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: new Types.ObjectId(userId),
        projectId: project._id,
        taskId: null,
        actionType: "MEMBER_REMOVED",
        content: `${user.name} te elimino del proyecto "${project.projectName}"`,
      });
}
