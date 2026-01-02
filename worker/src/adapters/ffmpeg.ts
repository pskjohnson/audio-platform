import { spawn } from "node:child_process";

import type {
  ConvertTo16kMonoWavProps,
  FfmpegAdapterProps,
} from "../types/ffmpeg";
import { type FfmpegAdapter, FfmpegError } from "../types/ffmpeg";

export function createFfmpegAdapter({
  logger,
}: FfmpegAdapterProps): FfmpegAdapter {
  logger.debug("ffmpeg adapter initialized");

  /**
   * Convert any supported audio file into a 16kHz mono WAV file.
   *
   * Why this exists:
   * - Whisper works best with 16kHz, mono, PCM WAV audio
   * - We want all ffmpeg usage isolated in one place
   *
   * This function:
   * - shells out to the `ffmpeg` binary
   * - waits for it to finish
   * - resolves on success
   * - rejects with a rich error on failure
   */
  async function convertTo16kMonoWav({
    inputPath,
    outputPath,
  }: ConvertTo16kMonoWavProps): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.debug({ inputPath, outputPath }, "ffmpeg conversion started");

      /**
       * ffmpeg command arguments.
       *
       * Equivalent shell command:
       * ffmpeg -y -i <input> -ac 1 -ar 16000 -c:a pcm_s16le <output>
       */
      const args = [
        "-y", // overwrite output file if it already exists (no interactive prompt)
        "-i",
        inputPath, // input audio file path
        "-ac",
        "1", // convert to mono (1 audio channel)
        "-ar",
        "16000", // resample audio to 16kHz
        "-c:a",
        "pcm_s16le", // raw PCM WAV format that Whisper expects
        outputPath, // output file path
      ];

      /**
       * Spawn the ffmpeg process.
       *
       * - stdin: ignored (we don't pipe input)
       * - stdout: ignored (ffmpeg writes logs to stderr)
       * - stderr: captured so we can include it in error messages
       */
      const ffmpegProcess = spawn("ffmpeg", args, {
        stdio: ["ignore", "ignore", "pipe"],
      });

      // Accumulate ffmpeg's stderr output for debugging on failure
      let stderr = "";

      ffmpegProcess.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      /**
       * This fires if the process could not be started at all.
       * Common cause: ffmpeg is not installed or not in PATH.
       */
      ffmpegProcess.on("error", (err) => {
        reject(
          new FfmpegError("Failed to start ffmpeg", {
            code: null,
            signal: null,
            stderr: err.message,
          }),
        );
      });

      /**
       * This fires when ffmpeg exits.
       *
       * - exit code 0 = success
       * - any other code = failure
       */
      ffmpegProcess.on("close", (code, signal) => {
        if (code === 0) {
          // Conversion succeeded
          resolve();
          return;
        }

        // Conversion failed — include stderr so callers can inspect the cause
        reject(
          new FfmpegError("ffmpeg exited with non-zero code", {
            code,
            signal,
            stderr,
          }),
        );
      });
    });
  }

  /**
   * Expose only the minimal interface the rest of the worker needs.
   * This prevents ffmpeg details from leaking elsewhere.
   */
  return {
    convertTo16kMonoWav,
  };
}
