import mongoose, { Document, PopulatedDoc, Schema, Types } from "mongoose";
import { ITask } from "./TaskModel";
import { IUser } from "./UserModel";

export interface IAttachment extends Document {
    task: PopulatedDoc<ITask>;
    uploadedBy: PopulatedDoc<IUser>;
    filename: string;
    url: string;
    publicID: string;
    mimeType: string;
    size: number;
}

const AttachmentSchema: Schema = new Schema({
    task: {
        type: Types.ObjectId,
        ref: 'Task'
    },
    uploadedBy: {
        type: Types.ObjectId,
        ref: 'user'
    },
    filename: {
        type: String,
        trim: true
    },
    url: {
        type: String,
        trim: true
    },
    publicID: {
        type: String,
        trim: true
    },
    mimeType: {
        type: String,
        trim: true
    },
    size: {
        type: String,
        trim: true
    },
}, {timestamps: true});

export const Attachment = mongoose.model<IAttachment>("Attachment", AttachmentSchema);