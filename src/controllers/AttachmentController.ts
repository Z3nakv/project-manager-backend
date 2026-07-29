import { Request, Response, NextFunction } from "express";
import * as attachmentService from "../services/attachmentService";

export class AttachmentController {
  static createAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const attachment = await attachmentService.createAttachment(
        req.file!,
        req.task._id,
        req.user!._id,
      );
      res.status(200).json(attachment);
    } catch (error) {
      next(error);
    }
  };

  static getTaskAttachments = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const attachments = await attachmentService.getTaskAttachments(
        req.task._id,
      );
      res.status(200).json(attachments);
    } catch (error) {
      next(error);
    }
  };

  static deleteTaskAttachment = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const attachmentId = req.params.imageId as string;
      await attachmentService.deleteTaskAttachment(
        attachmentId,
        req.task._id,
        req.user!._id,
      );
      res.status(200).json({message:"Attachment eliminado correctamente"});
    } catch (error) {
      next(error);
    }
  };
}
