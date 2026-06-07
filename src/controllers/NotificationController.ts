import { Request, Response } from "express";
import Notification, { NotificationType } from "../models/NotificationModel";
import { Types } from "mongoose";

type CreateNotifcationProps = {
    user: Types.ObjectId;
    triggeredBy: Types.ObjectId;
    project: Types.ObjectId;
    task?: Types.ObjectId;
    type: NotificationType;
    content: string;
}

export class NotificationController {
  static createNotification = async (data: CreateNotifcationProps) => {
    try {
      const notification = await Notification.create(data);
      return notification;
    } catch (error) {
      console.log(error);
    }
  };

  static getNotifications = async (req: Request, res: Response) => {
    try {
      const notifications = await Notification.find({ user: req.user?._id })
        .populate("triggeredBy", "name email")
        .populate('project', '_id')
        .populate('task', '_id')
        .populate('user', '_id name email')
        .sort({ createdAt: -1 })
        .limit(20);
        
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static markAsRead = async (req: Request, res: Response) => {
    try {
      const notification = await Notification.findById(
        req.params.notificationID,
      );
      if (!notification)
        return res.status(404).json({ error: "Notificación no encontrada" });

      // verificar que la notificación pertenece al usuario
      if (notification.user?._id.toString() !== req.user?._id.toString()) {
        return res.status(403).json({ error: "Acción no permitida" });
      }

      notification.read = true;
      await notification.save();
      res.json("Notificación leída");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static clearAll = async (req: Request, res: Response) => {
    try {
      await Notification.deleteMany({ user: req.user?._id });
      res.json("Notificaciones eliminadas");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };
}
