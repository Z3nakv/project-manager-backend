import { configDotenv } from 'dotenv';
import express from 'express';
import projectRouter from './routes/projectRoutes';
import cors from 'cors';
import authRouter from './routes/authRoutes';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { setupSocket } from './socket';
import notificationsRoute from './routes/notificationRoutes';
import attachmentRouter from './routes/attachmentRoutes';
import aiRoutes from './routes/aiRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import { aiLimiter, apiLimiter } from './middleware/limiter';

configDotenv();

const server = express();

const httpServer  = createServer(server);
export const io = new Server(httpServer, {
    cors: {origin: process.env.FRONTEND_URL}
});

server.set("trust proxy", 1);
server.use(cors({
    origin:process.env.FRONTEND_URL,
}));
server.use(helmet());
server.use("/api", apiLimiter);
server.use("/api/projects", aiLimiter, aiRoutes);


server.use(express.json());

server.use('/api/notifications', notificationsRoute);
server.use('/api/auth', authRouter);
server.use('/api/projects', projectRouter);
server.use('/api/projects', attachmentRouter);
server.use('/api/projects', aiRoutes);

server.use(errorHandler);
//Docs
server.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

setupSocket(io);

export default httpServer ;