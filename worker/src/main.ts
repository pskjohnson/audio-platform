import fs from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";
dotenv.config();

import type { Logger } from "pino";

// Adapters
import { createDbAdapter } from "./adapters/db";
import { createFfmpegAdapter } from "./adapters/ffmpeg";
import { createS3Adapter } from "./adapters/s3";
import { createSqsAdapter } from "./adapters/sqs";
import { createWhisperAdapter } from "./adapters/whisper";
import { config } from "./config";
import { logger, withContext } from "./lib/logger";
// Runner
import { createWorker } from "./worker";

function logStartupSummary(log: Logger) {
  log.info(
    {
      env: config.env,
      workerId: config.workerId,
      aws: {
        region: config.aws.region,
        endpoint: config.aws.endpoint ?? null,
        bucket: config.aws.s3Bucket,
        queueUrl: config.aws.sqsQueueUrl,
      },
      worker: {
        concurrency: config.worker.concurrency,
        sqsWaitTimeSeconds: config.worker.sqsWaitTimeSeconds,
        sqsMaxMessages: config.worker.sqsMaxMessages,
        lockStaleSeconds: config.worker.lockStaleSeconds,
        maxAttempts: config.worker.maxAttempts,
        jobTimeoutMs: config.worker.jobTimeoutMs,
        idleDelayMs: config.worker.idleDelayMs,
      },
      whisper: {
        model: config.whisper.model,
      },
      fs: {
        tmpDir: config.fs.tmpDir,
      },
    },
    "worker starting",
  );
}

async function ensureTmpDir({
  tmpRoot,
  logger,
}: {
  tmpRoot: string;
  logger: Logger;
}) {
  await fs.mkdir(tmpRoot, { recursive: true });
  logger.debug({ tmpRoot }, "temporary directory ready");
}

async function main() {
  const log = withContext({
    workerId: config.workerId,
  });

  logStartupSummary(log);

  const tmpRoot = path.join(config.fs.tmpDir, "transcriptions");
  await ensureTmpDir({ tmpRoot, logger: log });

  // --- Construct adapters -------------------------------------------------

  const db = createDbAdapter({
    databaseUrl: config.db.url,
    logger: log.child({ component: "db" }),
  });

  const s3 = createS3Adapter({
    region: config.aws.region,
    ...(config.aws.endpoint
      ? {
          endpoint: config.aws.endpoint,
        }
      : {}),
    bucket: config.aws.s3Bucket,
    logger: log.child({ component: "s3" }),
  });

  const sqs = createSqsAdapter({
    region: config.aws.region,
    ...(config.aws.endpoint
      ? {
          endpoint: config.aws.endpoint,
        }
      : {}),
    queueUrl: config.aws.sqsQueueUrl,
    waitTimeSeconds: config.worker.sqsWaitTimeSeconds,
    maxMessages: config.worker.sqsMaxMessages,
    logger: log.child({ component: "sqs" }),
  });

  const ffmpeg = createFfmpegAdapter({
    logger: log.child({ component: "ffmpeg" }),
  });

  const whisper = createWhisperAdapter({
    model: config.whisper.model,
    logger: log.child({ component: "whisper" }),
  });

  // --- Create worker ------------------------------------------------------

  const worker = createWorker({
    workerId: config.workerId,
    tmpRoot,
    logger: log,
    db,
    s3,
    sqs,
    ffmpeg,
    whisper,
    // knobs (if you add them)
    concurrency: config.worker.concurrency,
    lockStaleSeconds: config.worker.lockStaleSeconds,
    maxAttempts: config.worker.maxAttempts,
    jobTimeoutMs: config.worker.jobTimeoutMs,
    idleDelayMs: config.worker.idleDelayMs,
  });

  // --- Graceful shutdown --------------------------------------------------

  const shutdown = async (signal: string) => {
    log.info({ signal }, "shutdown signal received");

    try {
      await worker.stop(); // stops polling and waits in-flight jobs
      await db.close(); // close pool

      log.info("shutdown complete");
      process.exit(0);
    } catch (err) {
      log.error({ err }, "shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await worker.start();
}

// Crash fast on boot errors
main().catch((err) => {
  logger.fatal({ err }, "fatal error during worker startup");
  process.exit(1);
});
