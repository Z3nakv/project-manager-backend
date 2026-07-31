import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import * as notificationService from '../notificationService';
import Notification from '../../models/NotificationModel';

vi.mock('../../server', () => ({
  io: {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  },
}));

vi.mock("../../socket/notificationEmitter", () => ({
  emitToUser: vi.fn(),
  emitToProjectMembers: vi.fn(),
}));

describe('notifyChangesToTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe crear una notificación por cada miembro, excluyendo al triggeredBy', async () => {
    const triggeredBy = new Types.ObjectId();
    const member1 = new Types.ObjectId();
    const member2 = new Types.ObjectId();

    vi.spyOn(Notification, 'create').mockResolvedValue({
      _id: new Types.ObjectId(),
      user: member1,
    } as any);

    await notificationService.notifyChangesToTeam({
      members: [{ _id: triggeredBy }, { _id: member1 }, { _id: member2 }],
      triggeredBy,
      projectId: new Types.ObjectId(),
      taskId: null,
      actionType: 'TASK_CREATED',
      content: 'Contenido',
    });

    // Solo 2 llamadas — excluye al triggeredBy (member1, member2, no triggeredBy)
    expect(Notification.create).toHaveBeenCalledTimes(2);
  });

  it('NO debe fallar por completo si UNA notificación individual falla (bug corregido)', async () => {
    const triggeredBy = new Types.ObjectId();
    const member1 = new Types.ObjectId();
    const member2 = new Types.ObjectId();

    vi.spyOn(Notification, 'create')
      .mockRejectedValueOnce(new Error('Fallo en la primera notificación'))
      .mockResolvedValueOnce({ _id: new Types.ObjectId(), user: member2 } as any);

    // Antes del fix (Promise.all), esto habría lanzado y roto la función completa.
    // Con Promise.allSettled, debe resolver sin lanzar.
    await expect(
      notificationService.notifyChangesToTeam({
        members: [{ _id: member1 }, { _id: member2 }],
        triggeredBy,
        projectId: new Types.ObjectId(),
        taskId: null,
        actionType: 'TASK_CREATED',
        content: 'Contenido',
      })
    ).resolves.not.toThrow();

    // Ambas notificaciones se intentaron, aunque una fallara
    expect(Notification.create).toHaveBeenCalledTimes(2);
  });
});