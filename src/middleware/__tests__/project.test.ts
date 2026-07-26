import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { hasProjectAccess } from '../project';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe('hasProjectAccess middleware', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('debe llamar next() si el usuario es miembro del equipo', async () => {
    const manager = await User.create({ name: 'Manager', email: 'm1@test.com', password: 'hash' });
    const member = await User.create({ name: 'Member', email: 'mem1@test.com', password: 'hash' });

    const project = await Project.create({
      projectName: 'Proyecto',
      clientName: 'Cliente',
      description: 'Desc',
      manager: manager._id,
      team: [member._id],
    });
    const rawProject = await Project.findById(project._id);

    const req = { user: member, project: rawProject } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await hasProjectAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('debe llamar next() si el usuario es el manager del proyecto', async () => {
    const manager = await User.create({ name: 'Manager', email: 'm2@test.com', password: 'hash' });

    const project = await Project.create({
      projectName: 'Proyecto',
      clientName: 'Cliente',
      description: 'Desc',
      manager: manager._id,
      team: [],
    });
    const rawProject = await Project.findById(project._id);

    const req = { user: manager, project: rawProject } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await hasProjectAccess(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('debe retornar 403 si el usuario NO es miembro ni manager', async () => {
    const manager = await User.create({ name: 'Manager', email: 'm3@test.com', password: 'hash' });
    const ajeno = await User.create({ name: 'Ajeno', email: 'ajeno@test.com', password: 'hash' });

    const project = await Project.create({
      projectName: 'Proyecto',
      clientName: 'Cliente',
      description: 'Desc',
      manager: manager._id,
      team: [],
    });
    const rawProject = await Project.findById(project._id);

    const req = { user: ajeno, project: rawProject } as unknown as Request;
    const res = mockRes();
    const next = vi.fn();

    await hasProjectAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'No tienes acceso a este proyecto' });
    expect(next).not.toHaveBeenCalled();
  });
});