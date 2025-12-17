-- V1__create_jobs_table.sql

-- Job status enum
CREATE TYPE job_status AS ENUM (
  'queued',
  'processing',
  'done',
  'error'
);

CREATE TABLE jobs (
  id                  BIGSERIAL PRIMARY KEY,
  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now(),
  status              job_status NOT NULL DEFAULT 'queued',
  original_filename   TEXT NOT NULL,
  error_message       TEXT
);

-- trigger to update updated_at automatically whenever a row in jobs is changed
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();