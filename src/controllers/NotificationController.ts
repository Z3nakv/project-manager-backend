import { NextFunction, Request, Response } from "express";
import { clearAll, getNotifications, markAsRead } from "../services/notificationService";
import { Types } from "mongoose";


export class NotificationController {

  static getNotifications = async (req: Request, res: Response, next: NextFunction) => {
    
    try {
      const userId = req.user?._id;
      const notifications = await getNotifications(userId!);
      res.json(notifications);
    } catch (error) {
      next(error);
    }
  };

  static markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationId = req.params.notificationId as string;
      const userId = new Types.ObjectId(req.user?._id);
      await markAsRead(notificationId, userId);
      res.json({message: "Notificación leída"});
    } catch (error) {
      next(error)
    }
  };

  static clearAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!._id;
      await clearAll(userId);
      res.json({message: "Notificaciones eliminadas"});
    } catch (error) {
      next(error)
    }
  };
}
