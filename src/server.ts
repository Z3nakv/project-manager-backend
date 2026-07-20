import { configDotenv } from 'dotenv';
import express from 'express';
import projectRouter from './routes/projectRoutes';
import connectDB from './config/db';
import cors from 'cors';
import authRouter from './routes/authRoutes';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { setupSocket } from './socket';
import notificationsRoute from './routes/notificationRoutes';
import attachmentRouter from './routes/attachmentRoutes';

configDotenv();

connectDB();

const server = express();

const httpServer  = createServer(server);
export const io = new Server(httpServer, {
    cors: {origin: '*'}
});

server.use(cors());

server.use(express.json());

server.use('/api/notifications', notificationsRoute)
server.use('/api/auth', authRouter);
server.use('/api/projects', projectRouter);
server.use('/api/projects', attachmentRouter);

setupSocket(io);

export default httpServer ;