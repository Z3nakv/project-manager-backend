// src/controllers/__tests__/TaskController.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TaskController } from '../TaskController';
import Task from '../../models/TaskModel';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';
import { notifyChangesToTeam } from '../../services/notificationService';

vi.mock('../../services/notificationService', () => ({
  notifyChangesToTeam: vi.fn().mockResolvedValue(undefined),
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
  } as unknown as Response;
}

async function createProjectWithTeam() {
  const manager = await User.create({ name: 'Manager', email: `mgr-${Date.now()}@test.com`, password: 'hash' });
  const member = await User.create({ name: 'Member', email: `mem-${Date.now()}@test.com`, password: 'hash' });
  const project = await Project.create({
    projectName: 'Proyecto',
    clientName: 'Cliente',
    description: 'Desc',
    manager: manager._id,
    team: [member._id],
    tasks: [],
  });
  return { manager, member, project };
}

describe('TaskController', () => {
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

  describe('createTask', () => {
    it('debe crear una tarea y agregarla al proyecto', async () => {
      const { manager, project } = await createProjectWithTeam();

      const req = {
        body: { name: 'Nueva Tarea', description: 'Descripción de la tarea' },
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TaskController.createTask(req, res);

      const taskInDb = await Task.findOne({ name: 'Nueva Tarea' });
      expect(taskInDb).not.toBeNull();
      expect(taskInDb?.project.toString()).toBe(project._id.toString());

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject?.tasks.map(t => t?.toString())).toContain(taskInDb?._id.toString());

      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Tarea creada correctamente' })
      );
    });
  });

  describe('updateProjectTask', () => {
    it('debe actualizar nombre, descripción, deadline y labels de la tarea', async () => {
      const { manager, project } = await createProjectWithTeam();
      const task = await Task.create({
        name: 'Tarea Original',
        description: 'Desc Original',
        project: project._id,
      });

      const req = {
        body: {
          name: 'Tarea Editada',
          description: 'Desc Editada',
          deadline: '2026-12-31',
          labels: [{ text: 'Urgente', color: 'red' }],
        },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TaskController.updateProjectTask(req, res);

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.name).toBe('Tarea Editada');
      expect(updatedTask?.description).toBe('Desc Editada');
      expect(updatedTask?.labels).toHaveLength(1);

      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });

    it('debe mantener las labels existentes si no se envían nuevas', async () => {
      const { manager, project } = await createProjectWithTeam();
      const task = await Task.create({
        name: 'Tarea Original',
        description: 'Desc Original',
        project: project._id,
        labels: [{ text: 'Existente', color: 'indigo' }],
      });

      const req = {
        body: {
          name: 'Tarea Editada',
          description: 'Desc Editada',
          deadline: '2026-12-31',
          // sin labels en el body
        },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TaskController.updateProjectTask(req, res);

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.labels).toHaveLength(1);
      expect(updatedTask?.labels?.[0].text).toBe('Existente');
    });
  });

  describe('deleteProjectTask', () => {
    it('debe eliminar la tarea y quitarla del array de tasks del proyecto', async () => {
      const { manager, project } = await createProjectWithTeam();
      const task = await Task.create({
        name: 'Tarea a Eliminar',
        description: 'Desc',
        project: project._id,
      });
      project.tasks.push(task._id);
      await project.save();

      const req = { task, project, user: manager } as unknown as Request;
      const res = mockRes();

      await TaskController.deleteProjectTask(req, res);

      const taskInDb = await Task.findById(task._id);
      expect(taskInDb).toBeNull();

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject?.tasks.map(t => t?.toString())).not.toContain(task._id.toString());

      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateTaskStatus', () => {
    it('debe actualizar el status y registrar quién lo cambió en completedBy', async () => {
      const { manager, project } = await createProjectWithTeam();
      const task = await Task.create({
        name: 'Tarea',
        description: 'Desc',
        project: project._id,
        status: 'pending',
      });

      const req = {
        body: { status: 'completed' },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TaskController.updateTaskStatus(req, res);

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.status).toBe('completed');
      expect(updatedTask?.completedBy).toHaveLength(1);
      expect(updatedTask?.completedBy[0].status).toBe('completed');

      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });
  });

  describe('assignTask', () => {
    it('debe asignar la tarea a miembros válidos del equipo', async () => {
      const { manager, member, project } = await createProjectWithTeam();
      const task = await Task.create({ name: 'Tarea', description: 'Desc', project: project._id });

      const req = {
        body: { userIds: [member._id.toString()] },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TaskController.assignTask(req, res);

      const updatedTask = await Task.findById(task._id);
      expect(updatedTask?.assignedTo.map(id => id.toString())).toEqual([member._id.toString()]);
      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar la asignación si algún userId no pertenece al equipo', async () => {
      const { manager, project } = await createProjectWithTeam();
      const task = await Task.create({ name: 'Tarea', description: 'Desc', project: project._id });
      const ajeno = await User.create({ name: 'Ajeno', email: 'ajeno-assign@test.com', password: 'hash' });

      const req = {
        body: { userIds: [ajeno._id.toString()] },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TaskController.assignTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Solo puedes asignar colaboradores del proyecto',
      });

      const taskUnchanged = await Task.findById(task._id);
      expect(taskUnchanged?.assignedTo).toHaveLength(0);
    });

    it('NO debe lanzar una excepción no controlada si userIds viene undefined', async () => {
      // Este test verifica el try/catch que agregamos — antes de corregirlo,
      // esto habría lanzado un TypeError sin responder al cliente
      const { manager, project } = await createProjectWithTeam();
      const task = await Task.create({ name: 'Tarea', description: 'Desc', project: project._id });

      const req = {
        body: {}, // sin userIds
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await expect(TaskController.assignTask(req, res)).resolves.not.toThrow();
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});