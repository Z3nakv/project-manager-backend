// src/middleware/__tests__/task.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { hasAuthorization } from '../task';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';
import { UnauthorizedError } from '../../utils/errors';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe('hasAuthorization middleware', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('debe llamar next() si el usuario es el manager del proyecto', async () => {
    const manager = await User.create({
      name: 'Manager',
      email: 'manager@test.com',
      password: 'hash',
    });

    const project = await Project.create({
      projectName: 'Proyecto Test',
      clientName: 'Cliente',
      description: 'Desc',
      manager: manager._id,
    });

    // 👇 Simulamos exactamente lo que devuelve projectExists: findById SIN populate
    const rawProject = await Project.findById(project._id);

    const req = {
      user: manager,
      project: rawProject,
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await hasAuthorization(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe retornar 403 si el usuario NO es el manager del proyecto', async () => {
    const manager = await User.create({
      name: 'Manager',
      email: 'manager2@test.com',
      password: 'hash',
    });
    const otroUsuario = await User.create({
      name: 'Otro Usuario',
      email: 'otro@test.com',
      password: 'hash',
    });

    const project = await Project.create({
      projectName: 'Proyecto Test 2',
      clientName: 'Cliente',
      description: 'Desc',
      manager: manager._id,
    });

    const rawProject = await Project.findById(project._id);

    const req = {
      user: otroUsuario,
      project: rawProject,
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await hasAuthorization(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error.statusCode).toBe(403);
  });

  it('NO debe lanzar una excepción no controlada cuando project.manager es un ObjectId sin popular', async () => {
    // Este test documenta específicamente el bug que corregimos:
    // req.project.manager debe tratarse como ObjectId crudo, no como documento con ._id
    const manager = await User.create({
      name: 'Manager',
      email: 'manager3@test.com',
      password: 'hash',
    });

    const project = await Project.create({
      projectName: 'Proyecto Test 3',
      clientName: 'Cliente',
      description: 'Desc',
      manager: manager._id,
    });

    const rawProject = await Project.findById(project._id);
    // Confirmamos la premisa: manager es un ObjectId, no un documento
    expect(rawProject?.manager).toBeInstanceOf(Types.ObjectId);

    const req = {
      user: manager,
      project: rawProject,
    } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    // Si el bug estuviera presente, esto lanzaría un TypeError no controlado
    await expect(hasAuthorization(req, res, next)).resolves.not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });
});