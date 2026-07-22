import mongoose, { Document, Schema, Types } from "mongoose";
import { Note } from "./NoteModel";

const taskStatus = {
  PENDING: "pending",
  ON_HOLD: "onHold",
  IN_PROGRESS: "inProgress",
  UNDER_REVIEW: "underReview",
  COMPLETED: "completed",
} as const;

const labelColor = {
  RED: "red",
  ORANGE: "orange",
  AMBER: "amber",
  EMERALD: "emerald",
  SKY: "sky",
  INDIGO: "indigo",
  PURPLE: "purple",
  PINK: "pink",
  SLATE: "slate",
} as const;

export interface ILabel {
  text: string;
  color: LabelColor;
}

export type TaskStatus = typeof taskStatus[keyof typeof taskStatus];
export type LabelColor = typeof labelColor[keyof typeof labelColor];

export interface ITask extends Document {
    name: string
    description: string
    project: Types.ObjectId
    status: TaskStatus
    completedBy: {
        user: Types.ObjectId,
        status: TaskStatus
    }[]
    notes: Types.ObjectId[]
    deadline: Date | null
    labels: ILabel[] 
    assignedTo: Types.ObjectId[]
}

export const TaskSchema : Schema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true
    },
    description: {
        type: String,
        trim: true,
        required: true
    },
    project: {
        type: Types.ObjectId,
        ref: 'Project'
    },
    status: {
        type: String,
        enum: Object.values(taskStatus),
        default: taskStatus.PENDING
    },
    completedBy: [
        {
            user: {
                type: Types.ObjectId,
                ref: 'User',
                default: null
            },
            status: {
                type: String,
                enum: Object.values(taskStatus),
                default: taskStatus.PENDING
            }
        }
    ],
    notes: [
        {
            type: Types.ObjectId,
            ref: 'Note'
        }
    ],
    deadline: {
        type: Date,
        default: null
    },
    labels: [
        {
            text: {
                type: String,
                trim: true,
                required: true
            },
            color: {
                type: String,
                enum: Object.values(labelColor),
                required: true
            }
        }
    ],
    assignedTo : [
        {
            type: Types.ObjectId,
            ref: "User"
        }
    ]
}, {timestamps: true})

TaskSchema.pre('deleteOne', {document: true}, async function () {

    const taskId = this._id;
    if(!taskId) return 
    await Note.deleteMany({task: taskId})
})

const Task = mongoose.model<ITask>("Task", TaskSchema);

export default Task;
