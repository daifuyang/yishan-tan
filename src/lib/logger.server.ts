import { pino } from "pino";

export const logger = pino({
  level: process.env.APP_LOG_LEVEL ?? process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } },
  base: { service: "yishan-tan" },
  redact: {
    paths: [
      "password",
      "*.password",
      'headers["x-api-key"]',
      "headers.authorization",
      "token",
      "*.token",
    ],
    censor: "[redacted]",
  },
});
