import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

type UserPayload = {
    id: Types.ObjectId
}

export const generateAccessToken = (payload: UserPayload): string => {
  const jwtSecret = process.env.JWT_SECRET!;
  return jwt.sign(payload, jwtSecret, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: UserPayload): string => {
  const refreshSecret = process.env.REFRESH_JWT_SECRET!;
  return jwt.sign(payload, refreshSecret, { expiresIn: "7d" });
};