// src/routes/jobs.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";

const router = Router();

// Configure file uploads (stored locally)
const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 25 * 1024 * 1024, // 25MB
    },
});

/**
 * POST /jobs
 * - Accept an audio file upload
 * - Create a transcription job in the database
 * - Return job id and initial status
 */
router.post(
    "/",
    upload.single("file"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // TODO:
            // 1. Validate file exists
            // 2. Insert job into database with status = 'queued'
            // 3. Return job id

            res.status(501).json({ error: "Not implemented" });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * GET /jobs/:id
 * - Return job status and metadata
 */
router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // TODO:
            // 1. Parse job id
            // 2. Fetch job from database
            // 3. Return job status or 404

            res.status(501).json({ error: "Not implemented" });
        } catch (err) {
            next(err);
        }
    }
);

/**
 * GET /jobs/:id/result
 * - Return transcription result if job is finished
 */
router.get(
    "/:id/result",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // TODO:
            // 1. Fetch job
            // 2. If status !== 'done', return 404
            // 3. Return transcript text

            res.status(501).json({ error: "Not implemented" });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
