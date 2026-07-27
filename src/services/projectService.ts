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

export const getEditProjectById = async (projectId: string) => {
  return await Project.findById(projectId).populate({path:"team", select: "_id"}); 
}

export const createProject = async (body:{projectName:string, clientName:string, description:string}, userId:Types.ObjectId) => {
  const project = await Project.create(body);
      project.manager = userId;
      await project.save(); 
      return project;
}

type updateProjectProps = {
  project: {clientName:string, projectName:string, description:string}
   body:{clientName:string, projectName:string, description:string}
}
export const updateProject = async ({project, body}: updateProjectProps) => {
    project.clientName = body.clientName;
    project.projectName = body.projectName;
    project.description = body.description;
}