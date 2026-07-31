import { Types } from "mongoose";
import Notification, { INotification, NotificationType, notificationTypes } from "../models/NotificationModel";
import { NotFoundError, UnauthorizedError } from "../utils/errors";
import { emitToUser } from "../socket/notificationEmitter";

type NotifyTaskStatusParams = {
  members: Array<{ _id: Types.ObjectId }>;
  triggeredBy: Types.ObjectId;
  projectId: Types.ObjectId;
  taskId: Types.ObjectId | null;
  content: string; 
  actionType?: string;
};

type CreateNotifcationProps = {
    user: Types.ObjectId;
    triggeredBy: Types.ObjectId;
    project: Types.ObjectId;
    task?: Types.ObjectId;
    type: NotificationType;
    content: string;
}

export const createNotification = async (data: CreateNotifcationProps) => {
      return await Notification.create(data);
};

export const getNotifications = async (userId: Types.ObjectId) : Promise<INotification[]> => {
  const notifications = await Notification.find({ user: userId })
        .populate("triggeredBy", "name email")
        .populate('project', '_id')
        .populate('task', '_id')
        .populate("user", "_id")
        .sort({ createdAt: -1 })
        .limit(20);
    return notifications;
}

export const markAsRead = async (notificationId: string, userId: Types.ObjectId) : Promise<void> => {
  const notification = await Notification.findById(notificationId);
        if (!notification) throw new NotFoundError("Notification", notificationId);
        if (notification.user?.toString() !== userId.toString()) throw new UnauthorizedError();
        notification.read = true;
        await notification.save();
}

export const clearAll = async (userId: Types.ObjectId) : Promise<void> => {
    await Notification.deleteMany({ user: userId });
}

export const notifyChangesToTeam = async ({ 
  members, triggeredBy, projectId, taskId, actionType, content }: NotifyTaskStatusParams
) : Promise<void> => {
  const results = await Promise.allSettled(
    members
      .filter((memberId) => memberId?._id.toString() !== triggeredBy.toString())
      .map((memberId) =>
        createNotification({
          user: memberId!._id,
          triggeredBy: triggeredBy,
          project: projectId,
          task: taskId ?? undefined,
          type: notificationTypes[actionType! as keyof typeof notificationTypes] as NotificationType,
          content: content,
        }),
      ),
  );
  
  
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      emitToUser(result.value.user!.toString(), "static_notification", result.value);
    } else if (result.status === 'rejected') {
      console.error('Error al crear notificación:', result.reason);
    }
  });
}

export const notifyChangesToTeamSafely = async (params: NotifyTaskStatusParams) : Promise<void> => {
  try {
    await notifyChangesToTeam(params);
  } catch (error) {
    console.error("Fallo notificación al equipo:", error);
  }
};