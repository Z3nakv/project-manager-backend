import { Types } from "mongoose";
import { getIO } from "./socketInstance";

export const emitToUser = (userId: Types.ObjectId | string, event: string, data: unknown) => {
  getIO().to(userId.toString()).emit(event, data);
};

type MemberWithId = { _id: Types.ObjectId };

export const emitToProjectMembers = (
  members: Array<MemberWithId | undefined>,
  excludeUserId: Types.ObjectId,
  event: string,
  data: unknown,
) => {
  members
    .filter((member) => member?._id.toString() !== excludeUserId.toString())
    .forEach((member) => {
      emitToUser(member!._id, event, data);
    });
};