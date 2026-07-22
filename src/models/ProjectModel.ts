import mongoose, { PopulatedDoc, Schema, Types } from "mongoose";
import { Document } from "mongoose";
import { IUser } from "./UserModel";
import Task, { ITask } from "./TaskModel";
import { Note } from "./NoteModel";

export interface IProject extends Document {
  projectName: string;
  clientName: string;
  description: string;
  tasks: PopulatedDoc<ITask & Document>[];
  manager: PopulatedDoc<IUser & Document>;
  team: PopulatedDoc<IUser & Document>[];
}

const ProjectSchema: Schema = new Schema({
    projectName: {
        type: String,
        required: true,
        trim: true
    },
    clientName: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    tasks: [
        {
            type: Types.ObjectId,
            ref: 'Task',
        }
    ],
    manager: {
        type: Types.ObjectId,
        ref: 'User'
    },
    team: [
        {
            type: Types.ObjectId,
            ref: 'User',
        }
    ]
}, {timestamps: true})

ProjectSchema.pre('deleteOne', {document: true}, async function () {

    const projectId = this._id;
    if(!projectId) return 

    const tasks = await Task.find({project: projectId});
    for(const task of tasks){
        await Note.deleteMany({task: task._id})
    }
    await Task.deleteMany({project: projectId});
});

const Project = mongoose.model<IProject>("Project", ProjectSchema);

export default Project;
