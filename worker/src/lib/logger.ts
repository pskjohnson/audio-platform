import pino, { type DestinationStream } from "pino";
import { config } from "../config";

/**
 * Base logger.
 * - Pretty in development
 * - JSON elsewhere
 */

const isDev = config.env === "development";

// Create the transport stream (only in dev)
const transport: DestinationStream | undefined = isDev
  ? pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    })
  : undefined;

// Pino accepts: pino(options, destinationOrTransport?)
export const logger = pino(
  {
    level: config.env === "development" ? "debug" : "info",
    base: {
      service: "transcription-worker",
      env: config.env,
    },
  },
  transport,
);

/**
 * Create a logger scoped to a unit of work.
 */
export function withContext(context: Record<string, unknown>) {
  return logger.child(context);
}

export type Logger = typeof logger;
