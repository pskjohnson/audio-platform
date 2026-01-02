#!/usr/bin/env bash

# Exit immediately on:
# -e : any command returning non-zero
# -u : use of unset variables
# -o pipefail : any failure in a pipeline
# This makes init failures loud and deterministic
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-east-1}"

BUCKET_NAME="${AUDIO_BUCKET_NAME:-audio-uploads}"
QUEUE_NAME="${TRANSCRIBE_QUEUE_NAME:-transcribe-jobs}"

# Create the S3 bucket if it does not already exist.
# - awslocal points to the LocalStack endpoint automatically
# - stderr is suppressed to avoid noise if the bucket already exists
# - `|| true` makes this idempotent (safe to run multiple times)
echo "[localstack-init] Creating S3 bucket: ${BUCKET_NAME}"
awslocal s3api create-bucket --bucket "${BUCKET_NAME}" --region "${REGION}" 2>/dev/null || true

# Create the SQS queue if it does not already exist.
# - SQS create-queue is idempotent for the same name
# - Query extracts the QueueUrl for logging/debugging
echo "[localstack-init] Creating SQS queue: ${QUEUE_NAME}"
QUEUE_URL="$(awslocal sqs create-queue --queue-name "${QUEUE_NAME}" --region "${REGION}" --query 'QueueUrl' --output text 2>/dev/null || true)"

# Final log line to confirm successful provisioning
echo "[localstack-init] Done. Bucket=${BUCKET_NAME}, Queue=${QUEUE_NAME}, QueueUrl=${QUEUE_URL:-unknown}"
