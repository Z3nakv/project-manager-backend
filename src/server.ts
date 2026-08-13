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
import reseedDemoData from './scripts/reseedDemo';
configDotenv();

const server = express();

const allowedOrigins : string[] = [
  process.env.FRONTEND_URL, // producción
  "http://localhost:5173", // desarrollo local
].filter((origin): origin is string => Boolean(origin));

const httpServer  = createServer(server);
const io = new Server(httpServer, {
    cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});
setIO(io);
server.use(morgan('dev'));
server.use(cookieParser());
server.set("trust proxy", 1);
server.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
}));
server.use(express.json());

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

if (process.env.NODE_ENV === "production") {
  setInterval(() => {
    reseedDemoData().catch((error) => {
      console.error("Error reseeding demo data:", error);
    });
  }, 6 * 60 * 60 * 1000);
}

server.use("/health", healthRoutes);

server.use("/api", apiLimiter);
server.use("/api/projects/:projectId/ai", aiLimiter, aiRoutes);

server.use('/api/notifications', notificationsRoute);
server.use('/api/auth', authRouter);
server.use('/api/projects', projectRouter);
server.use('/api/projects', attachmentRouter);

server.use(errorHandler);

server.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

setupSocket(io);

export default httpServer ;