import { Request, Response } from "express";
import { Attachment } from "../models/Attachment";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";
import cloudinary from "../config/cloudinary";
import { getCloudinaryUrl } from "../utils/cloudinaryUrl";

export class AttachmentController {
  static createAttachment = async (req: Request, res: Response) => {
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No se envió ningún archivo" });
      }
      
      const { url, public_id } = await uploadToCloudinary(req.file.buffer);
      const attachment = await Attachment.create({
        task: req.task._id,
        uploadedBy: req.user?._id,
        filename: req.file.originalname,
        url,
        publicId: public_id,
        mimeType:req.file.mimetype,
        size:req.file.size,
      });
      if(!attachment.publicId){
        return res.status(400).send("Parece que hubo un problema")
      }
      res.status(200).json(attachment);
    } catch (error) {
      console.log(error);
    }
  };

  static getTaskAttachments = async (req: Request, res: Response) => {
    const taskId = req.task._id;
    try {
      const attachments = await Attachment.find({ task: taskId });
      if(!attachments) {
        return res.status(400).send('Hubo un problema');
      }
      const taskCardAttachments = attachments.map(attachment => {
        if(attachment.url){
          attachment.url = getCloudinaryUrl(attachment.publicId, 100, 80)
          return attachment
        }
        return attachment
      })
      
      res.status(200).json(taskCardAttachments);
    } catch (error) {
      console.log(error);
    }
  };

  static deleteTaskAttachment = async (req: Request, res: Response) => {
    const attachmentId = req.params.imageId!;
    try {
      const attachment = await Attachment.findById(attachmentId);
      await cloudinary.uploader.destroy(attachment?.publicId!);
      const deletedAttachment = await attachment?.deleteOne();
      if(!deletedAttachment?.acknowledged){
        return res.status(400).send("Attachment no se pudo eliminar")
      }
      res.status(200).send("Attachment eliminado correctamente")
    } catch (error) {
      console.log(error);
    }
  };
}
