// Tests F9 requirement
import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { GET, POST, DELETE } from "@/app/api/watchlist/route";
import {
  connectTestDB,
  closeDatabase,
  createMockRequestWithJson,
  createMockRequestWithUrl,
  getMockSession,
  mockSession,
  clearDatabase,
} from "@/lib/testUtils";
import Asset from "@/models/Asset";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

describe("/api/watchlist", () => {
  it("returns 401 if user not authenticated (GET)", async () => {
    mockSession(null);

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("fetches empty watchlist if no assets added", async () => {
    mockSession(getMockSession());

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(0);
  });

  it("adds asset to watchlist successfully (POST)", async () => {
    mockSession(getMockSession());

    const asset = await Asset.create({
      symbol: "AAPL",
      name: "Apple Inc.",
      asset_type: "stock",
      price: 150,
      market: "NASDAQ",
    });

    const req = createMockRequestWithJson({ asset_id: asset._id.toString() });
    const res = await POST(req);

    expect(res.status).toBe(201);

    const result = await res.json();
    expect(result.message).toMatch(/Added asset to the watchlist/i);
  });

  it("returns error if adding duplicate asset to watchlist (POST)", async () => {
    const session = getMockSession();
    mockSession(session);

    const asset = await Asset.create({
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      asset_type: "stock",
      price: 2800,
      market: "NASDAQ",
    });

    const firstReq = createMockRequestWithJson({
      asset_id: asset._id.toString(),
    });
    await POST(firstReq);

    const secondReq = createMockRequestWithJson({
      asset_id: asset._id.toString(),
    });
    const res = await POST(secondReq);

    expect(res.status).toBe(400);
  });

  it("returns 404 if asset not found (POST)", async () => {
    mockSession(getMockSession());

    const fakeAssetId = "607f1f77bcf86cd799439011";
    const req = createMockRequestWithJson({ asset_id: fakeAssetId });
    const res = await POST(req);

    expect(res.status).toBe(404);
  });

  it("removes asset from watchlist (DELETE)", async () => {
    const session = getMockSession();
    mockSession(session);

    const asset = await Asset.create({
      symbol: "MSFT",
      name: "Microsoft Corp.",
      asset_type: "stock",
      price: 300,
      market: "NASDAQ",
    });

    const addReq = createMockRequestWithJson({
      asset_id: asset._id.toString(),
    });
    await POST(addReq);

    const deleteReq = createMockRequestWithUrl(
      `/api/watchlist?id=${asset._id.toString()}`,
    );
    const res = await DELETE(deleteReq);

    expect(res.status).toBe(200);

    const result = await res.json();
    expect(result.message).toMatch(/Removed from watchlist/i);
  });

  it("returns 404 if removing non-existing asset (DELETE)", async () => {
    mockSession(getMockSession());

    const fakeAssetId = "607f1f77bcf86cd799439011";
    const req = createMockRequestWithUrl(`/api/watchlist?id=${fakeAssetId}`);
    const res = await DELETE(req);

    expect(res.status).toBe(404);
  });

  it("returns 400 if id missing in DELETE", async () => {
    mockSession(getMockSession());

    const req = createMockRequestWithUrl(`/api/watchlist`);
    const res = await DELETE(req);

    expect(res.status).toBe(400);
  });
});
