import { Request, Response } from "express";
import { Note } from "../models/NoteModel";
import { Types } from "mongoose";
import { notifyChangesToTeam } from "../services/notificationService";
import { io } from "../server";

export class NoteController {
  static createNote = async (req: Request, res: Response) => {
    const { content: bodyContent } = req.body;

    const note = new Note();
    note.content = bodyContent;
    const { _id } = req.user!;
    note.createdBy = _id;
    note.task = req.task._id;

    req.task.notes.push(note._id);

    try {
      await Promise.all([req.task.save(), note.save()]);

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      );
      if(members.length < 1) return res.status(404).json({error: "Members not found"})

      const content = `${req.user!.name} creo una nueva nota en la tarea "${req.task.name}"`;

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: null,
        actionType: "NOTE_ADDED",
        content: content,
      });

      members
        .filter((member) => member?._id.toString() !== req.user?._id.toString())
        .forEach((member) => {
          io.to(member!._id.toString()).emit("note_added", {
            message: content,
            projectId: req.project._id,
          });
        });

      res.send({message: "Nota Creada Correctamente"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static getTaskNotes = async (req: Request, res: Response) => {
    try {
      const notes = await Note.find({ task: req.task._id }).populate(
        "createdBy",
      );
      res.json(notes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static deleteTaskNote = async (req: Request, res: Response) => {
    try {
      const { noteId } = req.params;
      const note = await Note.findById(noteId);

      if (!note) {
        const error = new Error("Nota no encontrada");
        return res.status(404).json({ error: error.message });
      }

      if (note.task.toString() !== req.task._id.toString()) {
        const error = new Error("Acción no válida");
        return res.status(400).json({ error: error.message });
      }

      if (note.createdBy.toString() !== req.user?._id.toString()) {
        const error = new Error("Acción no válida");
        return res.status(401).json({ error: error.message });
      }

      req.task.notes = req.task.notes.filter(
        (n) => n.toString() !== noteId.toString(),
      );

      await Promise.all([req.task.save(), note.deleteOne()]);

      const members = [...req.project.team, req.project.manager].filter(
        Boolean,
      );
      const content = `${req.user!.name} eliminó la nota "${req.task.name}"`;

      await notifyChangesToTeam({
        members: members as Array<{ _id: Types.ObjectId }>,
        triggeredBy: req.user!._id!,
        projectId: req.project._id,
        taskId: null,
        actionType: "NOTE_DELETED",
        content: content,
      });

      members
        .filter((member) => member?._id.toString() !== req.user?._id.toString())
        .forEach((member) => {
          io.to(member!._id.toString()).emit("note_deleted", {
            message: content,
            projectId: req.project._id,
          });
        });

      res.json({message: "Nota Eliminada"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };

  static updateNoteStatus = async (req: Request, res: Response) => {
    try {
      const noteId = req.params.noteId;
      if (!noteId)
        return res
          .status(400)
          .json({ error: "Hubo un error con el Id de la nota" });

      const note = await Note.findById(noteId);
      if (!note) {
        return res.status(404).json({ error: "Nota no encontrada" });
      }

      note.completed = !note.completed;
      await note.save();

      res.status(200).json({message: "Estado de nota actualizado!"});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Hubo un error" });
    }
  };
}
