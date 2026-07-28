import type { Request, Response } from 'express'
import User from '../models/UserModel'
import Project from '../models/ProjectModel'
import { notifyChangesToTeam } from '../services/notificationService'
import { Types } from 'mongoose'


export class TeamMemberController {
    static findMemberByEmail = async (req: Request, res: Response) => {
        try {
            const { email } = req.body
            const user = await User.findOne({ email }).select('_id email name')
            if (!user) {
                const error = new Error('Usuario No Encontrado')
                return res.status(404).json({ error: error.message })
            }
            res.json(user)
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static getProjecTeam = async (req: Request, res: Response) => {
        try {
            const project = await Project.findById(req.project._id).populate({
                path: 'team',
                select: '_id email name'
            })
            if(!project){
                res.status(404).json({error: "No se pudo encontrar el projecto"})
            }
            res.json(project?.team)
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static addMemberById = async (req: Request, res: Response) => {
        try {
            const { _id } = req.body

            const user = await User.findById(_id).select('_id');
            if (!user) {
                const error = new Error('Usuario No Encontrado');
                return res.status(404).json({ error: error.message });
            }

            if (req.project.team.some(team => team?.toString() === user._id.toString())) {
                const error = new Error('El usuario ya existe en el proyecto');
                return res.status(409).json({ error: error.message });
            }

            req.project.team.push(user._id);
            await req.project.save();

            const members = [{ _id: _id }];

            await notifyChangesToTeam({
                members: members as Array<{ _id: Types.ObjectId }>,
                triggeredBy: req.user!._id!,
                projectId: req.project._id,
                taskId: null,
                actionType: "MEMBER_ADDED",
                content: `${req.user!.name} te agrego al proyecto "${req.project.projectName}"`,
            });

            res.json({message: 'Usuario agregado correctamente'});
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static removeMemberById = async (req: Request, res: Response) => {
        try {
            const _id = req.params.userId! as string;

            if (!req.project.team.some(team => team?.toString() === _id)) {
                const error = new Error('El usuario no existe en el proyecto')
                return res.status(409).json({ error: error.message })
            }

            req.project.team = req.project.team.filter(teamMember => teamMember?.toString() !== _id)
            await req.project.save()

            const members = [{ _id: new Types.ObjectId(_id) }]

            await notifyChangesToTeam({
                members: members as Array<{ _id: Types.ObjectId }>,
                triggeredBy: req.user!._id!,
                projectId: req.project._id,
                taskId: null,
                actionType: "MEMBER_REMOVED",
                content: `${req.user!.name} te elimino del proyecto "${req.project.projectName}"`,
            });

            res.json({ message: 'Usuario eliminado correctamente', manager: req.user?.name, colaborador: _id })
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Hubo un error' })
        }
    }
}
