import { Server } from "socket.io";

export const setupSocket = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on("join_user", (userId) => {
      socket.join(userId);
      console.log(`socket ${socket.id} se unió a sala ${userId}`);
    });

    //socket project events
    socket.on("project_updated", (data) => {
      data.team.forEach((memberId: string) => {
        socket.to(memberId).emit("project_updated_notification", data.message);
      });
    });

    socket.on("project_deleted", (data) => {
      data.team.forEach((memberId: string) => {
        socket.to(memberId).emit("project_deleted_notification", data.message);
      });
    });

    //socket members event
    socket.on("member_added", (data) => {
      socket.to(data.userId).emit("member_added_notification", data.message);
    });

    socket.on("member_removed", (data) => {
      socket.to(data.userId).emit("member_removed_notification", data.message);
    });

    //socket task events
    socket.on("task_created", (data) => {
      data.project.projectTeam.forEach((memberId: string) => {
        socket
          .to(memberId)
          .emit("task_created_notification", {
            message: data.message,
            projectId: data.project.projectId,
          });
      });
    });

    socket.on("taskDeleted", (data) => {
      data.project.projectTeam.forEach((memberId: string) => {
        socket
          .to(memberId)
          .emit("task_deleted_notification", {
            message: data.message,
            projectId: data.project.projectId,
          });
      });
    });

    socket.on("taskUpdated", (data) => {
      data.project.projectTeam.forEach((memberId: string) => {
        socket
          .to(memberId)
          .emit("task_updated_notification", {
            message: data.message,
            projectId: data.project.projectId,
          });
      });
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
      }); // solo a la sala del proyecto
    });

    socket.on("assignedTask", (data) => {
      data.userIds?.forEach((memberId: string) => {
        socket
          .to(memberId)
          .emit("assigned_task_notification", {
            message: `La tarea ${data.taskName} del proyecto ${data.projectName} se asigno correctamente`,
            projectId: data.projectId,
          });
      });
    });
  });
};
