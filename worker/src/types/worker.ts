import type { Logger } from "pino";

import type { DbAdapter } from "./db";
import type { FfmpegAdapter } from "./ffmpeg";
import type { S3Adapter } from "./s3";
import type { SqsAdapter } from "./sqs";
import type { WhisperAdapter } from "./whisper";

export type CreateWorkerProps = {
  workerId: string;
  logger: Logger;
  tmpRoot: string;

  db: DbAdapter;
  s3: S3Adapter;
  sqs: SqsAdapter;
  ffmpeg: FfmpegAdapter;
  whisper: WhisperAdapter;

  concurrency: number;
  lockStaleSeconds: number;
  maxAttempts: number;
  jobTimeoutMs: number;
  idleDelayMs: number;
};

export type ProcessTranscriptionRequestProps = {
  transcriptionId: string;
  workerId: string;
  tmpRoot: string;

  db: DbAdapter;
  s3: S3Adapter;
  ffmpeg: FfmpegAdapter;
  whisper: WhisperAdapter;

  lockStaleSeconds: number;
  maxAttempts: number;
  jobTimeoutMs: number;

  logger: Logger;
};

export type GetDecisionProps = {
  transcriptionId: string;
  workerId: string;
  lockStaleSeconds: number;
  maxAttempts: number;
  db: DbAdapter;
  logger: Logger;
};

export type TranscriptionDecision =
  | {
      action: "ack";
      reason:
        | "missing"
        | "already_succeeded"
        | "already_failed"
        | "max_attempts_reached";
    }
  | { action: "retry"; reason: "actively_locked" | "race_condition" }
  | {
      action: "process";
      context: {
        audioId: string;
        attemptCount: number;
        transcriptionId: string;
      };
    };

export type ExecuteTranscriptionProps = {
  transcriptionId: string;
  tmpRoot: string;

  db: DbAdapter;
  s3: S3Adapter;
  ffmpeg: FfmpegAdapter;
  whisper: WhisperAdapter;

  jobTimeoutMs: number;

  logger: Logger;
  workerId: string;
};

// Keep the runner simple: it only needs to know whether to ack or retry
export type ProcessResult = "acked" | "retry";
