import { z } from "zod";

export const TranscriptionJobSchema = z.object({
  transcription_id: z.uuid(),
});

export type TranscriptionJob = z.infer<typeof TranscriptionJobSchema>;
