import type { Logger } from "pino";
import type { WhisperSegment } from "whisper-node";

export type AttemptError = {
  attemptNumber: number;
  errorMessage: string;
  errorType?: string | undefined;
  timestamp: string; // ISO string
  workerId?: string | undefined;
};

export interface TranscriptionRecord {
  id: string;
  status: "queued" | "processing" | "succeeded" | "failed";
  attemptCount: number;
  errorMessage?: string;
  attemptErrors: AttemptError[]; // New field
  // ... other existing fields
}

export type RecordAttemptErrorProps = {
  transcriptionId: string;
  attemptNumber: number;
  errorMessage: string;
  errorType?: string | undefined;
  workerId?: string | undefined;
};

export type AudioContext = {
  audioId: string;
  originalS3Key: string;
  originalContentType: string | null;
  originalFilename: string | null;
  attemptCount: number;
};

export type TranscriptionDbStatus =
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

export type LockResult =
  | {
      acquired: true;
      audioId: string;
      attemptCount: number;
    }
  | {
      acquired: false;
    };

export type TranscriptionState =
  | { exists: false }
  | {
      exists: true;
      status: TranscriptionDbStatus;
      attemptCount: number;
      lockedBy: string | null;
      lockedAt: Date | null;
    };

export type CreateDbAdapterProps = {
  databaseUrl: string;
  logger: Logger;
};

export type AcquireLockProps = {
  transcriptionId: string;
  workerId: string;
  lockStaleSeconds: number;
};

export type GetTranscriptionStateProps = { transcriptionId: string };

export type GetAudioContextProps = {
  transcriptionId: string;
};

export type MarkSucceededProps = {
  transcriptionId: string;
  transcriptText: string;
  transcriptJson: WhisperSegment[];
  converted16kS3Key: string;
};

export type MarkFailedProps = {
  transcriptionId: string;
};

export interface DbAdapter {
  recordAttemptError: (props: RecordAttemptErrorProps) => Promise<void>;
  acquireLock: (props: AcquireLockProps) => Promise<LockResult>;
  getTranscriptionState: (
    props: GetTranscriptionStateProps,
  ) => Promise<TranscriptionState>;
  getAudioContext: (props: GetAudioContextProps) => Promise<AudioContext>;
  markSucceeded: (props: MarkSucceededProps) => Promise<void>;
  markFailed: (props: MarkFailedProps) => Promise<void>;
  close: () => Promise<void>;
}
