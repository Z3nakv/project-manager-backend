// models/Notification.ts
import { Schema, model, Types, PopulatedDoc, Document } from "mongoose";
import { IUser } from "./UserModel";
import { IProject } from "./ProjectModel";
import { ITask } from "./TaskModel";

export interface INotification extends Document {
    user: PopulatedDoc<IUser & Document>
    triggeredBy: PopulatedDoc<IUser & Document>
    project: PopulatedDoc<IProject & Document>
    task: PopulatedDoc<ITask & Document>
    type: NotificationType
    content: string
    read: boolean
}

export const notificationTypes = {
  TASK_UPDATED: "task_updated",
  TASK_STATUS_UPDATED: "task_status_updated",
  TASK_CREATED: "task_created",
  TASK_DELETED: "task_deleted",
  PROJECT_UPDATED: "project_updated",
  PROJECT_DELETED: "project_deleted",
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  NOTE_ADDED: "note_added",
  NOTE_DELETED: "note_deleted"
} as const;

/* export type NotificationType =
  (typeof notificationTypes)[keyof typeof notificationTypes]; */

export type NotificationType = typeof notificationTypes[keyof typeof notificationTypes];

const NotificationSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true, // usuario que recibe la notificación
    },
    triggeredBy: {
      type: Types.ObjectId,
      ref: "User",
      required: true, // usuario que generó la acción
    },
    project: {
      type: Types.ObjectId,
      ref: "Project",
      required: true,
    },
    task: {
      type: Types.ObjectId,
      ref: "Task",
      default: null, // opcional, solo para notificaciones de tareas
    },
    type: {
      type: String,
      enum: Object.values(notificationTypes),
      required: true,
    },
    content: {
      type: String,
      required: true, // ej: "Adrian actualizó la tarea 'Tarea de prueba' a En Progreso"
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const Notification = model<INotification>("Notification", NotificationSchema);
export default Notification;
