import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { ProjectController } from '../ProjectController';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';
import { notifyChangesToTeamSafely } from '../../services/notificationService';
import { AppError } from '../../utils/errors';

vi.mock('../../services/notificationService', () => ({
  notifyChangesToTeamSafely: vi.fn().mockResolvedValue(undefined),
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    send: vi.fn(),
  } as unknown as Response;
}

function getNextSpy() {
  return vi.fn() as unknown as NextFunction;
}

function getErrorFromNext(next: ReturnType<typeof vi.fn>): AppError {
  return next.mock.calls[0][0] as AppError;
}

describe('ProjectController', () => {
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

  describe('createProject', () => {
    it('debe crear el proyecto y responder 201', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm1@test.com', password: 'hash' });

      const req = {
        user: manager,
        body: { projectName: 'Proyecto Test', clientName: 'Cliente', description: 'Desc' },
      } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.createProject(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);

      const projectInDb = await Project.findOne({ projectName: 'Proyecto Test' });
      expect(projectInDb).not.toBeNull();
      expect(projectInDb?.manager?.toString()).toBe(manager._id.toString());
    });

    it('debe retornar 401 si no hay usuario autenticado', async () => {
      const req = {
        user: undefined,
        body: { projectName: 'Proyecto Test', clientName: 'Cliente', description: 'Desc' },
      } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.createProject(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('getProjects', () => {
    it('debe traer solo los proyectos donde el usuario es manager o miembro', async () => {
      const user = await User.create({ name: 'User', email: 'u1@test.com', password: 'hash' });
      const otroUser = await User.create({ name: 'Otro', email: 'u2@test.com', password: 'hash' });

      await Project.create({
        projectName: 'Mi Proyecto (manager)',
        clientName: 'Cliente',
        description: 'Desc',
        manager: user._id,
      });
      await Project.create({
        projectName: 'Mi Proyecto (miembro)',
        clientName: 'Cliente',
        description: 'Desc',
        manager: otroUser._id,
        team: [user._id],
      });
      await Project.create({
        projectName: 'Proyecto Ajeno',
        clientName: 'Cliente',
        description: 'Desc',
        manager: otroUser._id,
      });

      const req = { user } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.getProjects(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const returnedProjects = (res.json as any).mock.calls[0][0];
      expect(returnedProjects).toHaveLength(2);
      const names = returnedProjects.map((p: any) => p.projectName);
      expect(names).toContain('Mi Proyecto (manager)');
      expect(names).toContain('Mi Proyecto (miembro)');
      expect(names).not.toContain('Proyecto Ajeno');
    });
  });

  describe('getProjectById', () => {
    it('debe retornar el proyecto si existe', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm2@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
      });

      const req = { params: { projectId: project._id.toString() } } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.getProjectById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe retornar 404 si el proyecto no existe', async () => {
      const fakeId = (await import('mongoose')).Types.ObjectId.createFromTime(Date.now());
      const req = { params: { projectId: fakeId.toString() } } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.getProjectById(req, res, next);

      const error = getErrorFromNext(next);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('updateProject', () => {
    it('debe actualizar el proyecto, guardarlo y notificar al equipo', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm3@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Nombre Viejo',
        clientName: 'Cliente Viejo',
        description: 'Desc Vieja',
        manager: manager._id,
        team: [],
      });

      const req = {
        project,
        user: manager,
        body: { projectName: 'Nombre Nuevo', clientName: 'Cliente Nuevo', description: 'Desc Nueva' },
      } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.updateProject(req, res, next);

      const projectInDb = await Project.findById(project._id);
      expect(projectInDb?.projectName).toBe('Nombre Nuevo');
      expect(notifyChangesToTeamSafely).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("Proyecto Actualizado")
      });
    });
  });

  describe('deleteProject', () => {
    it('debe eliminar el proyecto y notificar al equipo', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm4@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'A Eliminar',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [],
      });

      const req = { project, user: manager } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await ProjectController.deleteProject(req, res, next);

      const projectInDb = await Project.findById(project._id);
      expect(projectInDb).toBeNull();
      expect(notifyChangesToTeamSafely).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({
        message: expect.stringContaining("Proyecto Eliminado")
      });
    });
  });
});