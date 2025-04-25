import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { GET } from "@/app/api/reports/route";
import {
  connectTestDB,
  closeDatabase,
  createMockRequestWithUrl,
  getMockSession,
  mockSession,
} from "@/lib/testUtils";
import mongoose from "mongoose";
import Report from "@/models/Report";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/reports", () => {
  it("returns 400 if fromDate is invalid", async () => {
    mockSession(getMockSession());
    const req = createMockRequestWithUrl("/api/reports?fromDate=invalid-date");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if toDate is invalid", async () => {
    mockSession(getMockSession());
    const req = createMockRequestWithUrl("/api/reports?toDate=invalid-date");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 if toDate is before fromDate", async () => {
    mockSession(getMockSession());
    const req = createMockRequestWithUrl(
      "/api/reports?fromDate=2024-05-01&toDate=2024-04-01",
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("fetches reports successfully", async () => {
    const session = getMockSession();
    mockSession(session);

    await Report.create({
      user_id: new mongoose.Types.ObjectId(session.user.id),
      portfolio_ids: [new mongoose.Types.ObjectId()],
      name: "Test Report",
      report_type: "summary",
      report_format: "pdf",
      generation_inputs: { to_date: new Date() },
      generated_at: new Date(),
    });

    const req = createMockRequestWithUrl("/api/reports");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.reports)).toBe(true);
  });
});
