import winston from "winston";

const transports: winston.transport[] = [
  new winston.transports.File({ filename: "logs/app.log" }),
];

// Add console transport only if not in test mode
if (process.env.TEST_MODE !== "true") {
  transports.push(new winston.transports.Console());
}

const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
  },
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      const metaString =
        Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";

      return `${timestamp} [${level.toUpperCase()}]: ${message} |${metaString}`;
    })
  ),
  transports,
});

logger.exceptions.handle(
  new winston.transports.File({ filename: "logs/exceptions.log" })
);

process.on("unhandledRejection", (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

export default logger;
