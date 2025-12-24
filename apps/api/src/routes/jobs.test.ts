import request from "supertest";
import { app } from "../app";
import { query } from "../db";

const FAKE_ID = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
jest.mock("../db", () => ({
    query: jest.fn(),
  }));


beforeEach(() => {
    jest.clearAllMocks();
});

// this is for a file upload
describe("POST /jobs", () => {
    it("returns 400 when no file is provided", async () => {
        const res = await request(app).post(`/jobs`)
        expect(res.status).toBe(400);
        expect(res.body).toEqual({error: "File is required"})
    });
    it("returns 201 when a file is provided", async () => {
        (query as jest.Mock).mockResolvedValueOnce([{ id: FAKE_ID, status: "queued" }]);
        (query as jest.Mock).mockResolvedValueOnce([{ id: FAKE_ID, status: "queued" }]);
        (query as jest.Mock).mockResolvedValue([{ id: FAKE_ID, status: "done" }]);
        const res = await request(app)
        .post("/jobs")
        .attach(
            "file",
                Buffer.from("fake audio content"),
                "test.wav"
            );
        // Verify the mock was called
        expect(query).toHaveBeenCalledTimes(3);
        expect(res.status).toBe(201);
        expect(res.body).toEqual({
            jobId: FAKE_ID,
            status: "queued"
        });
    });
}); 

describe("GET /jobs/:id", () => {
    it("returns 404 when an invalid id is entered", async () => {
        (query as jest.Mock).mockResolvedValueOnce([])
        const res = await request(app).get(`/jobs/${FAKE_ID}`);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({error: "job not found"});
    });

    it("returns 200 when valid id is entered", async () => {
        (query as jest.Mock).mockResolvedValueOnce([{
            id: FAKE_ID,
            status: "queued",
            created_at: "testTime1",
            updated_at: "testTime2",
        }]);
        const res = await request(app).get(`/jobs/${FAKE_ID}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            jobId: FAKE_ID, 
            status: "queued",
            createdAt: "testTime1",
            updatedAt: "testTime2"
        });
    });
});

describe("GET /jobs/:id/result", () => {
    it("returns 404 when an non-existant id is entered", async () => {
        (query as jest.Mock).mockResolvedValueOnce([])
        const res = await request(app).get(`/jobs/${FAKE_ID}/result`);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({error: "job is not found"})
    });

    it ("returns 202 when a valid file is entered but not finished", async () => {
        (query as jest.Mock).mockResolvedValueOnce([{
            id: FAKE_ID,
            status: "queued"
    }]);
        const res = await request(app).get(`/jobs/${FAKE_ID}/result`);
        expect(res.status).toBe(202);
        expect(res.body).toEqual({error: "job found but not finished"});
    });

    it ("returns 200 when jobs is found and is done", async () => {
        (query as jest.Mock).mockResolvedValueOnce([{
            id: FAKE_ID,
            status: "done",
            transcription: "transcription test"
    }]);
        const res = await request(app).get(`/jobs/${FAKE_ID}/result`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({text: "transcription test"});
    })
});