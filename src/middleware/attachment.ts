import multer from "multer";
import { imageFilter } from "../utils/attachment";

export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 10 MB
  },
});