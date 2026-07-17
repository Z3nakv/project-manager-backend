import cloudinary from "../config/cloudinary";

export const getCloudinaryUrl = (publicId: string, width: number, height: number) => {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: "scale",
    quality: "auto",
    fetch_format: "auto"
  });
};