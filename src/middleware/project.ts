import { NextFunction, Request, Response } from "express";
import Project, { IProject } from "../models/ProjectModel";
import { NotFoundError, UnauthorizedError } from "../utils/errors";

declare global {
  namespace Express {
    interface Request {
      project: IProject;
    }
  }
}

export const projectExists = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projectId = req.params.projectId;
    const project = await Project.findById(projectId);
    if (!project) throw new NotFoundError("Proyecto", projectId.toString());
    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

export const hasProjectAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const isMember = req.project.team.some(
      (member) => member?.toString() === req.user?._id.toString(),
    );
    const isManager =
      req.project.manager?.toString() === req?.user?._id.toString();
    if (!isMember && !isManager) {
      throw new UnauthorizedError("No tienes acceso a este proyecto");
    }
    next();
  } catch (error) {
    next(error);
  }
};
