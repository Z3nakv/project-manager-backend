import { NextFunction, Request, Response } from "express";
import Project, { IProject } from "../models/ProjectModel";

declare global {
    namespace Express {
        interface Request {
            project: IProject;
        }
    }
}

export const projectExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectID } = req.params;
        const project = await Project.findById(projectID);
        
        if (!project) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }
        
        req.project = project; // Attach the project to the request object for later use    
        next();
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error al verificar la existencia del proyecto' });
    }
}

export const hasProjectAccess = async (req: Request, res: Response, next: NextFunction) => {

    const isMember = req.project.team.some(
        member => member?.toString() === req.user?._id.toString()
    );

    const isManager = req.project.manager?.toString() === req?.user?._id.toString();

    if(!isMember && !isManager) {
        const error = new Error('No tienes acceso a este proyecto')
        return res.status(403).json({ error: error.message })
    }

    next()
}