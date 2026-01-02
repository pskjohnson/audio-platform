import path from "node:path";

import fs from "fs/promises";

import type { AudioContext } from "../types/db";
import type { MessageAction } from "../types/processTranscriptionRequest";
import type { ExecuteTranscriptionProps } from "../types/worker";
import { safeCleanup, shortErr, withTimeout } from "../utils";

export async function executeTranscription({
  transcriptionId,
  workerId,
  tmpRoot,
  db,
  s3,
  ffmpeg,
  whisper,
  jobTimeoutMs,
  logger,
}: ExecuteTranscriptionProps): Promise<MessageAction> {
  const log = logger.child({ transcriptionId });

  // 0) Get audio context - if this fails, we can't proceed
  let audioContext: AudioContext;
  try {
    audioContext = await db.getAudioContext({ transcriptionId });
  } catch (err) {
    // Failed to get audio context (e.g., undefined column error)
    const errorMessage = shortErr(err);
    const errorType = err?.constructor?.name;

    log.error({ err, transcriptionId }, "Failed to get audio context");

    // Record error (use attemptCount = 0 as fallback)
    await db
      .recordAttemptError({
        transcriptionId,
        attemptNumber: 0,
        errorMessage: `Failed to get audio context: ${errorMessage}`,
        errorType,
        workerId,
      })
      .catch((logErr) => {
        log.error({ logErr }, "Failed to record context error");
      });

    // Always retry - getDecision will handle maxAttempts
    return "retry";
  }

  // Now we have the context
  const { audioId, attemptCount } = audioContext;
  const jobLog = log.child({ audioId, attemptCount });

  return await withTimeout(jobTimeoutMs, async () => {
    const jobDir = path.join(tmpRoot, audioId);
    const sourcePath = path.join(jobDir, "source");
    const normalizedPath = path.join(jobDir, "normalized_16k.wav");

    await fs.mkdir(jobDir, { recursive: true });

    try {
      // 1) Download
      jobLog.info(
        { key: audioContext.originalS3Key },
        "downloading source audio",
      );
      await s3.downloadToFile({
        key: audioContext.originalS3Key,
        filePath: sourcePath,
      });

      // Quick validation
      const sourceStats = await fs.stat(sourcePath);
      if (sourceStats.size === 0) {
        throw new Error("Downloaded file is empty");
      }

      // 2) Convert
      jobLog.info("converting to 16kHz mono WAV");
      await ffmpeg.convertTo16kMonoWav({
        inputPath: sourcePath,
        outputPath: normalizedPath,
      });

      // 3) Upload normalized
      const normalizedKey = `audios/${audioId}/normalized/16k.wav`;
      jobLog.info({ normalizedKey }, "uploading normalized audio");
      await s3.uploadFile({
        key: normalizedKey,
        filePath: normalizedPath,
        contentType: "audio/wav",
      });

      // 4) Whisper
      jobLog.info("running whisper transcription");
      const result = await whisper.transcribe({ wavPath: normalizedPath });

      // 5) Persist success
      await db.markSucceeded({
        transcriptionId,
        transcriptText: result.text,
        transcriptJson: result.raw,
        converted16kS3Key: normalizedKey,
      });

      jobLog.info("transcription succeeded");
      return "acked";
    } catch (err) {
      const errorMessage = shortErr(err);
      const errorType = err?.constructor?.name;

      // ✅ ALWAYS record the error in attempt_errors
      await db.recordAttemptError({
        transcriptionId,
        attemptNumber: attemptCount,
        errorMessage,
        errorType,
        workerId,
      });

      jobLog.error(
        {
          err,
          attemptCount,
          errorType,
        },
        "Transcription processing failed",
      );

      // ✅ ALWAYS retry - getDecision will check maxAttempts on next iteration
      return "retry";
    } finally {
      await safeCleanup(jobDir, jobLog);
    }
  }).catch((timeoutError) => {
    // Handle timeout
    const errorMessage = `Job timeout after ${jobTimeoutMs}ms`;

    // ✅ Record timeout error
    db.recordAttemptError({
      transcriptionId,
      attemptNumber: attemptCount,
      errorMessage,
      errorType: "TimeoutError",
      workerId,
    }).catch((logErr) => {
      jobLog.error({ logErr }, "Failed to record timeout error");
    });

    jobLog.error({ timeoutError, attemptCount }, "Job timed out");

    // ✅ Retry timeout errors too - getDecision handles maxAttempts
    return "retry";
  });
}
