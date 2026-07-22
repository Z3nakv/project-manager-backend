import { Types } from "mongoose";
import { NotificationController } from "../controllers/NotificationController";
import { NotificationType, notificationTypes } from "../models/NotificationModel";
import { io } from "../server";

type NotifyTaskStatusParams = {
  members: Array<{ _id: Types.ObjectId }>;
  triggeredBy: Types.ObjectId;
  projectId: Types.ObjectId;
  taskId: Types.ObjectId | null;
  content?: string; 
  actionType?: string;
};

export const notifyChangesToTeam = async ({ members, triggeredBy, projectId, taskId, actionType, content }: NotifyTaskStatusParams) => {
  
  const notificaciones = await Promise.all(
        members
          .filter(
            (memberId) => memberId?._id.toString() !== triggeredBy.toString(),
          ) // excluye al triggeredBy
          .map((memberId) =>
            NotificationController.createNotification({
              user: memberId!._id,
              triggeredBy: triggeredBy,
              project: projectId,
              task: taskId ?? undefined,
              type: notificationTypes[actionType! as keyof typeof notificationTypes] as NotificationType,
              content: `${content}`,
            }),
          ),
      );

      // emite la notificación a cada usuario
      notificaciones.forEach((notification) => {
        if (notification) {
          io.to(notification?.user!.toString()).emit(
            "static_notification",
            notification,
          );
        }
      });
}