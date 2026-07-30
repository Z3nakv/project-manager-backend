import { Types } from "mongoose";
import { IProject } from "../models/ProjectModel";

export function getProjectMembers(project: IProject): Array<{ _id: Types.ObjectId }> {
  return [...project.team, project.manager].filter(Boolean) as Array<{ _id: Types.ObjectId }>;
}