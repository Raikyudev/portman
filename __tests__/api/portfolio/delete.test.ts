//Tests F2 requirement
import { createMocks } from "node-mocks-http";
import {
  connectTestDB,
  closeDatabase,
  mockSession,
  getMockSession,
} from "@/lib/testUtils";
import { DELETE } from "@/app/api/portfolio/delete/route";
import Portfolio from "@/models/Portfolio";
import PortfolioAsset from "@/models/PortfolioAsset";
import PortfolioHistory from "@/models/PortfolioHistory";
import mongoose from "mongoose";

jest.mock("next-auth");

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

describe("DELETE /api/portfolio/delete", () => {
  it("returns 404 if portfolio not found", async () => {
    const session = getMockSession();
    mockSession(session);

    const fakePortfolioId = new mongoose.Types.ObjectId();

    const { req } = createMocks({
      method: "DELETE",
      url: `http://localhost/api/portfolio/delete?portfolioId=${fakePortfolioId}`,
    });

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toMatch(/portfolio not found/i);
  });

  it("deletes a portfolio and related data", async () => {
    const session = getMockSession();
    mockSession(session);

    const userId = new mongoose.Types.ObjectId(session.user.id);

    const portfolio = await Portfolio.create({
      name: "Portfolio to delete",
      description: "Desc",
      user_id: userId,
    });

    await PortfolioAsset.create({
      portfolio_id: portfolio._id,
      asset_id: new mongoose.Types.ObjectId(),
      quantity: 10,
      price: 100,
      avg_buy_price: 100,
    });

    await PortfolioHistory.create({
      portfolio_id: portfolio._id,
      date: new Date(),
      port_total_value: 1000,
    });

    const { req } = createMocks({
      method: "DELETE",
      url: `http://localhost/api/portfolio/delete?portfolioId=${portfolio._id.toString()}`,
    });

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toMatch(/success/i);

    const portfolioExists = await Portfolio.findById(portfolio._id);
    expect(portfolioExists).toBeNull();

    const relatedAssets = await PortfolioAsset.find({
      portfolio_id: portfolio._id,
    });
    expect(relatedAssets.length).toBe(0);

    const relatedHistory = await PortfolioHistory.find({
      portfolio_id: portfolio._id,
    });
    expect(relatedHistory.length).toBe(0);
  });
});
