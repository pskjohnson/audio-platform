import type { MessageAction } from "../types/processTranscriptionRequest";
import type {
  GetDecisionProps,
  ProcessTranscriptionRequestProps,
  TranscriptionDecision,
} from "../types/worker";
import { executeTranscription } from "./executeTranscription";

export async function processTranscriptionRequest({
  transcriptionId,
  workerId,
  tmpRoot,
  db,
  s3,
  ffmpeg,
  whisper,
  lockStaleSeconds,
  maxAttempts,
  jobTimeoutMs,
  logger,
}: ProcessTranscriptionRequestProps): Promise<MessageAction> {
  const log = logger.child({ transcriptionId, workerId });

  try {
    // 1. Get decision: should we process, ack, or retry?
    const decision = await getDecision({
      transcriptionId,
      workerId,
      lockStaleSeconds,
      maxAttempts,
      db,
      logger: log,
    });

    log.debug(
      {
        decision: decision.action,
        ...(decision.action != "process" ? { reason: decision?.reason } : {}),
      },
      "decision made",
    );

    // 2. Execute based on decision
    switch (decision.action) {
      case "ack":
        // Terminal state - delete message from SQS
        return "acked";

      case "retry":
        // Transient issue - leave message in SQS for later retry
        return "retry";

      case "process":
        // We have the lock and should process
        return await executeTranscription({
          transcriptionId,
          tmpRoot,
          db,
          s3,
          ffmpeg,
          whisper,
          jobTimeoutMs,
          logger: log,
          workerId,
        });
    }
  } catch (error) {
    // Unexpected error in decision logic
    log.error({ error }, "unexpected error in processTranscriptionRequest");
    return "retry"; // Safe default - let SQS retry
  }
}

async function getDecision({
  transcriptionId,
  workerId,
  lockStaleSeconds,
  maxAttempts,
  db,
  logger,
}: GetDecisionProps): Promise<TranscriptionDecision> {
  const log = logger.child({ transcriptionId, workerId });
  try {
    const currentTranscription = await db.getTranscriptionState({
      transcriptionId,
    });

    // Apply business logic
    if (!currentTranscription.exists) {
      log.error(
        {
          transcriptionId,
          workerId,
          errorType: "MissingRecordError",
        },
        "Transcription record not found - possible orphaned SQS message",
      );

      return { action: "ack", reason: "missing" };
    }
    if (currentTranscription.status === "succeeded") {
      return { action: "ack", reason: "already_succeeded" };
    }
    if (
      currentTranscription.status === "failed" &&
      currentTranscription.attemptCount >= maxAttempts
    ) {
      return { action: "ack", reason: "max_attempts_reached" };
    }

    // Max attempt check
    if (currentTranscription.attemptCount >= maxAttempts) {
      // If it's already failed with max attempts, ack
      if (currentTranscription.status === "failed") {
        return { action: "ack", reason: "max_attempts_reached" };
      }
      // If it's still processing/queued but at max attempts, mark failed
      await db.markFailed({
        transcriptionId,
      });
      return { action: "ack", reason: "max_attempts_reached" };
    }

    // Check if actively locked

    const isStale =
      currentTranscription.lockedAt &&
      Date.now() - currentTranscription.lockedAt.getTime() >
        lockStaleSeconds * 1000;

    if (currentTranscription.status === "processing" && !isStale) {
      log.debug("actively locked");
      return { action: "retry", reason: "actively_locked" };
    }

    // Try to acquire lock
    const lock = await db.acquireLock({
      transcriptionId,
      workerId,
      lockStaleSeconds,
    });

    if (!lock.acquired) {
      // Race condition - someone else got it
      return { action: "retry", reason: "race_condition" };
    }

    return {
      action: "process",
      context: {
        audioId: lock.audioId!,
        attemptCount: lock.attemptCount!,
        transcriptionId,
      },
    };
  } catch (error: unknown) {
    // TODO: Fix this - hides postgres errors
    log.error({ error }, "Error in getDecision");
    throw error; // Re-throw to be caught by processTranscriptionRequest
  }
}
