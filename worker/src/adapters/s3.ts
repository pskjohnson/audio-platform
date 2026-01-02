import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type {
  CreateS3AdapterProps,
  DownloadToFileProps,
  GetSignedGetUrlProps,
  S3Adapter,
  UploadFileProps,
} from "../types/s3";

function isReadable(body: unknown): body is Readable {
  // AWS SDK v3 GetObject Body is a union of stream/blob types.
  // In Node, a Readable stream is identified by `.pipe()`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!body && typeof (body as any).pipe === "function";
}

export function createS3Adapter({
  region,
  bucket,
  endpoint,
  logger,
}: CreateS3AdapterProps): S3Adapter {
  logger.debug("s3 adapter initialized");

  const s3Client = new S3Client({
    region,
    ...(endpoint // endpoint should only be sent in if it's defined
      ? {
          endpoint,
          forcePathStyle: true, // required for LocalStack
        }
      : {}),
  });

  async function downloadToFile({
    key,
    filePath,
  }: DownloadToFileProps): Promise<void> {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!isReadable(response.Body)) {
      throw new Error("S3 GetObject returned a non-stream Body");
    }

    // Stream S3 -> disk (avoids memory spikes)
    const out = fs.createWriteStream(filePath);
    await pipeline(response.Body, out);
  }

  async function uploadFile({
    key,
    filePath,
    contentType,
  }: UploadFileProps): Promise<void> {
    const body = fs.createReadStream(filePath);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_Scenario_PresignedUrl_section.html

  async function getSignedGetUrl({
    key,
    expiresInSeconds,
  }: GetSignedGetUrlProps): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });

    return getSignedUrl(s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  return {
    downloadToFile,
    uploadFile,
    getSignedGetUrl,
    bucket,
  };
}
