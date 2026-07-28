import mongoose, { Schema, Types } from "mongoose";

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
    }
}, {timestamps: true});

export const Note = mongoose.model<INote>('Note', NoteSchema);