import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
import express from "express";
import request from "supertest";

// ---------------------------------------------------------------------------
// GET /api/models — must not call genAI.listModels() (which does not exist in
// @google/generative-ai and made the endpoint always return 500: #1624 / #1647).
// The handler now returns a static candidate list derived from geminiHelper.
// ---------------------------------------------------------------------------

// Stub @google/generative-ai so that any accidental reintroduction of
// `new GoogleGenerativeAI(...).listModels()` would be detectable: we assert
// the constructor is never invoked for the /models route.
const generateText = vi.fn();
const listModels = vi.fn();
const GoogleGenerativeAI = vi.fn().mockImplementation(() => ({
  getGenerativeModel: vi.fn(() => ({ generateContent: generateText })),
  listModels,
}));

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI,
  GoogleGenerativeAI: GoogleGenerativeAI,
}));

// Keep the route isolated from the DB / auth middleware stack by importing
// only the router and mounting it on a minimal express app.
const aiRoutes = require("../routes/aiRoutes");

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api", aiRoutes);
  return app;
};

describe("GET /api/models (#1624 / #1647)", () => {
  let app;
  let originalGeminiModel;

  beforeAll(() => {
    app = buildApp();
    originalGeminiModel = process.env.GEMINI_MODEL;
  });

  afterEach(() => {
    GoogleGenerativeAI.mockClear();
    listModels.mockClear();
    delete process.env.GEMINI_MODEL;
  });

  it("returns 200 with a static availableModels array", async () => {
    const res = await request(app).get("/api/models");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.availableModels)).toBe(true);
    expect(res.body.availableModels.length).toBeGreaterThan(0);
    expect(res.body.availableModels).toContain("gemini-2.5-flash");
  });

  it("does not call genAI.listModels() (the nonexistent SDK method)", async () => {
    await request(app).get("/api/models");

    expect(listModels).not.toHaveBeenCalled();
  });

  it("does not construct a GoogleGenerativeAI client", async () => {
    await request(app).get("/api/models");

    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

  it("reports configured=null when GEMINI_MODEL is unset", async () => {
    delete process.env.GEMINI_MODEL;

    const res = await request(app).get("/api/models");

    expect(res.body.configured).toBeNull();
  });

  it("normalizes a configured model name without the models/ prefix", async () => {
    process.env.GEMINI_MODEL = "gemini-2.5-flash";

    const res = await request(app).get("/api/models");

    expect(res.body.configured).toBe("models/gemini-2.5-flash");
  });

  it("preserves a configured model name that already has the models/ prefix", async () => {
    process.env.GEMINI_MODEL = "models/gemini-2.0-flash";

    const res = await request(app).get("/api/models");

    expect(res.body.configured).toBe("models/gemini-2.0-flash");
  });

  it("never returns 500 (the previous broken behaviour)", async () => {
    const res = await request(app).get("/api/models");

    expect(res.status).toBeLessThan(500);
  });
});
