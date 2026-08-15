import mongoose, { Document, Schema, Types } from "mongoose";

export interface INote extends Document {
    content: string
    createdBy: Types.ObjectId
    task: Types.ObjectId
    completed: boolean
}

const NoteSchema : Schema = new Schema({
    content: {
        type: String,
        required: true
    },
    createdBy: {
        type: Types.ObjectId,
        ref: 'User',
        required: true
    },
    task: {
        type: Types.ObjectId,
        ref: 'Task',
        required: true
    },
    completed: {
        type: Boolean,
        default: false
    },
    isEphemeralDemo: {
        type: Boolean,
        default: false
    },
}, {timestamps: true});

NoteSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 2 * 60 * 60, partialFilterExpression: { isEphemeralDemo: true } }
);

export const Note = mongoose.model<INote>('Note', NoteSchema);