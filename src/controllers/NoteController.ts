import { NextFunction, Request, Response } from "express";
import { createNote, deleteNote, getTaskNotes, updateNoteStatus } from "../services/noteService";

export class NoteController {
  static createNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await createNote(req.body.content, req.user!, req.task, req.project)
      res.json({message: "Nota Creada Correctamente"});
    } catch (error) {
      next(error)
    }
  };

  static getTaskNotes = async (req: Request, res: Response, next:NextFunction) => {
    try {
      const notes = await getTaskNotes(req.task._id);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  };

  static deleteTaskNote = async (req: Request, res: Response, next:NextFunction) => {
    const noteId = req.params.noteId as string;
    try {
      await deleteNote(noteId, req.task, req.user!, req.project)

      res.json({message: "Nota Eliminada"});
    } catch (error) {
      next(error);
    }
  };

  static updateNoteStatus = async (req: Request, res: Response, next:NextFunction) => {
    try {
      const noteId = req.params.noteId as string;
      await updateNoteStatus(noteId);
      res.status(200).json({message: "Estado de nota actualizado!"});
    } catch (error) {
      next(error);
    }
  };
}
