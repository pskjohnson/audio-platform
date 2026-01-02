import type { WhisperNodeOptions, WhisperSegment } from "whisper-node";
import whisper from "whisper-node";

import type {
  CreateWhisperAdapterProps,
  TranscribeProps,
  WhisperAdapter,
  WhisperResult,
} from "../types/whisper";

export function createWhisperAdapter({
  model = "base.en",
  logger,
}: CreateWhisperAdapterProps): WhisperAdapter {
  logger.debug("whisper adapter initialized");

  return {
    async transcribe({ wavPath }: TranscribeProps): Promise<WhisperResult> {
      const whisperOptions: WhisperNodeOptions = {
        modelName: model,
        whisperOptions: {
          language: "auto", // default (use 'auto' for auto detect)
          gen_file_txt: true, // outputs .txt file
          gen_file_subtitle: false, // outputs .srt file
          gen_file_vtt: false, // outputs .vtt file
          word_timestamps: true, // timestamp for every word
        },
      };

      const wordTimestamps: WhisperSegment[] = await whisper(
        wavPath,
        whisperOptions,
      );

      // Validate the response
      if (wordTimestamps === undefined) {
        throw new Error(
          `WHISPER_CRASHED: Whisper process failed completely (returned undefined). ` +
            `File: ${wavPath}. ` +
            `This indicates: ` +
            `1. Whisper CLI crashed/segfaulted ` +
            `2. Model failed to load (missing/corrupt) ` +
            `3. Out of memory (OOM killer terminated process) ` +
            `4. Invalid whisper-node parameters ` +
            `5. Child process execution failed`,
        );
      }

      // Normalize output shape
      const segments = wordTimestamps ?? [];

      const text = segments
        .map((t) => t.speech)
        .join(" ")
        .trim();

      return {
        text,
        raw: segments,
      };
    },
  };
}
