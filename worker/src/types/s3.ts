import type { Logger } from "pino";

export type CreateS3AdapterProps = {
  region: string;
  bucket: string;
  endpoint?: string; // LocalStack endpoint, e.g. http://localhost:4566
  logger: Logger;
};

export type DownloadToFileProps = {
  key: string;
  filePath: string;
};

export type UploadFileProps = {
  key: string;
  filePath: string;
  contentType?: string;
};

export type GetSignedGetUrlProps = {
  key: string;
  expiresInSeconds: number;
};

export interface S3Adapter {
  downloadToFile: (props: DownloadToFileProps) => Promise<void>;
  uploadFile: (props: UploadFileProps) => Promise<void>;
  getSignedGetUrl: (props: GetSignedGetUrlProps) => Promise<string>;
  bucket: string;
}
