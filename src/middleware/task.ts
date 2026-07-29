import type { Request, Response, NextFunction } from 'express'
import Task, { ITask } from '../models/TaskModel'
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';

declare global {
    namespace Express {
        interface Request {
            task: ITask
        }
    }
}

export async function taskExists( req: Request, res: Response, next: NextFunction ) {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);
        if(!task) throw new NotFoundError("Task", taskId.toString());
        req.task = task;
        next()
    } catch (error) {
        next(error);
    }
}

export function taskBelongsToProject(req: Request, res: Response, next: NextFunction ) {
    if(req.task.project.toString() !== req.project._id.toString()) {
        throw new ValidationError("Acción no válida");
    }
    next();
}

    export const hasAuthorization = async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (req.user?._id.toString() !== req.project.manager?.toString()) {
             throw new UnauthorizedError("Acción no válida");
            }
            next();
        } catch (error) {
            next(error);
        }
}