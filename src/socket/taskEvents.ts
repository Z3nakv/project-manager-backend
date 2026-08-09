import { Types } from "mongoose"
import { IProject } from "../models/ProjectModel"
import { emitToProjectMembers } from "./notificationEmitter"
import { getProjectMembers } from "../utils/projectHelpers"

export const emitTaskCreated = (project: IProject, taskName: string, triggeredBy: Types.ObjectId) => {
    emitToProjectMembers(
        getProjectMembers(project),
        triggeredBy,
        "task_created_notification",
        {
            message: `Se ha creado la tarea ${taskName} en el proyecto ${project.projectName}`,
            projectId: project._id
        }
    )
}

export const emitTaskUpdated = (project:IProject, taskName:string, triggeredBy:Types.ObjectId) => {
    emitToProjectMembers(
        getProjectMembers(project),
        triggeredBy,
        "task_updated_notification",
        {message: `Se ha actualizado la tarea ${taskName}`, 
        projectId: project._id}
    )
}

export const emitTaskDeleted = (project:IProject, taskName:string, triggeredBy:Types.ObjectId) => {
    emitToProjectMembers(
        getProjectMembers(project),
        triggeredBy,
        "task_deleted_notification",
        {message: `Se elimino la tarea ${taskName} del proyecto ${project.projectName}`, 
        projectId: project._id}
    )
}

export const emitTaskAssigned = (project:IProject, triggeredBy:Types.ObjectId, notification: string) => {
    emitToProjectMembers(
        getProjectMembers(project),
        triggeredBy,
        "assigned_task_notification",
        {message: notification, 
        projectId: project._id}
    )
}

export const emitTaskStatusUpdated = (project:IProject, triggeredBy:Types.ObjectId, notification: string) => {
    emitToProjectMembers(
        getProjectMembers(project),
        triggeredBy,
        "task_status_updated_notification",
        {message: notification, 
        projectId: project._id}
    )
}