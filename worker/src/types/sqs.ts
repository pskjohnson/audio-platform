import type { Logger } from "pino";

export type CreateSqsAdapterProps = {
  region: string;
  endpoint?: string;
  queueUrl: string;
  waitTimeSeconds: number;
  maxMessages: number;
  logger: Logger;
};

export interface SqsMessage {
  receiptHandle: string;
  body: string | null;
}

export interface SqsAdapter {
  receive(): Promise<SqsMessage[]>;
  ack(message: SqsMessage): Promise<void>;
}
