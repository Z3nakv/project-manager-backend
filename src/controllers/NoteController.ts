import { Request, Response } from "express";
import { Note } from "../models/NoteModel";
import Task from "../models/TaskModel";
import { Types } from "mongoose";

type NoteParams = {
  noteID: Types.ObjectId;
};

export class NoteController {
  static createNote = async (req: Request, res: Response) => {
    const { content } = req.body;
    
    const note = new Note();
    note.content = content;
    const {_id} = req.user!;
    note.createdBy = _id;
    note.task = req.task._id;
    
    req.task.notes.push(note._id);

    try {
      await Promise.allSettled([req.task.save(), note.save()]);
      res.send("Nota Creada Correctamente");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static getTaskNotes = async (req: Request, res: Response) => {
    try {
      const notes = await Note.find({ task: req.task._id });
      res.json(notes);
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static deleteTaskNote = async (req: Request, res: Response) => {
    const { noteID } = req.params;
    const note = await Note.findById(noteID);

    if (!note) {
      const error = new Error("Nota no encontrada");
      return res.status(404).json({ error: error.message });
    }

    if(note.createdBy.toString() !== req.user?._id.toString()) {
            const error = new Error('Acción no válida')
            return res.status(401).json({error: error.message})
        }

    req.task.notes = req.task.notes.filter(
      (note) => note.toString() !== noteID.toString(),
    );

    try {
      await Promise.allSettled([req.task.save(), note.deleteOne()]);
      res.send("Nota Eliminada");
    } catch (error) {
      res.status(500).json({ error: "Hubo un error" });
    }
  };
}
