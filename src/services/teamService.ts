import { Types } from "mongoose";
import Project, { IProject } from "../models/ProjectModel";
import User, { IUser } from "../models/UserModel";
import { ConflictError, NotFoundError } from "../utils/errors";
import { notifyChangesToTeamSafely } from "./notificationService";
import { emitProjectAssigned, emitRemovedFromProject } from "../socket/teamEvents";

export const findMemberByEmail = async (email: string) : Promise<IUser> => {
  const user = await User.findOne({ email }).select("_id email name").lean();
  if (!user) throw new NotFoundError("Usuario", email);
  return user;
};

export const getProjectTeam = async (projectId: Types.ObjectId) : Promise<IProject['team']> => {
  const project = await Project.findById(projectId).populate({
    path: "team",
    select: "_id email name",
  }).lean();
  if (!project) throw new NotFoundError("Proyecto", projectId.toString());
  return project.team;
};

export const addMemberById = async (
  userId: Types.ObjectId,
  project: IProject,
  triggeredBy: Types.ObjectId
) : Promise<void> => {
  const user = await User.findById(userId).select("_id");
  if (!user) throw new NotFoundError("Usuario", userId.toString());
  const isProjectMember = project.team.some((team) => team?.toString() === user._id.toString());
  if (isProjectMember) throw new ConflictError("El usuario ya es miembro de este proyecto");
  project.team.push(user._id);
  await project.save();
  const members = [{ _id: userId }];
  const notification = `Te agregaron al proyecto "${project.projectName}"`;
  await notifyChangesToTeamSafely({
    members: members,
    triggeredBy,
    projectId: project._id,
    taskId: null,
    actionType: "MEMBER_ADDED",
    content: notification,
  });
  emitProjectAssigned(userId, notification)
};

export const removeMemberById = async (
  userId: string, 
  project: IProject,
  triggeredBy: Types.ObjectId
) : Promise<void> => {   
    if (!project.team.some((team) => team?.toString() === userId.toString())) {
        throw new NotFoundError("Usuario", userId)
      };
      project.team = project.team.filter((teamMember) => teamMember?.toString() !== userId.toString());
      await project.save();
      const members = [{ _id: new Types.ObjectId(userId) }];
      const notification = `Te eliminaron del proyecto "${project.projectName}"`;
      await notifyChangesToTeamSafely({
        members: members,
        triggeredBy,
        projectId: project._id,
        taskId: null,
        actionType: "MEMBER_REMOVED",
        content: notification,
      });

  emitRemovedFromProject(userId, notification)
}
