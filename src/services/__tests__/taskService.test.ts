import { Types } from "mongoose";
import Task from "../../models/TaskModel";
import { getTasksByProject } from "../taskService";
import Project from "../../models/ProjectModel";
import { createProject } from "../projectService";


vi.mock("../../models/TaskModel", () => ({
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
    (Task.find as any).mockReturnValue({
    lean: vi.fn().mockResolvedValue(mockTasks),
  });

    const projectId = new Types.ObjectId("507f1f77bcf86cd799439011");
    const result = await getTasksByProject(projectId);

    expect(Task.find).toHaveBeenCalledWith({ project: projectId });
    expect(result).toEqual(mockTasks);
  });
});



vi.mock('../../models/ProjectModel', () => ({
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
  const body = { projectName: 'Test', clientName: 'client name', description: 'Desc' };
  const mockProject = {
    _id: 'proj1',
    name: 'Test',
    manager: userId,
    save: vi.fn().mockResolvedValue(undefined),
  }

  vi.mocked(Project.create).mockResolvedValue(mockProject as any)

  const result = await createProject(body, userId)

  expect(Project.create).toHaveBeenCalledWith({ ...body, manager: userId })
  expect(result).toBe(mockProject)
})
})
