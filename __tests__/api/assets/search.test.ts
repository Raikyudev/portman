import { GET } from "@/app/api/assets/search/route";
import Asset from "@/models/Asset";
import { NextRequest } from "next/server";
import {
  connectTestDB,
  closeDatabase,
  mockSession,
  getMockSession,
} from "@/lib/testUtils";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

beforeAll(async () => {
  await connectTestDB();
  await Asset.create([
    {
      symbol: "AAPL",
      name: "Apple Inc",
      asset_type: "stock",
      price: 150,
      market: "NASDAQ",
    },
    {
      symbol: "GOOGL",
      name: "Alphabet Inc",
      asset_type: "stock",
      price: 2800,
      market: "NASDAQ",
    },
  ]);
});

afterAll(async () => {
  await closeDatabase();
});

const createRequest = (queryParams: Record<string, string>) =>
  new NextRequest(
    new Request(
      `http://localhost/api/assets/search?${new URLSearchParams(queryParams).toString()}`,
      {
        method: "GET",
      },
    ),
  );

describe("GET /api/assets/search", () => {
  it("returns 400 for invalid query", async () => {
    mockSession(getMockSession());
    const req = createRequest({ query: "a" });
    const res = (await GET(req)) as Response;
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid page or limit", async () => {
    mockSession(getMockSession());
    const req = createRequest({ query: "AAPL", page: "0", limit: "0" });
    const res = (await GET(req)) as Response;
    expect(res.status).toBe(400);
  });

  it("returns matching assets by query", async () => {
    mockSession(getMockSession());
    const req = createRequest({ query: "AAPL" });
    const res = (await GET(req)) as Response;
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.assets.length).toBe(1);
    expect(json.assets[0].symbol).toBe("AAPL");
  });

  it("returns 404 if no assets found", async () => {
    mockSession(getMockSession());
    const req = createRequest({ query: "FAKE" });
    const res = (await GET(req)) as Response;
    expect(res.status).toBe(404);
  });

  it("returns paginated results for market query", async () => {
    mockSession(getMockSession());
    const req = createRequest({ market: "true", page: "1", limit: "10" });
    const res = (await GET(req)) as Response;
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.assets)).toBe(true);
  });
});
