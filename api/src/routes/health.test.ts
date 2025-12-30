import request from "supertest";
import { app } from "../app";

/**
 * Supertest is a small testing library that lets you send HTTP requests 
 * directly to an Express app without starting a real server.
 */

describe("GET /health", () => {
    it("returns 200 and ok=true", async () => {
        const res = await request(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ok: true });
    });
});