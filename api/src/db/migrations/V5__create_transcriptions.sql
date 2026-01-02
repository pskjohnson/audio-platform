-- V2__create_transcriptions.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create enum type
CREATE TYPE transcription_status AS ENUM ('queued', 'processing', 'succeeded', 'failed');

-- Transcriptions table with attempt_errors
CREATE TABLE transcriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id                UUID NOT NULL REFERENCES audios(id) ON DELETE CASCADE,
  status                  transcription_status NOT NULL DEFAULT 'queued',
  attempt_count           INT NOT NULL DEFAULT 0,
  
  -- Error history column
  attempt_errors          JSONB DEFAULT '[]',
  
  locked_at               TIMESTAMPTZ,
  locked_by               TEXT,
  converted_16k_s3_key    TEXT,
  whisper_model           TEXT NOT NULL DEFAULT 'base',
  language                TEXT,
  transcript_text         TEXT,
  transcript_json         JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT uq_transcriptions_audio_id UNIQUE (audio_id),
  CONSTRAINT chk_attempt_count_nonneg CHECK (attempt_count >= 0),
  CONSTRAINT chk_attempt_errors_is_array 
    CHECK (jsonb_typeof(attempt_errors) = 'array')
);

-- Create indexes
CREATE INDEX idx_transcriptions_audio_id ON transcriptions (audio_id);
CREATE INDEX idx_transcriptions_status ON transcriptions (status);
CREATE INDEX idx_transcriptions_processing_locked_at 
  ON transcriptions (locked_at) 
  WHERE status = 'processing';
CREATE INDEX idx_transcriptions_updated_at ON transcriptions (updated_at DESC);
CREATE INDEX idx_transcriptions_attempt_errors 
  ON transcriptions USING GIN (attempt_errors);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_transcriptions_set_updated_at
BEFORE UPDATE ON transcriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();