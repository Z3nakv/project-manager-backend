import { Types } from "mongoose";
import { Attachment, IAttachment } from "../models/Attachment";
import { uploadToCloudinary } from "../utils/uploadToCloudinary";
import cloudinary from "../config/cloudinary";
import { getCloudinaryUrl } from "../utils/cloudinaryUrl";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../utils/errors";

export const createAttachment = async (
  file: Express.Multer.File,
  taskId: Types.ObjectId,
  userId: Types.ObjectId,
) : Promise<IAttachment> => {
  if (!file) throw new ValidationError("No se envió ningún archivo");
  const { url, public_id } = await uploadToCloudinary(file.buffer);
  const attachment = await Attachment.create({
    task: taskId,
    uploadedBy: userId,
    filename: file.originalname,
    url,
    publicId: public_id,
    mimeType: file.mimetype,
    size: file.size,
  });
  return attachment;
};

export const getTaskAttachments = async (taskId: Types.ObjectId) : Promise<IAttachment[]> => {
  const attachments = await Attachment.find({ task: taskId });

  return attachments.map((attachment) => {
    const doc = attachment.toObject();
    if (doc.url) {
      doc.url = getCloudinaryUrl(doc.publicId, 100, 80);
    }
    return doc;
  });
};

export const deleteTaskAttachment = async (
  attachmentId: string,
  taskId: Types.ObjectId,
  userId: Types.ObjectId,
) : Promise<void> => {
  const attachment = await Attachment.findById(attachmentId);
  if (!attachment) {
    throw new NotFoundError("Archivo adjunto", attachmentId);
  }

  if (!attachment.task || attachment.task.toString() !== taskId.toString()) {
    throw new ValidationError("Acción no válida");
  }

  if (!attachment.uploadedBy || attachment.uploadedBy.toString() !== userId.toString()) {
    throw new UnauthorizedError("Acción no válida");
  }

  await cloudinary.uploader.destroy(attachment.publicId);

  await attachment.deleteOne();
};
