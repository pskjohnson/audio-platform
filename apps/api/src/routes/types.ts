export type Job = {
    id: string;
    created_at: Date;
    updated_at: Date;  
    status: "queued" | "processing" | "done" | "error";
    original_filename: string;
    transcription: string | null;
    error_message: string | null; 
  };
  