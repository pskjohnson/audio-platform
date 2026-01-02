import { z } from "zod";

/**
 * Environment variable schema.
 * This is the single source of truth for config.
 */
export const EnvSchema = z.object({
  // --- Environment ---------------------------------------------------------

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  WORKER_ID: z.string().optional(),

  // --- AWS / LocalStack ----------------------------------------------------

  AWS_DEFAULT_REGION: z.string().default("us-east-1"),

  // If set, AWS clients should point here (LocalStack)
  LOCALSTACK_ENDPOINT: z.url().optional(),

  AUDIO_BUCKET_NAME: z.string().min(1, "AUDIO_BUCKET_NAME is required"),

  // Prefer queue URL over name in workers
  TRANSCRIBE_QUEUE_URL: z.string().min(1, "TRANSCRIBE_QUEUE_URL is required"),

  // --- Database ------------------------------------------------------------

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL must start with postgres:// or postgresql://",
    ),

  // --- Worker behavior -----------------------------------------------------

  CONCURRENCY: z.coerce.number().int().min(1).default(1),

  SQS_WAIT_TIME_SECONDS: z.coerce.number().int().min(0).max(20).default(20),

  SQS_MAX_MESSAGES: z.coerce.number().int().min(1).max(10).default(1),

  JOB_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(20 * 60 * 1000),

  IDLE_DELAY_MS: z.coerce.number().int().min(0).default(0),

  LOCK_STALE_SECONDS: z.coerce
    .number()
    .int()
    .min(30)
    .default(15 * 60),

  MAX_ATTEMPTS: z.coerce.number().int().min(1).default(3),

  // --- Files ---------------------------------------------------------------

  TMP_DIR: z.string().default("/tmp"),

  // --- Whisper -------------------------------------------------------------

  WHISPER_MODEL: z.string().default("base"),
});
