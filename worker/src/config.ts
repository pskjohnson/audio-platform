/* eslint-disable no-console */
import { hostname } from "os";
import { z } from "zod";

import { EnvSchema } from "./schemas/envSchema";

/**
 * Parse and validate environment variables at startup.
 * If anything is invalid or missing, this throws immediately.
 */
export const env = (() => {
  try {
    return EnvSchema.parse(process.env);
  } catch (err) {
    if (err instanceof z.ZodError) {
      // readable tree output in v4
      console.dir(z.treeifyError(err), { depth: null });
    }
    throw err; // <-- this is what makes env NOT possibly undefined
  }
})();

/**
 * Final, typed config object used by the worker.
 * This is what the rest of the code imports.
 */
export const config = {
  env: env.NODE_ENV,

  workerId: env.WORKER_ID ?? `${hostname()}-${process.pid}`,

  aws: {
    region: env.AWS_DEFAULT_REGION,
    endpoint: env.LOCALSTACK_ENDPOINT,
    s3Bucket: env.AUDIO_BUCKET_NAME,
    sqsQueueUrl: env.TRANSCRIBE_QUEUE_URL,
  },

  db: {
    url: env.DATABASE_URL,
  },

  worker: {
    concurrency: env.CONCURRENCY,
    sqsWaitTimeSeconds: env.SQS_WAIT_TIME_SECONDS,
    sqsMaxMessages: env.SQS_MAX_MESSAGES,
    jobTimeoutMs: env.JOB_TIMEOUT_MS,
    idleDelayMs: env.IDLE_DELAY_MS,
    lockStaleSeconds: env.LOCK_STALE_SECONDS,
    maxAttempts: env.MAX_ATTEMPTS,
  },

  fs: {
    tmpDir: env.TMP_DIR,
  },

  whisper: {
    model: env.WHISPER_MODEL,
  },
} as const;
