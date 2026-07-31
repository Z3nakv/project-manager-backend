import { Types } from "mongoose"
import { emitToUser } from "./notificationEmitter"

export const emitProjectAssigned = (userId: Types.ObjectId, notification:string) => {
    emitToUser(userId, "member_added_notification", notification)
}

export const emitRemovedFromProject = (userId: string, notification:string) => {
    emitToUser(userId, "member_removed_notification", notification)
}