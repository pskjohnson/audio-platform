import { setTimeout as delay } from "node:timers/promises";

import { TranscriptionJobSchema } from "../schemas/transcriptionJobSchema";
import type { SqsMessage } from "../types/sqs";
import type { CreateWorkerProps } from "../types/worker";
import { processTranscriptionRequest } from "./processTranscriptionRequest";

export function createWorker({
  workerId,
  logger,
  tmpRoot,
  db,
  s3,
  sqs,
  ffmpeg,
  whisper,
  concurrency,
  lockStaleSeconds,
  maxAttempts,
  jobTimeoutMs,
  idleDelayMs,
}: CreateWorkerProps) {
  let stopped = false;
  const inFlight = new Set<Promise<void>>();

  async function handleMessage(message: SqsMessage) {
    const { body } = message;

    let transcriptionId: string;

    try {
      if (typeof body !== "string") {
        throw new Error("missing body");
      }

      const parsed = TranscriptionJobSchema.parse(JSON.parse(body));
      transcriptionId = parsed.transcription_id;
    } catch (err) {
      // Invalid payloads are expected operational noise
      logger.warn({ err, body }, "invalid SQS message, acking");
      await sqs.ack(message);
      return;
    }

    const log = logger.child({ transcriptionId });

    try {
      const result = await processTranscriptionRequest({
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
        logger: log,
      });

      if (result === "acked") {
        await sqs.ack(message);
        log.info("job completed, message acked");
      } else {
        log.warn("job will be retried (no ack)");
      }
    } catch (err) {
      log.error({ err }, "unexpected worker error, retrying");
      // Do NOT ack so it can retry
    }
  }

  async function pollOnce() {
    if (stopped) return; // Early exit

    const messages = await sqs.receive();

    if (messages.length === 0) {
      if (idleDelayMs > 0) {
        await delay(idleDelayMs);
      }
      return;
    }

    for (const message of messages) {
      if (stopped) return;

      // Backpressure: wait until a slot frees
      while (inFlight.size >= concurrency) {
        await Promise.race(inFlight);
      }

      /** come back to this async behavior later  */
      const task = (async () => {
        try {
          await handleMessage(message);
        } catch (err) {
          logger.error({ err }, "unhandled error in message handler");
        }
      })();

      inFlight.add(task);

      task.finally(() => inFlight.delete(task));
    }
  }

  async function start() {
    logger.info({ concurrency }, "worker loop started");

    while (!stopped) {
      try {
        await pollOnce();
      } catch (err) {
        logger.error({ err }, "poll loop error");
        await delay(1000); // avoid hot loop on failure
      }
    }
  }

  async function stop() {
    stopped = true;
    logger.info({ inFlight: inFlight.size }, "stopping worker, draining jobs");
    await Promise.allSettled(inFlight);
  }

  return {
    start,
    stop,
  };
}
