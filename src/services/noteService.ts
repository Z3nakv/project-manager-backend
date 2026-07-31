import { Types } from "mongoose";
import { INote, Note } from "../models/NoteModel";
import { IProject } from "../models/ProjectModel";
import { ITask } from "../models/TaskModel";
import { IUser } from "../models/UserModel";
import { io } from "../server";
import { notifyChangesToTeamSafely } from "./notificationService";
import { ConflictError, NotFoundError, UnauthorizedError } from "../utils/errors";
import { getProjectMembers } from "../utils/projectHelpers";
import { emitToProjectMembers } from "../socket/notificationEmitter";

export const createNote = async (
  content: string,
  user: IUser,
  task: ITask,
  project: IProject,
) : Promise<void> => {
  const note = new Note();
  note.content = content;
  const { _id } = user;
  note.createdBy = _id;
  note.task = task._id;

  task.notes.push(note._id);

  await Promise.all([task.save(), note.save()]);

  const members = getProjectMembers(project);
  const notifyContent = `${user.name} creó una nueva nota en la tarea "${task.name}"`;
      await notifyChangesToTeamSafely({
        members: members,
        triggeredBy: user._id,
        projectId: project._id,
        taskId: null,
        actionType: "NOTE_ADDED",
        content: notifyContent,
      });

  emitToProjectMembers(members, user._id, "note_added", {message: notifyContent, projectId: project._id});
};

export const getTaskNotes = async (taskId: Types.ObjectId) : Promise<INote[]> => {
  return Note.find({ task: taskId }).populate("createdBy");
  
};

export const deleteNote = async (noteId: string, task: ITask, user: IUser, project: IProject) : Promise<void> => {
      const note = await Note.findById(noteId);

      if (!note) throw new NotFoundError("Nota", noteId);
      if (note.task.toString() !== task._id.toString()) throw new ConflictError("La nota no pertenece a la tarea actual");
      if (note.createdBy.toString() !== user?._id.toString()) throw new UnauthorizedError("No tienes permiso para eliminar esta nota");

      task.notes = task.notes.filter((n) => n.toString() !== noteId.toString());

      await Promise.all([task.save(), note.deleteOne()]);

      const members = getProjectMembers(project);
      const notifyContent = `${user!.name} eliminó la nota "${task.name}"`;

      await notifyChangesToTeamSafely({
        members: members,
        triggeredBy: user._id,
        projectId: project._id,
        taskId: null,
        actionType: "NOTE_DELETED",
        content: notifyContent,
      });

      emitToProjectMembers(members, user._id, "note_deleted", {message: notifyContent, projectId: project._id});
}

export const updateNoteStatus = async (noteId: string) : Promise<void> => {
      const note = await Note.findById(noteId);
      if (!note) throw new NotFoundError("Nota", noteId);
      note.completed = !note.completed;
      await note.save();
}
