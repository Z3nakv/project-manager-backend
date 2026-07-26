import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AttachmentController } from '../AttachmentController';
import { Attachment } from '../../models/Attachment';
import Task from '../../models/TaskModel';
import Project from '../../models/ProjectModel';
import User from '../../models/UserModel';
import { connectTestDB, closeTestDB, clearTestDB } from '../../__tests__/setup/db';
import { uploadToCloudinary } from '../../utils/uploadToCloudinary';
import cloudinary from '../../config/cloudinary';
import { getCloudinaryUrl } from '../../utils/cloudinaryUrl';

vi.mock('../../utils/uploadToCloudinary', () => ({
  uploadToCloudinary: vi.fn(),
}));

vi.mock('../../config/cloudinary', () => ({
  default: {
    uploader: {
      destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

vi.mock('../../utils/cloudinaryUrl', () => ({
  getCloudinaryUrl: vi.fn((publicId, w, h) => `https://cloudinary.test/${publicId}?w=${w}&h=${h}`),
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
  const task = await Task.create({ name: 'Tarea', description: 'Desc', project: project._id });
  return { manager, project, task };
}

describe('AttachmentController', () => {
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

  describe('createAttachment', () => {
    it('debe crear el attachment con los datos del archivo y de Cloudinary', async () => {
      const { manager, project, task } = await setup();

      vi.mocked(uploadToCloudinary).mockResolvedValue({
        url: 'https://cloudinary.test/original-url',
        public_id: 'cloudinary-public-id-123',
      });

      const req = {
        file: {
          buffer: Buffer.from('contenido falso'),
          originalname: 'documento.pdf',
          mimetype: 'application/pdf',
          size: 12345,
        },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await AttachmentController.createAttachment(req, res);

      expect(uploadToCloudinary).toHaveBeenCalledTimes(1);

      const attachmentInDb = await Attachment.findOne({ filename: 'documento.pdf' });
      expect(attachmentInDb).not.toBeNull();
      expect(attachmentInDb?.publicId).toBe('cloudinary-public-id-123');
      expect(attachmentInDb?.task?.toString()).toBe(task._id.toString());
      expect(attachmentInDb?.uploadedBy?.toString()).toBe(manager._id.toString());

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe retornar 400 si no se envió ningún archivo', async () => {
      const { manager, project, task } = await setup();

      const req = { file: undefined, task, project, user: manager } as unknown as Request;
      const res = mockRes();

      await AttachmentController.createAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(uploadToCloudinary).not.toHaveBeenCalled();
    });

    it('debe retornar 500 si Cloudinary falla al subir el archivo (bug corregido)', async () => {
      const { manager, project, task } = await setup();

      vi.mocked(uploadToCloudinary).mockRejectedValue(new Error('Cloudinary timeout'));

      const req = {
        file: {
          buffer: Buffer.from('contenido'),
          originalname: 'archivo.png',
          mimetype: 'image/png',
          size: 999,
        },
        task,
        project,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await AttachmentController.createAttachment(req, res);

      // Antes del fix, esto se colgaba sin responder (solo console.log)
      expect(res.status).toHaveBeenCalledWith(500);

      const attachmentInDb = await Attachment.findOne({ filename: 'archivo.png' });
      expect(attachmentInDb).toBeNull();
    });
  });

  describe('getTaskAttachments', () => {
    it('debe devolver los attachments de la tarea con URL de miniatura transformada', async () => {
      const { manager, task } = await setup();
      await Attachment.create({
        task: task._id,
        uploadedBy: manager._id,
        filename: 'imagen.png',
        url: 'https://cloudinary.test/original',
        publicId: 'public-id-abc',
        mimeType: 'image/png',
        size: 500,
      });

      const req = { task } as unknown as Request;
      const res = mockRes();

      await AttachmentController.getTaskAttachments(req, res);

      const returned = (res.json as any).mock.calls[0][0];
      expect(returned).toHaveLength(1);
      expect(getCloudinaryUrl).toHaveBeenCalledWith('public-id-abc', 100, 80);
      expect(returned[0].url).toBe('https://cloudinary.test/public-id-abc?w=100&h=80');
    });

    it('debe devolver un array vacío si la tarea no tiene attachments', async () => {
      const { task } = await setup();

      const req = { task } as unknown as Request;
      const res = mockRes();

      await AttachmentController.getTaskAttachments(req, res);

      const returned = (res.json as any).mock.calls[0][0];
      expect(returned).toEqual([]);
    });
  });

  describe('deleteTaskAttachment', () => {
    it('debe eliminar el attachment si pertenece a la tarea y al usuario', async () => {
      const { manager, task } = await setup();
      const attachment = await Attachment.create({
        task: task._id,
        uploadedBy: manager._id,
        filename: 'a-borrar.png',
        url: 'https://cloudinary.test/original',
        publicId: 'public-id-borrar',
        mimeType: 'image/png',
        size: 100,
      });

      const req = {
        params: { imageId: attachment._id.toString() },
        task,
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await AttachmentController.deleteTaskAttachment(req, res);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('public-id-borrar');
      const attachmentInDb = await Attachment.findById(attachment._id);
      expect(attachmentInDb).toBeNull();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe retornar 404 si el attachment no existe (bug corregido)', async () => {
      const { task, manager } = await setup();
      const fakeId = new Types.ObjectId().toString();

      const req = { params: { imageId: fakeId }, task, user: manager } as unknown as Request;
      const res = mockRes();

      await AttachmentController.deleteTaskAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('debe retornar 400 si el attachment NO pertenece a la tarea de la URL (bug corregido)', async () => {
      const { manager, project } = await setup();
      const otraTask = await Task.create({ name: 'Otra Tarea', description: 'Desc', project: project._id });
      const attachmentDeOtraTask = await Attachment.create({
        task: otraTask._id,
        uploadedBy: manager._id,
        filename: 'ajeno.png',
        url: 'https://cloudinary.test/original',
        publicId: 'public-id-ajeno',
        mimeType: 'image/png',
        size: 100,
      });
      const { task } = await setup(); // otra tarea distinta, la de la URL

      const req = {
        params: { imageId: attachmentDeOtraTask._id.toString() },
        task, // 👈 tarea distinta a la que realmente contiene el attachment
        user: manager,
      } as unknown as Request;
      const res = mockRes();

      await AttachmentController.deleteTaskAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      const stillExists = await Attachment.findById(attachmentDeOtraTask._id);
      expect(stillExists).not.toBeNull();
    });

    it('debe retornar 401 si el usuario NO es quien subió el attachment (bug corregido)', async () => {
      const { manager, task } = await setup();
      const otroUsuario = await User.create({ name: 'Otro', email: 'otro-attach@test.com', password: 'hash' });
      const attachment = await Attachment.create({
        task: task._id,
        uploadedBy: manager._id,
        filename: 'protegido.png',
        url: 'https://cloudinary.test/original',
        publicId: 'public-id-protegido',
        mimeType: 'image/png',
        size: 100,
      });

      const req = {
        params: { imageId: attachment._id.toString() },
        task,
        user: otroUsuario,
      } as unknown as Request;
      const res = mockRes();

      await AttachmentController.deleteTaskAttachment(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      const stillExists = await Attachment.findById(attachment._id);
      expect(stillExists).not.toBeNull();
    });
  });
});