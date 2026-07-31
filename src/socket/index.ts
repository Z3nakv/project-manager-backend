import { Server } from "socket.io";

export const setupSocket = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on("join_user", (userId) => {
      void socket.join(userId);
      console.log(`socket ${socket.id} se unió a sala ${userId}`);
    });


    //socket members event
    socket.on("member_added", (data) => {
      socket.to(data.userId).emit("member_added_notification", data.message);
    });

    socket.on("member_removed", (data) => {
      socket.to(data.userId).emit("member_removed_notification", data.message);
    });


    socket.on("task_status_update", (data) => {
      data.team.forEach((memberId: string) => {
        if (memberId !== data.triggeredBy) {
          // excluye al emisor
          socket
            .to(memberId)
            .emit("task_status_updated_notification", {
              message: data.message,
              projectId: data.projectId,
            });
        }
      }); 
    });
  });
};
