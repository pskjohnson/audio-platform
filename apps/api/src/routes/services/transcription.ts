import { query } from "../../db";

export async function transcribe(jobId: string) : Promise<void> {
    const queryString = "UPDATE jobs SET status = 'processing' WHERE id = $1 RETURNING *"
    const queryValues = [jobId]
    const [jobBeforeTranscription] = await query(queryString, queryValues)
    // if returned values has a length of 1 then it means that it was updated 
    if (!jobBeforeTranscription){
        throw new Error("Job not updated")
    }
    const transcriptionText = "Sample Transcription"
    const updateTranscriptionQuery = "UPDATE jobs SET status = 'done', transcription = $1  WHERE id = $2 RETURNING *"
    const updateTranscriptionValues = [transcriptionText, jobId]
    const [jobAfterTranscription] = await query(updateTranscriptionQuery, updateTranscriptionValues)
    if (!jobAfterTranscription){
        throw new Error("Job not updated")
    }
}