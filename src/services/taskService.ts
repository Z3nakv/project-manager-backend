import Task from "../models/TaskModel"


export const getTasksByProject = async (projectId: string) => {
  return Task.find({ project: projectId }).populate('project');
}