import { GET } from "@/app/api/asset-price-data/route";
import { dbConnect, closeDatabase } from "@/lib/mongodb";
import Asset from "@/models/Asset";
import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

describe("GET /api/asset-price-data", () => {
  beforeAll(async () => {
    await dbConnect();
  });

  afterEach(async () => {
    await Asset.deleteMany({});
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const createRequest = (assetId: string, period?: string) => {
    const url = `http://localhost/api/asset-price-data?asset_id=${assetId}${
      period ? `&period=${period}` : ""
    }`;
    return new NextRequest(new Request(url, { method: "GET" }));
  };

  it("returns 401 if session is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const res = (await GET(
      new NextRequest(new Request("http://localhost/api/asset-price-data")),
    )) as Response;

    expect(res.status).toBe(401);
  });

  it("returns 400 if asset_id is invalid", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "test-user-id" },
    });

    const res = (await GET(
      new NextRequest(
        new Request("http://localhost/api/asset-price-data?asset_id=123"),
      ),
    )) as Response;

    expect(res.status).toBe(400);
  });

  it("returns 404 if asset is not found", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "test-user-id" },
    });

    const fakeId = "507f1f77bcf86cd799439011";

    const res = (await GET(createRequest(fakeId))) as Response;
    expect(res.status).toBe(404);
  });

  it("returns 200 with price history for valid request", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "test-user-id" },
    });

    const asset = await Asset.create({
      name: "Test Asset",
      symbol: "AAPL",
      asset_type: "Equity",
      price: 100,
      market: "US",
      last_updated: new Date(),
    });

    const res = (await GET(
      createRequest(asset._id.toString(), "M"),
    )) as Response;
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveProperty("name", "Test Asset");
    expect(json.data).toHaveProperty("symbol", "AAPL");
    expect(Array.isArray(json.data.priceHistory)).toBe(true);
  });
});
