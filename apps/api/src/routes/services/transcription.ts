import { query } from "../../db";
import { Job } from "../types";

export async function transcribe(jobId: string) : Promise<Job> {
    const queryString = "UPDATE jobs SET status = 'processing' WHERE id = $1 RETURNING *"
    const queryValues = [jobId]
    const [preTranscriptionJob] = await query(queryString, queryValues)
    // if returned values has a length of 1 then it means that it was updated 
    if (preTranscriptionJob.length === 0){
        throw new Error("Job not updated")
    }
    const transcriptionText = "Sample Transcription"
    const updateTranscriptionQuery = "UPDATE jobs SET status = 'done', transcription = $1  WHERE id = $2 RETURNING *"
    const updateTranscriptionValues = [transcriptionText, jobId]
    const [postTranscriptionJob] = await query(updateTranscriptionQuery, updateTranscriptionValues)
    if (postTranscriptionJob.length ===0){
        throw new Error("Job not updated")
    }
    return postTranscriptionJob;
}