import { GET } from "@/app/api/assets/get-price/route";
import Asset from "@/models/Asset";
import { NextRequest } from "next/server";
import { connectTestDB, closeDatabase } from "@/lib/testUtils";

describe("GET /api/assets/get-price", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await Asset.deleteMany({});
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const createRequest = (symbol: string | null) =>
    new NextRequest(
      new Request(
        `http://localhost/api/assets/get-price${symbol ? `?symbol=${symbol}` : ""}`,
        { method: "GET" },
      ),
    );

  it("returns 400 if symbol is missing", async () => {
    const res = (await GET(createRequest(null))) as Response;
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/symbol/i);
  });

  it("returns 404 if asset does not exist", async () => {
    const res = (await GET(createRequest("fake"))) as Response;
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/can't fetch price/i);
  });

  it("returns price data if asset exists", async () => {
    await Asset.create({
      symbol: "AAPL",
      name: "Apple Inc.",
      asset_type: "stock",
      price: 123.45,
      market: "NASDAQ",
      last_updated: new Date(),
    });

    const res = (await GET(createRequest("aapl"))) as Response;
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.symbol).toBe("AAPL");
    expect(json.price).toBe(123.45);
    expect(json.source).toBe("database");
  });
});
