import { IProject } from "../models/ProjectModel";
import { getProjectMembers } from "../utils/projectHelpers";
import { truncate } from "../utils/truncate";
import { emitToProjectMembers } from "./notificationEmitter";
import { Types } from "mongoose";

export const emitProjectUpdated = (project: IProject, triggeredBy: Types.ObjectId) => {
  emitToProjectMembers(
    getProjectMembers(project),
    triggeredBy,
    "project_updated_notification",
    {message: `El proyecto "${truncate(project.projectName)}" ha sido actualizado`}
  );
};

export const emitProjectDeleted = (project: IProject, triggeredBy: Types.ObjectId, triggeredByName: string) => {
  emitToProjectMembers(
    getProjectMembers(project),
    triggeredBy,
    "project_deleted_notification",
    {
      message: `${triggeredByName} ha eliminado el proyecto "${truncate(project.projectName)}"`
    },
  );
};