import { Request, Response } from "express";
import Notification from "../models/NotificationModel";


export class NotificationController {

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
      console.log(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static markAsRead = async (req: Request, res: Response) => {
    try {
      const notification = await Notification.findById(req.params.notificationId);
      if (!notification)
        return res.status(404).json({ error: "Notificación no encontrada" });

      if (notification.user?.toString() !== req.user?._id.toString()) {
        return res.status(403).json({ error: "Acción no permitida" });
      }

      notification.read = true;
      await notification.save();
      res.json({message: "Notificación leída"});
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static clearAll = async (req: Request, res: Response) => {
    try {
      await Notification.deleteMany({ user: req.user?._id });
      res.json({message: "Notificaciones eliminadas"});
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };
}
