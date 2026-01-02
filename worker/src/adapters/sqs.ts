import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import type {
  CreateSqsAdapterProps,
  SqsAdapter,
  SqsMessage,
} from "../types/sqs";

export function createSqsAdapter({
  region,
  endpoint,
  queueUrl,
  waitTimeSeconds,
  maxMessages,
  logger,
}: CreateSqsAdapterProps): SqsAdapter {
  logger.debug("sqs adapter initialized");

  const client = new SQSClient({
    region,
    ...(endpoint // endpoint should only be sent in if it's defined
      ? {
          endpoint,
          forcePathStyle: true, // required for LocalStack
        }
      : {}),
  });

  async function receive(): Promise<SqsMessage[]> {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      // How many messages SQS is allowed to return in a single ReceiveMessage call
      MaxNumberOfMessages: maxMessages,
      // How long SQS will wait before responding if the queue is empty (long polling)
      // If there are no messages, wait up to waitTimeSeconds for one to arrive
      WaitTimeSeconds: waitTimeSeconds,
    });

    const response = await client.send(command);

    const messages = response.Messages ?? [];
    if (messages.length === 0) {
      return [];
    }

    return messages.map((m) => {
      // A temporary token SQS gives you when you receive a message
      //It is not the message ID
      // It changes every time the message is received
      // You must use it to delete (ack) the message
      // Old receipt handles become invalid after redelivery
      if (!m.ReceiptHandle) {
        // This is unrecoverable / unexpected from SQS; fail loud.
        throw new Error("Received SQS message without ReceiptHandle");
      }
      return {
        receiptHandle: m.ReceiptHandle,
        body: m.Body ?? null,
      };
    });
  }

  async function ack(message: SqsMessage): Promise<void> {
    await client.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: message.receiptHandle,
      }),
    );
  }

  return {
    receive,
    ack,
  };
}
