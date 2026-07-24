import { Types } from "mongoose";
import Project from "../models/ProjectModel"

export const getProjectById = async (projectId: string) => {
    return await Project.findById(projectId)
            .populate({
              path: "tasks",
              populate: [
                {
                  path: "notes",
                  populate: {
                    path: "createdBy",
                  },
                },
                {
                  path: "completedBy",
                  populate: {
                    path: "user",
                    select: "_id email name",
                  },
                },
                {
                  path: "project",
                  populate: [
                    {
                      path: "team",
                      select: "_id"
                    },
                    {
                      path: "manager",
                      select: "_id"
                    }
                  ]
                },
                {
                  path: "assignedTo",
                  select: "_id email name avatar"
                }
              ],
            })
            .populate("manager")
            .populate("team")
}

export const createProject = async (body: {name:string, description:string}, userId:Types.ObjectId) => {
  const project = await Project.create(body);
      project.manager = userId;
      await project.save(); 
      return project;
}