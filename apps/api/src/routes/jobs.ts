// src/routes/jobs.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import {query} from "../db/index";
import { Job } from "./types";

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
// router.post creates a POST endpoint at the root route of that router 
    "/",
// upload.single("file") is a middleware that handles our file upload 
    // handles our file upload by attaching it to req.file 
    upload.single("file"),
// the request lands in the async express handler function 
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            // upload.single("file") creates the req.file upload.single adds a property to the req object
            if(!req.file) {
                // returning status 400 for bad request from the client  
                return res.status(400).json({Error: "File is required"})
            };
            
            const jobID = randomUUID();
            // 1. Validate file exists
            // 2. Insert job into database with status = 'queued'
            // 3. Return job id
const queryInput = "INSERT INTO jobs (id, original_filename) VALUES($1, $2) RETURNING id, status, original_filename"
            const valueInput = [jobID, req.file.originalname]
            const [jobResult] = await query<Pick<Job, "id" | "status" | "original_filename" >>(queryInput, valueInput)
            if (!jobResult) {
                throw new Error("Failed to create job");
            }
            //201 means something was successfuly created, associate it with post 
            return res.status(201).json({Message: `${jobResult.original_filename} successfully uploaded`})
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
