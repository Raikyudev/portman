import { jest } from "@jest/globals";

jest.mock("next-auth");
import { getExchangeRate } from "@/lib/currencyExchange";

jest.mock("@/lib/currencyExchange", () => ({
  getExchangeRate: jest.fn(),
}));

(
  getExchangeRate as jest.MockedFunction<typeof getExchangeRate>
).mockResolvedValue({
  base: "USD",
  currency: "USD",
  rate: 1,
});

import { POST } from "@/app/api/transaction/add/route";
import {
  connectTestDB,
  closeDatabase,
  createMockRequestWithJson,
  getMockSession,
  mockSession,
} from "@/lib/testUtils";
import User from "@/models/User";
import Asset from "@/models/Asset";
import Portfolio from "@/models/Portfolio";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/transaction/add", () => {
  it("adds a new buy transaction successfully", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "hashedpassword",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
    });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.create({
      name: "Test Portfolio",
      user_id: user._id,
    });

    const asset = await Asset.create({
      name: "Apple Inc.",
      symbol: "AAPL",
      currency: "USD",
      market: "NASDAQ",
      asset_type: "stock",
    });

    const req = createMockRequestWithJson({
      portfolio_id: portfolio._id.toString(),
      asset_id: asset._id.toString(),
      tx_type: "buy",
      quantity: 5,
      price_per_unit: 150,
      currency: "USD",
      tx_date: new Date().toISOString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const transaction = await res.json();
    expect(transaction.portfolio_id).toBe(portfolio._id.toString());
    expect(transaction.asset_id).toBe(asset._id.toString());
    expect(transaction.tx_type).toBe("buy");
    expect(transaction.quantity).toBe(5);
  });

  it("sells an asset successfully", async () => {
    const user = await User.findOne({ email: "test@example.com" });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.findOne({ user_id: user._id });
    const asset = await Asset.findOne({ symbol: "AAPL" });

    const req = createMockRequestWithJson({
      portfolio_id: portfolio._id.toString(),
      asset_id: asset._id.toString(),
      tx_type: "sell",
      quantity: 5,
      price_per_unit: 160,
      currency: "USD",
      tx_date: new Date().toISOString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const transaction = await res.json();
    expect(transaction.tx_type).toBe("sell");
    expect(transaction.quantity).toBe(5);
  });

  it("returns 400 when selling more assets than owned", async () => {
    const user = await User.findOne({ email: "test@example.com" });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.findOne({ user_id: user._id });
    const asset = await Asset.findOne({ symbol: "AAPL" });

    const req = createMockRequestWithJson({
      portfolio_id: portfolio._id.toString(),
      asset_id: asset._id.toString(),
      tx_type: "sell",
      quantity: 100,
      price_per_unit: 160,
      currency: "USD",
      tx_date: new Date().toISOString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const error = await res.json();
    expect(error.error).toBe("Not enough shares to sell");
  });

  it("returns 400 when selling an asset not owned", async () => {
    const user = await User.findOne({ email: "test@example.com" });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.findOne({ user_id: user._id });
    const newAsset = await Asset.create({
      name: "Microsoft Corp.",
      symbol: "MSFT",
      currency: "USD",
      market: "NASDAQ",
      asset_type: "stock",
    });

    const req = createMockRequestWithJson({
      portfolio_id: portfolio._id.toString(),
      asset_id: newAsset._id.toString(),
      tx_type: "sell",
      quantity: 1,
      price_per_unit: 300,
      currency: "USD",
      tx_date: new Date().toISOString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const error = await res.json();
    expect(error.error).toBe("Not enough shares to sell");
  });

  it("returns 400 if required fields are missing", async () => {
    mockSession(getMockSession());

    const req = createMockRequestWithJson({});

    const res = await POST(req);
    expect(res.status).toBe(400);

    const error = await res.json();
    expect(error.error).toBeDefined();
  });

  it("returns 401 if user is not authenticated", async () => {
    mockSession(null);

    const req = createMockRequestWithJson({
      portfolio_id: "someid",
      asset_id: "someid",
      tx_type: "buy",
      quantity: 5,
      price_per_unit: 150,
      currency: "USD",
      tx_date: new Date().toISOString(),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const error = await res.json();
    expect(error.error).toBe("Unauthorized");
  });
});
