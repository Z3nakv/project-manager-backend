import multer from "multer";

export const imageFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed"));
  }

  cb(null, true);
};