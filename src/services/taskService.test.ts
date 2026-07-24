import { Types } from "mongoose";
import Project from "../models/ProjectModel";
import Task from "../models/TaskModel";
import { createProject } from "./projectService";
import { getTasksByProject } from "./taskService";

vi.mock("../models/TaskModel", () => ({
  default: {
    find: vi.fn(),
  },
}));

describe("getTasksByProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("llama a Task.find con el projectId correcto", async () => {
    const mockTasks = [{ _id: "1", name: "Tarea 1" }];
    const populateMock = vi.fn().mockResolvedValue(mockTasks)
    ;(Task.find as any).mockReturnValue({ populate: populateMock });

    const result = await getTasksByProject("proj123");

    expect(Task.find).toHaveBeenCalledWith({ project: "proj123" });
    expect(result).toEqual(mockTasks);
  });
});



vi.mock('../models/ProjectModel', () => ({
  default: {
    create: vi.fn(),
  },
}))

describe('createProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asigna el manager y guarda el proyecto', async () => {
    const userId = new Types.ObjectId()
    const mockProject = {
      _id: 'proj1',
      name: 'Test',
      manager: undefined,
      save: vi.fn().mockResolvedValue(undefined),
    }

    vi.mocked(Project.create).mockResolvedValue(mockProject as any)

    const result = await createProject({ name: 'Test', description: 'Desc' }, userId)

    expect(Project.create).toHaveBeenCalledWith({ name: 'Test', description: 'Desc' })
    expect(mockProject.manager).toBe(userId)
    expect(mockProject.save).toHaveBeenCalled()
    expect(result).toBe(mockProject)
  })
})
