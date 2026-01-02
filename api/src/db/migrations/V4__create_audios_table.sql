-- V1__create_audios.sql
-- Requires uuid generation. Prefer pgcrypto's gen_random_uuid().
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Audios table with S3 key constraint
CREATE TABLE audios (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_s3_key       TEXT NOT NULL,
  original_filename     TEXT,
  original_content_type TEXT,
  duration_seconds      NUMERIC,
  owner_id              UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- S3 key constraint (case-insensitive)
  CONSTRAINT valid_s3_key_format 
    CHECK (original_s3_key ~* '^audios/[0-9a-f-]+/.+\..+$')
);

CREATE INDEX idx_audios_created_at ON audios (created_at DESC);
CREATE INDEX idx_audios_owner_id   ON audios (owner_id);