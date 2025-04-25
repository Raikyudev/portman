import { GET } from "@/app/api/portfolio/assets/route";
import { connectTestDB, closeDatabase } from "@/lib/testUtils";
import mongoose from "mongoose";
import PortfolioAsset from "@/models/PortfolioAsset";
import Asset from "@/models/Asset";
import { createMocks } from "node-mocks-http";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

describe("GET /api/portfolio/assets", () => {
  it("returns 400 if no portfolio ID provided", async () => {
    const { req } = createMocks({
      method: "GET",
      url: "http://localhost/api/portfolio/assets",
    });
    const res = await GET(req as any);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/no portfolio/i);
  });

  it("returns asset info if portfolio ID is valid", async () => {
    const portfolioId = new mongoose.Types.ObjectId();
    const asset = await Asset.create({
      symbol: "AAPL",
      name: "Apple Inc",
      asset_type: "stock",
      price: 150,
      market: "NASDAQ",
    });
    await PortfolioAsset.create({
      portfolio_id: portfolioId,
      asset_id: asset._id,
      quantity: 10,
      avg_buy_price: 145,
    });

    const { req } = createMocks({
      method: "GET",
      url: `http://localhost/api/portfolio/assets?id=${portfolioId.toString()}`,
    });

    const res = await GET(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json[0]).toMatchObject({
      quantity: 10,
      avg_buy_price: 145,
      asset_info: {
        symbol: "AAPL",
        name: "Apple Inc",
      },
    });
  });
});
