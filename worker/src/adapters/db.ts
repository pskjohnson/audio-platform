import { Pool } from "pg";
import type { Logger } from "pino";

import type {
  AcquireLockProps,
  AttemptError,
  AudioContext,
  CreateDbAdapterProps,
  DbAdapter,
  GetAudioContextProps,
  GetTranscriptionStateProps,
  LockResult,
  MarkFailedProps,
  MarkSucceededProps,
  RecordAttemptErrorProps,
  TranscriptionDbStatus,
  TranscriptionState,
} from "../types/db";

const validStatuses = ["queued", "processing", "succeeded", "failed"] as const;
type ValidStatus = (typeof validStatuses)[number];

export function createDbAdapter({
  databaseUrl,
  logger,
}: CreateDbAdapterProps): DbAdapter {
  logger.debug("db adapter initialized");

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5, // worker does not need many connections
  });

  async function recordAttemptError({
    transcriptionId,
    attemptNumber,
    errorMessage,
    errorType,
    workerId,
  }: RecordAttemptErrorProps) {
    const errorRecord: AttemptError = {
      attemptNumber,
      errorMessage:
        errorMessage.length > 1000
          ? errorMessage.substring(0, 1000) + "... [truncated]"
          : errorMessage,
      errorType,
      timestamp: new Date().toISOString(),
      workerId,
    };

    // Append to existing array
    await pool.query(
      `
      UPDATE transcriptions 
      SET attempt_errors = COALESCE(attempt_errors, '[]'::jsonb) || $2::jsonb
      WHERE id = $1
    `,
      [transcriptionId, JSON.stringify([errorRecord])],
    );
  }

  async function acquireLock({
    transcriptionId,
    workerId,
    lockStaleSeconds,
  }: AcquireLockProps): Promise<LockResult> {
    const result = await pool.query<{
      audioId: string;
      attemptCount: number;
      status: TranscriptionDbStatus;
      lockedAt: Date;
      lockedBy: string;
    }>(
      `
    UPDATE transcriptions
    SET
      status = 'processing',
      locked_at = NOW(),
      locked_by = $2,
      attempt_count = attempt_count + 1,
      updated_at = NOW()
    WHERE id = $1
      AND (
        status IN ('queued', 'failed')
        OR (
          status = 'processing'
          AND locked_at < NOW() - ($3 || ' seconds')::interval
        )
      )
    RETURNING 
      id,
      status,
      audio_id as "audioId",
      attempt_count as "attemptCount",
      locked_at as "lockedAt",
      locked_by as "lockedBy"
    `,
      [transcriptionId, workerId, lockStaleSeconds],
    );

    if (result.rowCount === 0) {
      // Race condition - someone else got the lock between our SELECT and UPDATE
      return {
        acquired: false,
      };
    }

    const { audioId, attemptCount } = result.rows[0]!;
    return {
      acquired: true,
      audioId: audioId,
      attemptCount: attemptCount,
    };
  }

  async function getTranscriptionState({
    transcriptionId,
  }: GetTranscriptionStateProps): Promise<TranscriptionState> {
    const result = await pool.query<{
      status: string;
      attemptCount: number;
      lockedAt: Date | null;
      lockedBy: string | null;
    }>(
      `
      SELECT 
        status, 
        attempt_count as "attemptCount", 
        locked_at as "lockedAt",
        locked_by as "lockedBy" 
      FROM transcriptions WHERE id = $1`,
      [transcriptionId],
    );

    if (result.rowCount === 0) {
      return { exists: false };
    }

    const { attemptCount, lockedAt, lockedBy, status } = result.rows[0]!;

    return {
      exists: true,
      status: safeParseStatus({ status, logger }),
      attemptCount: attemptCount,
      lockedBy,
      lockedAt,
    };
  }

  async function getAudioContext({
    transcriptionId,
  }: GetAudioContextProps): Promise<AudioContext> {
    const result = await pool.query<AudioContext>(
      `
      SELECT
        a.id AS "audioId",
        a.original_s3_key AS "originalS3Key",
        a.original_content_type AS "originalContentType",
        a.original_filename AS "originalFilename",
        t.attempt_count AS "attemptCount"
      FROM transcriptions t
      JOIN audios a ON a.id = t.audio_id
      WHERE t.id = $1
      `,
      [transcriptionId],
    );

    if (result.rowCount === 0) {
      throw new Error(
        `Audio context not found for transcription ${transcriptionId}`,
      );
    }

    return result.rows[0]!;
  }

  /**
   * @name markSucceeded
   * @description Mark a transcription as successfully completed.
   */
  async function markSucceeded({
    transcriptionId,
    transcriptText,
    transcriptJson,
    converted16kS3Key,
  }: MarkSucceededProps): Promise<void> {
    await pool.query(
      `
      UPDATE transcriptions
      SET
        status = 'succeeded',
        transcript_text = $2,
        transcript_json = $3,
        converted_16k_s3_key = $4,
        locked_at = NULL,
        locked_by = NULL,
        updated_at = NOW()
      WHERE id = $1
      `,
      [
        transcriptionId,
        transcriptText,
        JSON.stringify(transcriptJson),
        converted16kS3Key,
      ],
    );
  }

  /**
   * @name markFailed
   * @description Mark a transcription as permanently failed.
   */
  async function markFailed({
    transcriptionId,
  }: MarkFailedProps): Promise<void> {
    await pool.query(
      `
      UPDATE transcriptions
      SET
        status = 'failed',
        locked_at = NULL,
        locked_by = NULL,
        updated_at = NOW()
      WHERE id = $1
      `,
      [transcriptionId],
    );
  }

  async function close() {
    await pool.end();
  }

  return {
    recordAttemptError,
    acquireLock,
    getTranscriptionState,
    getAudioContext,
    markSucceeded,
    markFailed,
    close,
  };
}

function safeParseStatus({
  status,
  logger,
}: {
  status: string;
  logger: Logger;
}): ValidStatus {
  if (validStatuses.includes(status as ValidStatus)) {
    return status as ValidStatus;
  }

  // Log and default to 'failed' - safest for worker logic
  logger.warn(
    `Invalid transcription status: ${status}, defaulting to 'failed'`,
  );
  return "failed";
}
