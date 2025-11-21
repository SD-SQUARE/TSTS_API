import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import compression from "compression";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import {xss} from "express-xss-sanitizer";
import * as i18nextMiddleware from "i18next-http-middleware";
import i18n from "./config/i18n.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { csrfMiddleware } from "./config/csrf.js";


const app = express();

// basic security
app.use(helmet({ contentSecurityPolicy: false })); // CSP setup later if needed
app.use(hpp());
app.use(xss());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// i18n
app.use(i18nextMiddleware.handle(i18n));

// CSRF (set up if using cookies and forms; for API token flows consider disabling)
// @AhmedElsenaty
// TODO: enable in prod
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") app.use(csrfMiddleware);

import { 
  authRouter,
  usersRouter
} from "./routes/index.js";

// routes
app.use("/api/v1/auth", authRouter );
app.use("/api/v1/users", usersRouter );


app.use(errorHandler);

export default app;
