import { jest } from "@jest/globals";

jest.mock("next-auth");

import { POST as addTransaction } from "@/app/api/transaction/add/route";
import { GET } from "@/app/api/transactions/route";
import {
  connectTestDB,
  closeDatabase,
  createMockRequestWithJson,
  createMockRequestWithUrl,
  getMockSession,
  mockSession,
} from "@/lib/testUtils";
import User from "@/models/User";
import Portfolio from "@/models/Portfolio";
import Asset from "@/models/Asset";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/transactions", () => {
  it("fetches all transactions for the user", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "hashedpassword",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
    });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.create({
      name: "Portfolio 1",
      user_id: user._id,
    });

    const asset = await Asset.create({
      symbol: "AAPL",
      name: "Apple Inc.",
      asset_type: "stock",
      price: 150,
      market: "NASDAQ",
      last_updated: new Date(),
    });

    await addTransaction(
      createMockRequestWithJson({
        portfolio_id: portfolio._id.toString(),
        asset_id: asset._id.toString(),
        tx_type: "buy",
        quantity: 2,
        price_per_unit: 150,
        currency: "USD",
        tx_date: new Date().toISOString(),
      }),
    );

    const req = createMockRequestWithUrl("/api/transactions");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBe(1);
    expect(data.data[0].symbol).toBe("AAPL");
    expect(data.data[0].type).toBe("buy");
  });

  it("fetches transactions for a specific portfolio", async () => {
    const user = await User.create({
      email: "test2@example.com",
      password: "hashedpassword",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
    });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.create({
      name: "Portfolio 2",
      user_id: user._id,
    });

    const asset = await Asset.create({
      symbol: "MSFT",
      name: "Microsoft Corp",
      asset_type: "stock",
      price: 250,
      market: "NASDAQ",
      last_updated: new Date(),
    });

    await addTransaction(
      createMockRequestWithJson({
        portfolio_id: portfolio._id.toString(),
        asset_id: asset._id.toString(),
        tx_type: "buy",
        quantity: 3,
        price_per_unit: 250,
        currency: "USD",
        tx_date: new Date().toISOString(),
      }),
    );

    const req = createMockRequestWithUrl(
      `/api/transactions?portfolio_id=${portfolio._id.toString()}`,
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBe(1);
    expect(data.data[0].price).toBe(250);
  });

  it("returns 404 for unauthorized portfolio", async () => {
    const user = await User.create({
      email: "test3@example.com",
      password: "hashedpassword",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
    });

    mockSession(getMockSession({ id: user._id.toString() }));

    const req = createMockRequestWithUrl(
      `/api/transactions?portfolio_id=607f1f77bcf86cd799439011`,
    );
    const res = await GET(req);

    expect(res.status).toBe(404);
  });

  it("applies limit parameter correctly", async () => {
    const user = await User.create({
      email: "test4@example.com",
      password: "hashedpassword",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
    });

    mockSession(getMockSession({ id: user._id.toString() }));

    const portfolio = await Portfolio.create({
      name: "Portfolio 3",
      user_id: user._id,
    });

    const asset1 = await Asset.create({
      symbol: "GOOG",
      name: "Alphabet Inc",
      asset_type: "stock",
      price: 2700,
      market: "NASDAQ",
      last_updated: new Date(),
    });

    const asset2 = await Asset.create({
      symbol: "AMZN",
      name: "Amazon.com Inc",
      asset_type: "stock",
      price: 3400,
      market: "NASDAQ",
      last_updated: new Date(),
    });

    await addTransaction(
      createMockRequestWithJson({
        portfolio_id: portfolio._id.toString(),
        asset_id: asset1._id.toString(),
        tx_type: "buy",
        quantity: 1,
        price_per_unit: 2700,
        currency: "USD",
        tx_date: new Date().toISOString(),
      }),
    );

    await addTransaction(
      createMockRequestWithJson({
        portfolio_id: portfolio._id.toString(),
        asset_id: asset2._id.toString(),
        tx_type: "buy",
        quantity: 1,
        price_per_unit: 3400,
        currency: "USD",
        tx_date: new Date().toISOString(),
      }),
    );

    const req = createMockRequestWithUrl(`/api/transactions?limit=2`);
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBe(2);
  });

  it("returns 401 if user is not authenticated", async () => {
    mockSession(null);

    const req = createMockRequestWithUrl("/api/transactions");
    const res = await GET(req);

    expect(res.status).toBe(401);
  });
});
