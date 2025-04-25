import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { GET } from "@/app/api/reports/download/route";
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

describe("GET /api/reports/download", () => {
  it("returns 404 if report not found", async () => {
    mockSession(getMockSession());
    const req = createMockRequestWithUrl(
      `/api/reports/download?id=${new mongoose.Types.ObjectId()}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns 403 if user does not own report", async () => {
    mockSession(
      getMockSession({ id: new mongoose.Types.ObjectId().toString() }),
    );

    const otherUserId = new mongoose.Types.ObjectId();
    const report = await Report.create({
      user_id: otherUserId,
      portfolio_ids: [new mongoose.Types.ObjectId()],
      name: "Unauthorized Report",
      report_type: "summary",
      report_format: "pdf",
      generation_inputs: { to_date: new Date() },
      generated_at: new Date(),
    });

    const req = createMockRequestWithUrl(
      `/api/reports/download?id=${report._id.toString()}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("successfully downloads a report (PDF)", async () => {
    const session = getMockSession();
    mockSession(session);

    const report = await Report.create({
      user_id: new mongoose.Types.ObjectId(session.user.id),
      portfolio_ids: [new mongoose.Types.ObjectId()],
      name: "Test Report",
      report_type: "summary",
      report_format: "pdf",
      generation_inputs: { to_date: new Date() },
      generated_at: new Date(),
    });

    const req = createMockRequestWithUrl(
      `/api/reports/download?id=${report._id.toString()}`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
