import { Readable } from "stream";
import cloudinary from "../config/cloudinary";

export const uploadToCloudinary = (buffer: Buffer, folder = "uptask/attachments"): Promise<{ url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    
    Readable.from(buffer).pipe(uploadStream);
  });
};