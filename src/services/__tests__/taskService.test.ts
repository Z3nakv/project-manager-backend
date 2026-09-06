import { Types } from "mongoose";
import Task from "../../models/TaskModel";
import { getTasksByProject } from "../taskService";
import Project from "../../models/ProjectModel";
import { createProject } from "../projectService";
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock("../../models/TaskModel", () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock('../../models/ProjectModel', () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
  },
}));

describe("getTasksByProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("llama a Task.find y Project.findById con el projectId correcto", async () => {
    const projectId = new Types.ObjectId("507f1f77bcf86cd799439011");
    const mockManager = { _id: "user-1", name: "Manager Uno" };
    const mockTasks = [{ _id: "1", name: "Tarea 1" }];

    vi.mocked(Task.find).mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(mockTasks),
    } as any);

    vi.mocked(Project.findById).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      populate: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ manager: mockManager }),
    } as any);

    const result = await getTasksByProject(projectId);

    expect(Project.findById).toHaveBeenCalledWith(projectId);
    expect(Task.find).toHaveBeenCalledWith({ project: projectId });
    expect(result).toEqual({ manager: mockManager, tasks: mockTasks });
  });
});

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asigna el manager y guarda el proyecto', async () => {
    const userId = new Types.ObjectId();
    const body = { projectName: 'Test', clientName: 'client name', description: 'Desc' };
    const mockProject = {
      _id: 'proj1',
      name: 'Test',
      manager: userId,
      save: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(Project.create).mockResolvedValue(mockProject as any);

    const result = await createProject(body, userId, false);

    expect(Project.create).toHaveBeenCalledWith({ ...body, manager: userId, isEphemeralDemo: false });
    expect(result).toBe(mockProject);
  });
});