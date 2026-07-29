import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { NotificationController } from "../NotificationController";
import Notification from "../../models/NotificationModel";
import User from "../../models/UserModel";
import "../../models/ProjectModel"; 
import {
  connectTestDB,
  closeTestDB,
  clearTestDB,
} from "../../__tests__/setup/db";
import { AppError } from "../../utils/errors";

vi.mock("../../services/notificationService", () => ({
  createNotification: vi.fn(),
  getNotifications: vi.fn().mockImplementation(async (userId) => {
    // Dynamic import to avoid circular dependency at module load time
    const { default: Notification } = await import("../../models/NotificationModel");
    return Notification.find({ user: userId })
      .populate("triggeredBy", "name email")
      .populate("project", "_id")
      .populate("task", "_id")
      .populate("user", "_id name email")
      .sort({ createdAt: -1 })
      .limit(20);
  }),
  markAsRead: vi.fn().mockImplementation(async (notificationId, userId) => {
    const { default: Notification } = await import("../../models/NotificationModel");
    const { NotFoundError, UnauthorizedError } = await import("../../utils/errors");
    const notification = await Notification.findById(notificationId);
    if (!notification) throw new NotFoundError("Notification", notificationId);
    if (notification.user?.toString() !== userId.toString()) throw new UnauthorizedError();
    notification.read = true;
    await notification.save();
  }),
  clearAll: vi.fn().mockImplementation(async (userId) => {
    const { default: Notification } = await import("../../models/NotificationModel");
    return Notification.deleteMany({ user: userId });
  }),
  notifyChangesToTeam: vi.fn().mockResolvedValue(undefined),
  notifyChangesToTeamSafely: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../server", () => ({
  io: {
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  },
}));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

function getNextSpy() {
  return vi.fn() as unknown as NextFunction;
}

function getErrorFromNext(next: ReturnType<typeof vi.fn>): AppError {
  return next.mock.calls[0][0] as AppError;
}

describe("NotificationController", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe("getNotifications", () => {
    it("debe devolver solo las notificaciones del usuario, ordenadas por más recientes", async () => {
      const user = await User.create({
        name: "User",
        email: "u1@test.com",
        password: "hash",
      });
      const otroUser = await User.create({
        name: "Otro",
        email: "u2@test.com",
        password: "hash",
      });
      const triggeredBy = await User.create({
        name: "Trigger",
        email: "trig@test.com",
        password: "hash",
      });

      await Notification.create({
        user: user._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(), // 👈 agregar
        type: "task_created",
        content: "Notif 1",
      });
      await Notification.create({
        user: otroUser._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(), // 👈 agregar
        type: "task_created",
        content: "Notif ajena",
      });

      const req = { user } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await NotificationController.getNotifications(req, res, next);

      const returned = (res.json as any).mock.calls[0][0];
      expect(returned).toHaveLength(1);
      expect(returned[0].content).toBe("Notif 1");
    });
  });

  describe("markAsRead", () => {
    it("debe marcar como leída la notificación del propio usuario", async () => {
      const user = await User.create({
        name: "User",
        email: "u3@test.com",
        password: "hash",
      });
      const triggeredBy = await User.create({
        name: "Trigger",
        email: "trig2@test.com",
        password: "hash",
      });
      const notification = await Notification.create({
        user: user._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(),
        type: "task_created",
        content: "Notif",
        read: false,
      });

      const req = {
        params: { notificationId: notification._id.toString() },
        user,
      } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await NotificationController.markAsRead(req, res, next);

      const updated = await Notification.findById(notification._id);
      expect(updated?.read).toBe(true);
    });

    it("debe retornar 403 si la notificación pertenece a otro usuario (bug corregido)", async () => {
      const dueño = await User.create({
        name: "Dueño",
        email: "dueno@test.com",
        password: "hash",
      });
      const otroUsuario = await User.create({
        name: "Otro",
        email: "otro-notif@test.com",
        password: "hash",
      });
      const triggeredBy = await User.create({
        name: "Trigger",
        email: "trig3@test.com",
        password: "hash",
      });

      const notification = await Notification.create({
        user: dueño._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(),
        type: "task_created",
        content: "Notif",
      });

      // Confirmamos la premisa del bug: user es un ObjectId sin popular
      expect(notification.user).toBeInstanceOf(Types.ObjectId);

      const req = {
        params: { notificationId: notification._id.toString() },
        user: otroUsuario, // 👈 intenta marcar como leída una notificación ajena
      } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await NotificationController.markAsRead(req, res, next);

      const error = getErrorFromNext(next);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      const stillUnread = await Notification.findById(notification._id);
      expect(stillUnread?.read).toBe(false);
    });

    it("debe retornar 404 si la notificación no existe", async () => {
      const user = await User.create({
        name: "User",
        email: "u4@test.com",
        password: "hash",
      });
      const fakeId = new Types.ObjectId().toString();

      const req = {
        params: { notificationId: fakeId },
        user,
      } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await NotificationController.markAsRead(req, res, next);

      const error = getErrorFromNext(next);
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
    });
  });

  describe("clearAll", () => {
    it("debe eliminar solo las notificaciones del usuario actual", async () => {
      const user = await User.create({
        name: "User",
        email: "u5@test.com",
        password: "hash",
      });
      const otroUser = await User.create({
        name: "Otro",
        email: "u6@test.com",
        password: "hash",
      });
      const triggeredBy = await User.create({
        name: "Trigger",
        email: "trig4@test.com",
        password: "hash",
      });

      await Notification.create({
        user: user._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(),
        type: "task_created",
        content: "A",
      });
      await Notification.create({
        user: user._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(),
        type: "task_created",
        content: "B",
      });
      await Notification.create({
        user: otroUser._id,
        triggeredBy: triggeredBy._id,
        project: new Types.ObjectId(),
        type: "task_created",
        content: "C",
      });

      const req = { user } as unknown as Request;
      const res = mockRes();
      const next = getNextSpy();

      await NotificationController.clearAll(req, res, next);

      const remaining = await Notification.find({});
      expect(remaining).toHaveLength(1);
      expect(remaining[0].content).toBe("C");
    });
  });
});
