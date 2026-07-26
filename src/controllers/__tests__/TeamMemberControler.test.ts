// src/controllers/__tests__/TeamMemberController.test.ts
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';
import { notifyChangesToTeam } from '../../services/notificationService';
import { TeamMemberController } from '../TeamController';

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

describe('TeamMemberController', () => {
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

  describe('findMemberByEmail', () => {
    it('debe encontrar un usuario por email', async () => {
      await User.create({ name: 'Buscado', email: 'buscado@test.com', password: 'hash' });

      const req = { body: { email: 'buscado@test.com' } } as Request;
      const res = mockRes();

      await TeamMemberController.findMemberByEmail(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'buscado@test.com' })
      );
    });

    it('debe retornar 404 si el email no existe', async () => {
      const req = { body: { email: 'noexiste@test.com' } } as Request;
      const res = mockRes();

      await TeamMemberController.findMemberByEmail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getProjecTeam', () => {
    it('debe devolver el equipo del proyecto poblado', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm1@test.com', password: 'hash' });
      const member = await User.create({ name: 'Member', email: 'mem1@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [member._id],
      });

      const req = { project } as unknown as Request;
      const res = mockRes();

      await TeamMemberController.getProjecTeam(req, res);

      const returned = (res.json as any).mock.calls[0][0];
      expect(returned).toHaveLength(1);
      expect(returned[0].email).toBe('mem1@test.com');
    });
  });

  describe('addMemberById', () => {
    it('debe agregar un usuario nuevo al equipo', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm2@test.com', password: 'hash' });
      const nuevo = await User.create({ name: 'Nuevo', email: 'nuevo@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [],
      });

      const req = {
        body: { _id: nuevo._id.toString() },
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TeamMemberController.addMemberById(req, res);

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject?.team.map(t => t?.toString())).toContain(nuevo._id.toString());
      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });

    it('debe retornar 409 si el usuario ya es miembro del proyecto', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm3@test.com', password: 'hash' });
      const yaMiembro = await User.create({ name: 'Ya Miembro', email: 'yamiembro@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [yaMiembro._id],
      });

      const req = {
        body: { _id: yaMiembro._id.toString() },
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TeamMemberController.addMemberById(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('debe retornar 404 si el usuario a agregar no existe', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm4@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [],
      });
      const fakeId = new Types.ObjectId().toString();

      const req = {
        body: { _id: fakeId },
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TeamMemberController.addMemberById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('removeMemberById', () => {
    it('debe eliminar un miembro existente del equipo', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm5@test.com', password: 'hash' });
      const miembro = await User.create({ name: 'Miembro', email: 'miembro@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [miembro._id],
      });

      const req = {
        params: { userId: miembro._id.toString() },
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TeamMemberController.removeMemberById(req, res);

      const updatedProject = await Project.findById(project._id);
      expect(updatedProject?.team.map(t => t?.toString())).not.toContain(miembro._id.toString());
      expect(notifyChangesToTeam).toHaveBeenCalledTimes(1);
    });

    it('debe retornar 409 si el usuario no es miembro del proyecto', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm6@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [],
      });
      const noMiembro = new Types.ObjectId().toString();

      const req = {
        params: { userId: noMiembro },
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await TeamMemberController.removeMemberById(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });
});