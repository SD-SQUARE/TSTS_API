import express from "express";
import http from "http";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import compression from "compression";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import { xss } from "express-xss-sanitizer";
import * as i18nextMiddleware from "i18next-http-middleware";
import i18n from "./config/i18n.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { csrfMiddleware } from "./config/csrf.js";
import { socketIoMiddleware } from "./middleware/socketIo.js";
import { io as socketIoInstance } from "./config/socket.js";
import {
  notificationMessage,
  notificationUser,
  ticket,
} from "./services/socket.service.js";
import { requestContextMiddleware } from "./middleware/requestContextMiddleware.js";

const app = express();

app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : 0);
// basic security
app.use(helmet({ contentSecurityPolicy: false })); // CSP setup later if needed
app.use(hpp());
app.use(xss());
app.use(compression());
app.use(express.json({ limit: "1024mb" }));
app.use(express.urlencoded({ limit: "1024mb", extended: true }));
app.use(cookieParser());

// CORS
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").filter(Boolean)
  : []; // remove undefined / empty

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  }),
);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
});
app.use(limiter);

// i18n
app.use(i18nextMiddleware.handle(i18n));

app.use(socketIoMiddleware(socketIoInstance));

app.use(requestContextMiddleware);

import {
  authRouter,
  usersRouter,
  groupsRouter,
  lockupsRouter,
  ticketsRouter,
  chatRouter,
  notificationRouter,
  trustedDevicesRouter,
  authV2Router,
} from "./routes/index.js";
import universitiesRouter from "./routes/universities.router.js";
import domainsRouter from "./routes/domains.router.js";
import departmentsRouter from "./routes/departments.router.js";
import specializationsRouter from "./routes/specializations.router.js";
import workHourRouter from "./routes/workHour.router.js";
import knowlegeBaseRouter from "./routes/knowlegeBase.router.js";
import ProblemRouter from "./routes/problems.router.js";
import reportRoutes from "./routes/report.router.js";

import logger from "./utils/logger.js";
// routes
app.get("/api/v1/health", (req, res) => {
  logger.info("[HealthCheck]: OK");
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});
app.post("/debug/send-events", (_req, res) => {
  notificationMessage("server_started", { message: "Server has started" });
  notificationUser("user_update", {
    userId: "00d53802-93a0-4213-a729-10555798929e",
    info: "Profile updated",
  });
  notificationUser("user_ticket", {
    userId: "00d53802-93a0-4213-a729-10555798929e",
    ticketId: "ticket111",
    info: "New comment",
  });
  ticket("ticket_update", { ticketId: "ticket111", status: "In Progress" });
  res.sendStatus(204);
});

app.use("/api/v2/auth", authV2Router);

// CSRF (set up if using cookies and forms; for API token flows consider disabling)
// @AhmedElsenaty
// TODO: enable in prod
if (process.env.NODE_ENV === "production") app.use(csrfMiddleware);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/trusted-devices", trustedDevicesRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/groups", groupsRouter);
app.use("/api/v1/lockups", lockupsRouter);
app.use("/api/v1/universities", universitiesRouter);
app.use("/api/v1/domains", domainsRouter);
app.use("/api/v1/departments", departmentsRouter);
app.use("/api/v1/specializations", specializationsRouter);
app.use("/api/v1/work-hours", workHourRouter);
app.use("/api/v1/knowledge-base", knowlegeBaseRouter);
app.use("/api/v1/problems", ProblemRouter);

app.use("/api/v1/universities", universitiesRouter);
app.use("/api/v1/domains", domainsRouter);
app.use("/api/v1/departments", departmentsRouter);
app.use("/api/v1/specializations", specializationsRouter);
app.use("/api/v1/work-hours", workHourRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/notifications", notificationRouter);

app.use("/api/v1/reports", reportRoutes);

app.use(errorHandler);

export default app;
