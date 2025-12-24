// src/routes/jobs.ts
import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import {query} from "../db/index";
import { Job } from "./types";
import { transcribe } from "./services/transcription";

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
                return res.status(400).json({error: "File is required"})
            };
            // We generate a jobID 
            const jobId = randomUUID();
            // Request the database to insert a new job and to return ID, status, and original_filename  
            const queryString = "INSERT INTO jobs (id, original_filename) VALUES($1, $2) RETURNING id, status, original_filename"
            // These values correspond to $1 and $2 in the SQL Query 
            // Using parameterized queries protects against SQL injection 
            const queryValues = [jobId, req.file.originalname]
            // An array is never undefined, can either contain one object or no objects 
            // Query function either returns an Array that has a single Object or an empty array  
            // Extract the first element in the jobResult array 
            // note that we are making a variable for the first element in the array (Js specific)
            const [jobResult] = await query<Pick<Job, "id" | "status" | "original_filename" >>(queryString, queryValues)
            // If the array is empty we throw an Error that says failed to create job which is handled below
            if (!jobResult) {
                throw new Error("Failed to create job");
            }
            transcribe(jobId)
            // If all succeeds we return status code 201 with successful json message 
            // 201 means something was successfuly created, associate it with post 
            return res.status(201).json({
                jobId: jobResult.id,
                status: jobResult.status
            });
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
            const jobId = req.params.id 
            const queryInput = "SELECT * FROM jobs WHERE id = $1"
            const queryValues = [jobId]
            const [jobResult] = await query<Pick<Job, "id" | "status" | "created_at" | "updated_at" >>(queryInput, queryValues)
            if(!jobResult) {
                return res.status(404).json({ error: "job not found" })
            }
            return res.status(200).json({
                jobId: jobResult.id,
                status: jobResult.status,
                createdAt: jobResult.created_at,
                updatedAt: jobResult.updated_at
            });
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
            const jobId = req.params.id
            const queryInput = "SELECT * FROM jobs WHERE id = $1"
            const queryValues = [jobId]
            const [jobResult] = await query<Pick<Job, "status" | "original_filename" | "transcription" >>(queryInput, queryValues)
            // id exists? 
            if(!jobResult) {
                return res.status(404).json({ error: "job is not found" });
            }
            // if status != done, return 404 "job is not finished" 
            if(jobResult.status != 'done'){
            // otherwise return transcribed text 
                return res.status(202).json({error: "job found but not finished"});
            // save "text": "Transcribed audio text here" for every audio row in db 
            }
            return res.status(200).json({text: jobResult.transcription});
            //res.status(200).json({ text: jobResult.transcription });
        } catch (err) {
            next(err);
        }
    }
);

export default router;
