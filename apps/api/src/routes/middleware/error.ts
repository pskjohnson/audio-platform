import type { Request, Response, NextFunction } from "express";

export function errorHandler(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    // eslint-disable-next-line no-console
    console.error(err);

    const status = err.statusCode || 500;
    const message =
        err.message || "Internal Server Error";

    res.status(status).json({ error: message });
}