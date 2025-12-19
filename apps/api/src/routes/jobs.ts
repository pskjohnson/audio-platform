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
            // First we validate the file 
            // If its invalid we return error status 400
            if(!req.file) {
                // returning status 400 for bad request from the client  
                return res.status(400).json({Error: "File is required"})
            };
            // We generate a jobID
            const jobID = randomUUID();
            // Request the database to insert a new job and to return ID, status, and original_filename
const queryInput = "INSERT INTO jobs (id, original_filename) VALUES($1, $2) RETURNING id, status, original_filename"
// These values correspond to $1 and $2 in the SQL Query 
            // Using parameterized queries protects against SQL injection 
            const valueInput = [jobID, req.file.originalname]
// An array is never undefined, can either contain one object or no objects 
            // Query function either returns an Array that has a single Object or an empty array  
            // Extract the first element in the jobResult array 
            // note that we are making a variable for the first element in the array (Js specific)
            const [jobResult] = await query<Pick<Job, "id" | "status" | "original_filename" >>(queryInput, valueInput)
// If the array is empty we throw an Error that says failed to create job which is handled below
            if (!jobResult) {
                throw new Error("Failed to create job");
            }
            // If all succeeds we return status code 201 with successful json message 
            // 201 means something was successfuly created, associate it with post 
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
