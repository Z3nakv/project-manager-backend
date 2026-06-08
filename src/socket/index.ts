import { Server } from "socket.io";

export const setupSocket = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on("join_user", (userID) => {
      socket.join(userID);
      console.log(`socket ${socket.id} se unió a sala ${userID}`)
    });

    socket.on("join_project", (projectID) => {
      console.log(`socket ${socket.id} se unió a la sala ${projectID}`);
      console.log("salas actuales:", socket.rooms);
    });

    socket.on("send_message", (data) => {
      data.team.forEach((memberID: string) => {
        if(memberID !== data.triggeredBy) { // excluye al emisor
            socket.to(memberID).emit("task_status_updated_notification", data)
        }
      }); // solo a la sala del proyecto
    });

    socket.on("leave_project", (projectID) => {
      socket.leave(projectID);
    });

    socket.on("project_deleted", (data) => {
      data.team.forEach((memberID: string) => {
        socket.to(memberID).emit("receive_project_deleted", data);
      });
    });

    socket.on('member_added', (data) => {
      socket.to(data.userID).emit("member_added_notification", data)
    });

    socket.on('member_removed', (data) => {
      socket.to(data.userID).emit("member_removed_notification", data)
    })

    socket.on("taskCreated", (data) => {
      data.project.team.forEach((memberID: string) => {
        socket.to(memberID).emit("taskCreatedMessage", data);
      });
    });

    socket.on("taskDeleted", (data) => {
      data.project.team.forEach((memberID: string) => {
        socket.to(memberID).emit("taskDeletedMessage", data);
      });
  });

    socket.on("taskUpdated", (data) => {
      data.project.team.forEach((memberID: string) => {
        socket.to(memberID).emit("taskUpdatedMessage", data);
      });
    })

    socket.on("project_updated", (data) => {
      data.team.forEach((memberID : string) => {
        socket.to(memberID).emit("project_updated_notification", data.message)
      })
    }) 
})};
