import type { NextFunction, Request, Response } from 'express'
import { addMemberById, findMemberByEmail, getProjectTeam, removeMemberById } from '../services/teamService'


export class TeamMemberController {
  static findMemberByEmail = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { email } = req.body;
      const user = await findMemberByEmail(email);
      res.json(user);
    } catch (error) {
      next(error);
    }
  };

  static getProjecTeam = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.project;
      const team = await getProjectTeam(_id);
      res.json(team);
    } catch (error) {
      next(error);
    }
  };

  static addMemberById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { _id } = req.body;
      await addMemberById(_id, req.project, req.user!._id)
      res.json({ message: "Usuario agregado correctamente" });
    } catch (error) {
      next(error);
    }
  };

  static removeMemberById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.userId as string;
      await removeMemberById(userId, req.project, req.user!._id);
      res.json({
        message: "Usuario eliminado correctamente",
        manager: req.user?.name,
        colaborador: userId,
      });
    } catch (error) {
      next(error);
    }
  };
}
