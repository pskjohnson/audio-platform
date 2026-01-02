import type { Request, Response } from "express";
import { Router } from "express";

const router = Router();

/**
 * GET /health
 * This endpoint doesn’t do any work — it just proves the service is alive.
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

export default router;
