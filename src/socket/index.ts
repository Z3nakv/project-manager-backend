import { Server } from "socket.io";

export const setupSocket = (io: Server) => {
  io.on("connection", (socket) => {

    socket.on("join_user", (userID) => {
      socket.join(userID);
      console.log(`socket ${socket.id} se unió a sala ${userID}`)
    });

    //socket project events
    socket.on("project_updated", (data) => {
      data.team.forEach((memberID : string) => {
        socket.to(memberID).emit("project_updated_notification", data.message)
      })
    })

    socket.on("project_deleted", (data) => {
      data.team.forEach((memberID: string) => {
        socket.to(memberID).emit("project_deleted_notification", data.message);
      });
    });

    //socket members event
    socket.on('member_added', (data) => {
      socket.to(data.userID).emit("member_added_notification", data.message)
    });

    socket.on('member_removed', (data) => {
      socket.to(data.userID).emit("member_removed_notification", data.message)
    })

    //socket task events
    socket.on("task_created", (data) => {
      data.project.team.forEach((memberID: string) => {
        socket.to(memberID).emit("task_created_notification", {message: data.message,projectID: data.project._id});
      });
    });

    socket.on("taskDeleted", (data) => {
      data.project.team.forEach((memberID: string) => {
        socket.to(memberID).emit("task_deleted_notification", {message: data.message,projectID: data.project._id});
      });
  });

    socket.on("taskUpdated", (data) => {
      data.project.team.forEach((memberID: string) => {
        socket.to(memberID).emit("task_updated_notification", {message: data.message,projectID: data.project._id});
      });
    }) 

    socket.on("task_status_update", (data) => {
      data.team.forEach((memberID: string) => {
        if(memberID !== data.triggeredBy) { // excluye al emisor
            socket.to(memberID).emit("task_status_updated_notification", {message: data.message, projectID: data.projectID})
        }
      }); // solo a la sala del proyecto
    });
})};
