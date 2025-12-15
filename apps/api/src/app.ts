import express from "express";
import health from "./routes/health";
import jobs from "./routes/jobs";
import { notFound } from "./routes/middleware/notFound";
import { errorHandler } from "./routes/middleware/error";

export const app = express();

// Parse JSON request bodies
app.use(express.json());

// Routes
app.use("/health", health);
app.use("/jobs", jobs);

// 404 handler (must be after routes)
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);