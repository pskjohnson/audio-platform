DROP TABLE IF EXISTS jobs;

CREATE TABLE jobs (
  id                UUID PRIMARY KEY,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  status            job_status NOT NULL DEFAULT 'queued',
  original_filename TEXT NOT NULL,
  error_message     TEXT
);

CREATE TRIGGER jobs_set_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();