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

  const results = await Promise.allSettled(
    members
      .filter((memberId) => memberId?._id.toString() !== triggeredBy.toString())
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

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      io.to(result.value.user!.toString()).emit('static_notification', result.value);
    } else if (result.status === 'rejected') {
      console.error('Error al crear notificación:', result.reason);
    }
  });
}