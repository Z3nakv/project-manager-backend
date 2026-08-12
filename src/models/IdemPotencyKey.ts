import mongoose, { Document, Schema } from "mongoose";

export interface IIdempotencyKey extends Document {
    key: string,
    statusCode: number,
    response: Schema.Types.Mixed
}

const IdempotencyKeySchema = new Schema({
    key: { 
        type: String, 
        required: true, 
        unique: true 
    },
    statusCode: { 
        type: Number, 
        default: null 
    },
    response: { 
        type: Schema.Types.Mixed, 
        default: null 
    },
  },
  { timestamps: true });

// TTL real: Mongo borra el documento solo después de 24h
IdempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export const IdempotencyKey = mongoose.model<IIdempotencyKey>('IdempotencyKey', IdempotencyKeySchema);
