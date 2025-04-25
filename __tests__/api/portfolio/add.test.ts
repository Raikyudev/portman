import { createMocks } from "node-mocks-http";
import {
  connectTestDB,
  closeDatabase,
  mockSession,
  getMockSession,
} from "@/lib/testUtils";
import Portfolio from "@/models/Portfolio";
import { GET } from "@/app/api/portfolio/route";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

describe("GET /api/portfolio", () => {
  it("rejects unauthorized GET", async () => {
    const { req } = createMocks({
      method: "GET",
      url: "http://localhost/api/portfolio",
    });

    const nextReq = new NextRequest(req as unknown as Request);
    const res = await GET(nextReq);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized access");
  });

  it("succeeds authorized GET", async () => {
    const userId = new mongoose.Types.ObjectId();
    mockSession(getMockSession({ id: userId.toString() }));

    await Portfolio.create({
      name: "Test Portfolio",
      description: "Sample",
      user_id: userId,
    });

    const { req } = createMocks({
      method: "GET",
      url: "http://localhost/api/portfolio",
    });

    const nextReq = new NextRequest(req as unknown as Request);
    const res = await GET(nextReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json)).toBe(true);
    expect(json[0].name).toBe("Test Portfolio");
  });

  it("includes portfolioId when provided", async () => {
    const userId = new mongoose.Types.ObjectId();
    mockSession(getMockSession({ id: userId.toString() }));

    const portfolio = await Portfolio.create({
      name: "Another Portfolio",
      description: "Test",
      user_id: userId,
    });

    const { req } = createMocks({
      method: "GET",
      url: `http://localhost/api/portfolio?id=${portfolio._id.toString()}`,
    });

    const nextReq = new NextRequest(req as unknown as Request);
    const res = await GET(nextReq);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.portfolioId).toBe(portfolio._id.toString());
    expect(Array.isArray(json.portfolios)).toBe(true);
  });
});
