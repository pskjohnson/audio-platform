import request from "supertest";
import { app } from "../app";
import { query } from "../db";
import { transcribe } from "./services/transcription";

jest.mock("../db", () => ({
    query: jest.fn(),
  }));

// jest.mock("../db", () => ({
//     transcribe: jest.fn(),
//   }));

beforeEach(() => {
    jest.clearAllMocks();
});

// this is for a file upload
describe("POST /jobs", () => {
    // this tests for when no file is uploaded ... error first
    it("returns 400 when no file is provided", async () => {
        const res = await request(app).post(`/jobs`)
        expect(res.status).toBe(400);
        expect(res.body).toEqual({error: "File is required"})
    });
    // this tests for when a file is provided ... success later 
    it("returns 201 when a file is provided", async () => {
        const fakeId = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
        (query as jest.Mock).mockResolvedValueOnce([{ id: fakeId, status: "queued" }]);
        (query as jest.Mock).mockResolvedValueOnce([{ id: fakeId, status: "queued" }]);
        (query as jest.Mock).mockResolvedValue([{ id: fakeId, status: "done" }]);
        // (transcribe as jest.Mock).mockResolvedValueOnce(Promise<void>);
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
            id: fakeId,
            status: "done"
        });
    });
}); 

// // this tests for an id get function
describe("GET /jobs / :id", () => {
    it("returns 404 when an invalid id is entered", async () => {
        (query as jest.Mock).mockResolvedValueOnce([])
        const fakeId = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
        const res = await request(app).get(`/jobs/${fakeId}`);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({error: "job not found"});
    });

    it("returns 200 when valid id is entered", async () => {
        const fakeId = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
        (query as jest.Mock).mockResolvedValueOnce([{
            id: fakeId,
            status: "queued",
            created_at: "testTime1",
            updated_at: "testTime2",
        }]);
        const res = await request(app).get(`/jobs/${fakeId}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            id: fakeId, 
            status: "queued",
            created_at: "testTime1",
            updated_at: "testTime2"
        });
    });
});



describe("GET /jobs/:id/result", () => {
    it("returns 404 when an non-existant id is entered", async () => {
        const fakeId = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
        (query as jest.Mock).mockResolvedValueOnce([])
        const res = await request(app).get(`/jobs/${fakeId}/result`);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({error: "job is not found"})
    });

    it ("returns 202 when a valid file is entered but not finished", async () => {
        const fakeId = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
        (query as jest.Mock).mockResolvedValueOnce([{
            id: fakeId,
            status: "queued"
    }]);
        const res = await request(app).get(`/jobs/${fakeId}/result`);
        expect(res.status).toBe(202);
        expect(res.body).toEqual({error: "job found but not finished"});
    });

    it ("returns 200 when jobs is found and is done", async () => {
        const fakeId = "899c14c9-6970-49d5-b93d-43921cd4dfb4";
        (query as jest.Mock).mockResolvedValueOnce([{
            id: fakeId,
            status: "done",
            transcription: "transcription test"
    }]);
        const res = await request(app).get(`/jobs/${fakeId}/result`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({text: "transcription test"});
    })
});