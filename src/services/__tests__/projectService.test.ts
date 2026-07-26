// src/services/__tests__/projectService.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { createProject, getProjectById, updateProject } from '../projectService';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import Task from '../../models/TaskModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';

describe('projectService', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('createProject', () => {
    it('debe crear un proyecto y asignarle el manager correcto', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm@test.com', password: 'hash' });

      const project = await createProject(
        {
          projectName: 'Proyecto Nuevo',
          clientName: 'Cliente X',
          description: 'Descripción',
        } as any,
        manager._id as Types.ObjectId
      );

      expect(project.manager?.toString()).toBe(manager._id.toString());

      const projectInDb = await Project.findById(project._id);
      expect(projectInDb?.projectName).toBe('Proyecto Nuevo');
    });
  });

  describe('getProjectById', () => {
    it('debe traer el proyecto con manager y team populados', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm2@test.com', password: 'hash' });
      const member = await User.create({ name: 'Member', email: 'mem2@test.com', password: 'hash' });

      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
        team: [member._id],
      });

      const result = await getProjectById(project._id.toString());

      expect(result).not.toBeNull();
      // Verificamos que el populate trajo el documento completo, no solo el ID
      expect((result?.manager as any).name).toBe('Manager');
      expect((result?.team as any)[0].name).toBe('Member');
    });

    it('debe traer las tareas con notas y completedBy populados', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm3@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Proyecto',
        clientName: 'Cliente',
        description: 'Desc',
        manager: manager._id,
      });
      const task = await Task.create({
        name: 'Tarea',
        description: 'Desc',
        project: project._id,
      });
      project.tasks.push(task._id);
      await project.save();

      const result = await getProjectById(project._id.toString());

      expect(result?.tasks).toHaveLength(1);
      expect((result?.tasks[0] as any).name).toBe('Tarea');
    });

    it('debe retornar null si el proyecto no existe', async () => {
      const fakeId = new Types.ObjectId().toString();
      const result = await getProjectById(fakeId);
      expect(result).toBeNull();
    });
  });

  describe('updateProject', () => {
    it('debe actualizar los campos del proyecto (sin guardar aún)', async () => {
      const manager = await User.create({ name: 'Manager', email: 'm4@test.com', password: 'hash' });
      const project = await Project.create({
        projectName: 'Nombre Viejo',
        clientName: 'Cliente Viejo',
        description: 'Desc Vieja',
        manager: manager._id,
      });

      await updateProject({
        project: project as any,
        body: {
          projectName: 'Nombre Nuevo',
          clientName: 'Cliente Nuevo',
          description: 'Desc Nueva',
        },
      });

      // Verificamos que el documento en memoria cambió...
      expect(project.projectName).toBe('Nombre Nuevo');

      // ...pero que TODAVÍA NO se persistió, porque updateProject no hace save()
      const projectInDbSinGuardar = await Project.findById(project._id);
      expect(projectInDbSinGuardar?.projectName).toBe('Nombre Viejo');

      // Ahora sí lo guardamos (como hace el controller)
      await project.save();
      const projectInDbGuardado = await Project.findById(project._id);
      expect(projectInDbGuardado?.projectName).toBe('Nombre Nuevo');
    });
  });
});