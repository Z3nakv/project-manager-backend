// src/controllers/__tests__/NoteController.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { NoteController } from '../NoteController';
import { Note } from '../../models/NoteModel';
import Task from '../../models/TaskModel';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';
import { notifyChangesToTeam } from '../../services/notificationService';

vi.mock('../../services/notificationService', () => ({
  notifyChangesToTeam: vi.fn().mockResolvedValue(undefined),
}));

// El controller importa { io } desde ../server — lo mockeamos para no levantar
// un servidor de sockets real durante los tests
vi.mock('../../server', () => ({
  io: {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  },
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
  } as unknown as Response;
}

async function setup() {
  const manager = await User.create({ name: 'Manager', email: `mgr-${Date.now()}-${Math.random()}@test.com`, password: 'hash' });
  const project = await Project.create({
    projectName: 'Proyecto',
    clientName: 'Cliente',
    description: 'Desc',
    manager: manager._id,
    team: [],
  });
  const task = await Task.create({ name: 'Tarea', description: 'Desc', project: project._id, notes: [] });
  return { manager, project, task };
}

describe('NoteController', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('debe crear la nota y agregarla a las notas de la tarea', async () => {
      const { manager, project, task } = await setup();

      const req = {
        body: { content: 'Nota de prueba' },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await NoteController.createNote(req, res);

      const noteInDb = await Note.findOne({ content: 'Nota de prueba' });
      expect(noteInDb).not.toBeNull();
      expect(noteInDb?.createdBy.toString()).toBe(manager._id.toString());

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.notes.map(n => n.toString())).toContain(noteInDb?._id.toString());

      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteTaskNote', () => {
    it('debe eliminar la nota si el usuario es el creador', async () => {
      const { manager, project, task } = await setup();
      const note = await Note.create({ content: 'Nota', createdBy: manager._id, task: task._id });
      task.notes.push(note._id);
      await task.save();

      const req = {
        params: { noteId: note._id.toString() },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await NoteController.deleteTaskNote(req, res);

      const noteInDb = await Note.findById(note._id);
      expect(noteInDb).toBeNull();
    });

    it('debe retornar 401 si el usuario NO es el creador de la nota', async () => {
      const { manager, project, task } = await setup();
      const otroUsuario = await User.create({ name: 'Otro', email: 'otro-note@test.com', password: 'hash' });
      const note = await Note.create({ content: 'Nota', createdBy: manager._id, task: task._id });
      task.notes.push(note._id);
      await task.save();

      const req = {
        params: { noteId: note._id.toString() },
        task,
        project,
        user: otroUsuario, // 👈 no es el creador
      } as unknown as Request;
      const res = mockRes();

      await NoteController.deleteTaskNote(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      const noteStillExists = await Note.findById(note._id);
      expect(noteStillExists).not.toBeNull();
    });

    it('debe retornar 400 si la nota NO pertenece a la tarea de la URL (bug corregido)', async () => {
      const { manager, project, task } = await setup();
      // Creamos una SEGUNDA tarea, con una nota que pertenece a ELLA, no a `task`
      const otraTask = await Task.create({ name: 'Otra Tarea', description: 'Desc', project: project._id, notes: [] });
      const noteDeOtraTask = await Note.create({ content: 'Nota ajena', createdBy: manager._id, task: otraTask._id });
      otraTask.notes.push(noteDeOtraTask._id);
      await otraTask.save();

      const req = {
        params: { noteId: noteDeOtraTask._id.toString() },
        task, // 👈 pero mandamos la tarea ORIGINAL en el request
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await NoteController.deleteTaskNote(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      // La nota de la otra tarea NO debe haberse borrado
      const noteStillExists = await Note.findById(noteDeOtraTask._id);
      expect(noteStillExists).not.toBeNull();
    });

    it('debe retornar 404 si la nota no existe', async () => {
      const { manager, project, task } = await setup();
      const fakeNoteId = new Types.ObjectId().toString();

      const req = {
        params: { noteId: fakeNoteId },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await NoteController.deleteTaskNote(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateNoteStatus', () => {
    it('debe alternar el status de completed', async () => {
      const { manager, task } = await setup();
      const note = await Note.create({ content: 'Nota', createdBy: manager._id, task: task._id, completed: false });

      const req = { params: { noteId: note._id.toString() } } as unknown as Request;
      const res = mockRes();

      await NoteController.updateNoteStatus(req, res);

      const updatedNote = await Note.findById(note._id);
      expect(updatedNote?.completed).toBe(true);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe retornar 404 si la nota no existe (bug corregido — antes respondía éxito falso)', async () => {
      const fakeNoteId = new Types.ObjectId().toString();
      const req = { params: { noteId: fakeNoteId } } as unknown as Request;
      const res = mockRes();

      await NoteController.updateNoteStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});