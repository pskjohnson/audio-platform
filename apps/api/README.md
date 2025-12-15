# audio-job-service

## Overview

This project is a small backend service that accepts audio files, processes them asynchronously, and stores the transcription results.

The goal of this project is to practice:
- building HTTP APIs with Express
- modeling state in a SQL database
- handling long-running background work
- integrating with an external “tool” (audio transcription)

This is not a frontend project.

## What You Will Build

You will implement an API that:

- [ ] Accepts an audio file upload
- [ ] Creates a transcription job in the database
- [ ] Processes the job asynchronously
- [ ] Stores the transcription result
- [ ] Allows clients to check job status and fetch results

### Implementation note:

Start by implementing transcription synchronously in the request handler.
After that works, refactor to move transcription into the background worker.

## Tech Stack
- Node.js
- Express
- PostgreSQL
- SQL migrations
- Jest (for basic tests)

## API Requirements
### Create Job

`POST /jobs`

- [ ] Accepts a multipart form upload
- [ ] Field name: file
- [ ] Optional fields:
  - [ ] language
  - [ ] prompt

**Response**

```
{
  "jobId": 1,
  "status": "queued"
}
```

### Get Job Status

`GET /jobs/:id`

**Response**

```
{
  "jobId": 1,
  "status": "processing",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Get Job Result

`GET /jobs/:id/result`
- Returns 404 if the job is not finished

**Response**

```
{
  "text": "Transcribed audio text here"
}
```

## Database Schema

You are responsible for designing and migrating the database schema.

At minimum, you should store:
- job status (`queued`, `processing`, `done`, `error`)
- original filename
- transcription text (nullable)
- error message (nullable)
- timestamps

## Background Processing

Transcription should **not** happen inside the request handler.

Implement a simple background worker that:
1. Finds the next queued job
2. Marks it as processing
3. Calls the transcription tool
4. Stores the result or error
5. Updates job status

A simple polling loop is sufficient.

## Transcription Tool

A stub has been provided in `src/services/transcription.ts`.

Implement this function to:
- [ ] accept a file path
- [ ] return transcribed text

It may fail and should throw errors when it does.

## Error Handling

Your API should:
- [ ] Validate inputs
- [ ] Return appropriate HTTP status codes
- [ ] Handle missing jobs gracefully
- [ ] Store errors in the database when processing fails

## Setup

### Prerequisites

Make sure you have the following installed:
- **Node.js** (v18 or higher)
  - Check with: `node -v`
- **PostgreSQL**
  - Check with: `psql --version`

---

### Environment

Copy `.env.example` to `.env` and fill in values.

### Install

```
npm install
```

### Database

Create the database and run migrations.

```
npm run db:migrate
```

### Run the Server

```
npm run dev
```

### Testing

A basic health check test is provided.

Add tests for:
- job creation
- job status retrieval
- job result retrieval
- error cases

Run tests:
```
npm test
```

### Constraints & Guardrails

To keep the scope reasonable:
- Limit file size (e.g. 25MB)
- Support only a few audio formats
- Store files locally
- No authentication
- No frontend

### Stretch Goals (Optional)

If you finish early, consider adding one of:
- [ ] Retry failed jobs
- [ ] Track processing duration
- [ ] Add pagination for job listing
- [ ] Support multiple transcription models

### What We’re Looking For

We care about:
- Clear API design
- Thoughtful database modeling
- Correct handling of async work
- Good error handling
- Clear explanations in code and comments

We care less about:
- Fancy abstractions
- Framework magic
- Premature optimization

### Notes

This project is intentionally open-ended.

If something is unclear:
- Make a reasonable assumption
- Document it
- Be ready to explain your choice