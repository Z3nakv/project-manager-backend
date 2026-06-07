import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

type UserPayload = {
    id: Types.ObjectId
}


export const generateJWT = (payload: UserPayload) => {
    const jwtSecret = process.env.JWT_SECRET!
    
    const token = jwt.sign(payload, jwtSecret, {
        expiresIn: '180d'
    })
    return token;
}