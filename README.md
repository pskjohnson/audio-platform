## Setup
After running `npm run infra:up`, check logs to see the bucket and queue have been created properly
```
docker compose logs localstack | grep localstack-init
```

Logs should show similar content. Note the region is `us-east-1`

```
localstack-1  | [localstack-init] Creating S3 bucket: audio-uploads
localstack-1  | 2026-01-01T05:44:41.330  INFO --- [et.reactor-1] localstack.request.aws     : AWS sqs.ListQueues => 200
localstack-1  | 2026-01-01T05:44:41.380  INFO --- [et.reactor-0] localstack.request.aws     : AWS s3.CreateBucket => 400 (IllegalLocationConstraintException)
localstack-1  | [localstack-init] Creating SQS queue: transcribe-jobs
localstack-1  | 2026-01-01T05:44:41.709  INFO --- [et.reactor-0] localstack.request.aws     : AWS sqs.CreateQueue => 200
localstack-1  | [localstack-init] Done. Bucket=audio-uploads, Queue=transcribe-jobs, QueueUrl=http://sqs.us-east-2.localhost.localstack.cloud:4566/000000000000/transcribe-jobs
localstack-1  | Ready.
localstack-1  | 2026-01-01T05:44:59.491  INFO --- [et.reactor-1] localstack.request.aws     : AWS sqs.ListQueues => 200
localstack-1  | 2026-01-01T05:46:20.873  INFO --- [et.reactor-0] localstack.request.aws     : AWS sqs.ListQueues => 200
```

