import { Types } from "mongoose";
import { Note } from "../models/NoteModel";
import { IProject } from "../models/ProjectModel";
import { ITask } from "../models/TaskModel";
import { IUser } from "../models/UserModel";
import { io } from "../server";
import { notifyChangesToTeamSafely } from "./notificationService";
import { ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors";

export const createNote = async (
  content: string,
  user: IUser,
  task: ITask,
  project: IProject,
) => {
  const note = new Note();
  note.content = content;
  const { _id } = user;
  note.createdBy = _id;
  note.task = task._id;

  task.notes.push(note._id);

  await Promise.all([task.save(), note.save()]);

  const members = [...project.team, project.manager].filter(Boolean);

      await notifyChangesToTeamSafely({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: user._id,
        projectId: project._id,
        taskId: null,
        actionType: "NOTE_ADDED",
        content: `${user.name} creó una nueva nota en la tarea "${task.name}"`,
      });

  members
    .filter((member) => member?._id.toString() !== user._id.toString())
    .forEach((member) => {
      io.to(member!._id.toString()).emit("note_added", {
        message: content,
        projectId: project._id,
      });
    });
};

export const getTaskNotes = async (taskId: Types.ObjectId) => {
  return Note.find({ task: taskId }).populate("createdBy");
  
};

export const deleteNote = async (noteId: string, task: ITask, user: IUser, project: IProject) => {
      const note = await Note.findById(noteId);

      if (!note) {
        throw new NotFoundError("Nota", noteId);
      }

      if (note.task.toString() !== task._id.toString()) {
        throw new ConflictError("La nota no pertenece a la tarea actual");
      }

      if (note.createdBy.toString() !== user?._id.toString()) {
        throw new UnauthorizedError("No tienes permiso para eliminar esta nota");
      }

      task.notes = task.notes.filter((n) => n.toString() !== noteId.toString());

      await Promise.all([task.save(), note.deleteOne()]);

      const members = [...project.team, project.manager].filter(Boolean);
      const content = `${user!.name} eliminó la nota "${task.name}"`;

      await notifyChangesToTeamSafely({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: user._id,
        projectId: project._id,
        taskId: null,
        actionType: "NOTE_DELETED",
        content: content,
      });

      members
        .filter((member) => member?._id.toString() !== user._id.toString())
        .forEach((member) => {
          io.to(member!._id.toString()).emit("note_deleted", {
            message: content,
            projectId: project._id,
          });
        });
}

export const updateNoteStatus = async (noteId: string) => {
      const note = await Note.findById(noteId);
      if (!note) {
        throw new NotFoundError("Nota", noteId)
      }
      note.completed = !note.completed;
      await note.save();
}
