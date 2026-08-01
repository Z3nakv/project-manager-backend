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
import cookieParser from 'cookie-parser';
import morgan from 'morgan'
import { setIO } from './socket/socketInstance';
import healthRoutes from './routes/healthRoutes';
configDotenv();

const server = express();

const httpServer  = createServer(server);
const io = new Server(httpServer, {
    cors: {origin: process.env.FRONTEND_URL}
});
setIO(io);
server.use(morgan('dev'));
server.use(cookieParser());
server.set("trust proxy", 1);
server.use(cors({
    origin:process.env.FRONTEND_URL,
    credentials: true
}));

/* server.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", process.env.FRONTEND_URL, "ws://localhost:*"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        scriptSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // necesario para Cloudinary
  })
); */

server.use(helmet());
server.use("/health", healthRoutes);
server.use("/api", apiLimiter);
server.use("/api/projects", aiLimiter, aiRoutes);
console.log('NODE_ENV:', process.env.NODE_ENV);

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