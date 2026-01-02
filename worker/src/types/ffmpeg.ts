import type { Logger } from "pino";

export type FfmpegAdapterProps = {
  logger: Logger;
};

/**
 * Error type thrown when an ffmpeg process fails.
 *
 * We use a custom error instead of a plain Error so that:
 * - the worker can reliably detect "ffmpeg-related" failures
 * - we can classify errors as transient vs permanent based on ffmpeg output
 * - we preserve useful debugging information (exit code + stderr)
 *
 * IMPORTANT:
 * This class should NOT decide retry behavior.
 * That decision lives in the error policy layer.
 */
export class FfmpegError extends Error {
  /**
   * Process exit code returned by ffmpeg.
   * - 0 means success (we never construct this error in that case)
   * - non-zero means ffmpeg failed
   * - null usually means the process did not exit normally
   */
  readonly code: number | null;

  /**
   * OS signal that terminated the process, if any.
   * Examples: SIGKILL, SIGTERM
   * This is useful when ffmpeg is killed due to OOM or shutdown.
   */
  readonly signal: NodeJS.Signals | null;

  /**
   * Raw stderr output from ffmpeg.
   *
   * ffmpeg writes almost all useful diagnostics to stderr
   * (even on success). When it fails, this usually contains:
   * - "Invalid data found when processing input"
   * - codec errors
   * - format errors
   *
   * We keep this so the worker can:
   * - log it for debugging
   * - inspect it to decide whether the error is permanent or retryable
   */
  readonly stderr: string;

  constructor(
    message: string,
    options: {
      code: number | null;
      signal: NodeJS.Signals | null;
      stderr: string;
    },
  ) {
    // Standard Error initialization (sets message + stack trace)
    // super(message) calls the constructor of JavaScript’s built-in Error class.
    super(message);

    // Set a stable name so callers can do:
    //   err instanceof FfmpegError
    // or check err.name === "FfmpegError"
    this.name = "FfmpegError";

    // Preserve low-level process details for debugging and classification
    this.code = options.code;
    this.signal = options.signal;
    this.stderr = options.stderr;
  }
}

export type ConvertTo16kMonoWavProps = {
  inputPath: string;
  outputPath: string;
};

export interface FfmpegAdapter {
  convertTo16kMonoWav(props: ConvertTo16kMonoWavProps): Promise<void>;
}
