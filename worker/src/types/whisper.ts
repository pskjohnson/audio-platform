import type { Logger } from "pino";
import type { WhisperSegment } from "whisper-node";

export type WhisperResult = {
  text: string;
  raw: WhisperSegment[]; // full whisper response (segments, timings, etc.)
};

export type CreateWhisperAdapterProps = {
  model?: string;
  logger: Logger;
};

export type TranscribeProps = {
  wavPath: string;
};

export type WhisperAdapter = {
  transcribe(props: TranscribeProps): Promise<WhisperResult>;
};
