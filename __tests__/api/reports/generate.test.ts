import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/reportUtils", () => ({
  generatePDF: jest.fn(() => Promise.resolve(Buffer.from("fake pdf content"))),
}));

import { POST } from "@/app/api/reports/generate/route";
import {
  connectTestDB,
  closeDatabase,
  createMockRequestWithJson,
  getMockSession,
  mockSession,
} from "@/lib/testUtils";
import mongoose from "mongoose";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/reports/generate", () => {
  it("returns 400 for missing fields", async () => {
    mockSession(getMockSession());
    const req = createMockRequestWithJson({ format: "pdf" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("successfully generates a PDF report", async () => {
    mockSession(getMockSession());
    const now = new Date();
    const req = createMockRequestWithJson({
      selectedPortfolios: [new mongoose.Types.ObjectId().toString()],
      type: "summary",
      format: "pdf",
      dateRange: {
        from: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        to: now.toISOString(),
      },
      name: "Test Report",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("successfully generates a JSON report", async () => {
    mockSession(getMockSession());
    const now = new Date();
    const req = createMockRequestWithJson({
      selectedPortfolios: [new mongoose.Types.ObjectId().toString()],
      type: "summary",
      format: "json",
      dateRange: {
        from: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        to: now.toISOString(),
      },
      name: "Test Report",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(() => JSON.parse(text)).not.toThrow();
  });
});
