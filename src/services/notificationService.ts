import { Types } from "mongoose";
import { NotificationController } from "../controllers/NotificationController";
import { notificationTypes } from "../models/NotificationModel";
import { io } from "../server";

type NotifyTaskStatusParams = {
  members: Array<{ _id: Types.ObjectId }>;
  triggeredBy: Types.ObjectId;
  projectId: Types.ObjectId;
  taskId: Types.ObjectId;
    content?: string;
};

export const notifyTaskStatusUpdated = async ({ members, triggeredBy, projectId, taskId, content }: NotifyTaskStatusParams) => {
    const notificaciones = await Promise.all(
        members
          .filter(
            (memberID) => memberID?._id.toString() !== triggeredBy.toString(),
          ) // excluye al triggeredBy
          .map((memberID) =>
            NotificationController.createNotification({
              user: memberID!._id,
              triggeredBy: triggeredBy,
              project: projectId,
              task: taskId,
              type: notificationTypes.TASK_STATUS_UPDATED || null,
              content: `${content}`,
            }),
          ),
      );

      // emite la notificación a cada usuario
      notificaciones.forEach((notification) => {
        if (notification) {
          io.to(notification?.user!.toString()).emit(
            "new_notification",
            notification,
          );
        }
      });
}