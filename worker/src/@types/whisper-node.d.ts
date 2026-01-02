declare module "whisper-node" {
  export type TimestampString = string; // e.g. "00:00:14.310"

  export interface WhisperOptions {
    language?: string; // "auto" supported
    gen_file_txt?: boolean;
    gen_file_subtitle?: boolean;
    gen_file_vtt?: boolean;
    word_timestamps?: boolean;
    timestamp_size?: number;

    [key: string]: unknown;
  }

  export interface WhisperNodeOptions {
    modelName?: string; // e.g. "base.en"
    modelPath?: string; // optional; mutually exclusive w/ modelName
    whisperOptions?: WhisperOptions;

    [key: string]: unknown;
  }

  export interface WhisperSegment {
    start: TimestampString; // "HH:MM:SS.mmm"
    end: TimestampString; // "HH:MM:SS.mmm"
    speech: string;
    [key: string]: unknown;
  }

  export default function whisper(
    filePath: string,
    options?: WhisperNodeOptions,
  ): Promise<WhisperSegment[]>;
}
