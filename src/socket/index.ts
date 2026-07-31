import { Server } from "socket.io";

export const setupSocket = (io: Server) => {
  io.on("connection", (socket) => {
    socket.on("join_user", (userId) => {
      void socket.join(userId);
      console.log(`socket ${socket.id} se unió a sala ${userId}`);
    });
  });
};
