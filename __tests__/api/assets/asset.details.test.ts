//Tests F4 requirement
import { GET } from "@/app/api/assets/details/route";
import { getServerSession } from "next-auth";
import { getAssetDetailsData } from "@/lib/stockPrices";
import { connectTestDB, closeDatabase } from "@/lib/testUtils";

//Mocks for the tests to work
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/stockPrices", () => ({
  getAssetDetailsData: jest.fn(),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((data, { status }) => ({ data, status })),
  },
}));

describe("/api/assets/details tests", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 when session is unauthorized", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new Request("http://localhost/api?symbol=AAPL");
    const response = await GET(request);

    expect(getServerSession).toHaveBeenCalled();
    expect(response).toEqual({ data: { error: "Unauthorized" }, status: 401 });
  });

  it("should return 400 when symbol parameter is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "123" } });

    const request = new Request("http://localhost/api");
    const response = await GET(request);

    expect(getServerSession).toHaveBeenCalled();
    expect(response).toEqual({
      data: { error: "Missing or invalid symbol parameter" },
      status: 400,
    });
  });

  it("should return 200 and asset details when request is valid", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "123" } });
    (getAssetDetailsData as jest.Mock).mockResolvedValue({
      marketCap: 5000000,
      volume24h: 100000,
      fiftyTwoWeekHigh: 150,
      fiftyTwoWeekLow: 100,
      trailingPE: 20,
      trailingAnnualDividendYield: 0.02,
    });

    const request = new Request("http://localhost/api?symbol=AAPL");
    const response = await GET(request);

    expect(getServerSession).toHaveBeenCalled();
    expect(getAssetDetailsData).toHaveBeenCalledWith("AAPL");
    expect(response).toEqual({
      data: {
        data: {
          marketCap: 5000000,
          volume24h: 100000,
          fiftyTwoWeekHigh: 150,
          fiftyTwoWeekLow: 100,
          trailingPE: 20,
          trailingAnnualDividendYield: 0.02,
        },
      },
      status: 200,
    });
  });

  it("should return 500 when an error is thrown", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "123" } });
    (getAssetDetailsData as jest.Mock).mockRejectedValue(
      new Error("Test error"),
    );

    const request = new Request("http://localhost/api?symbol=AAPL");
    const response = await GET(request);

    expect(getServerSession).toHaveBeenCalled();
    expect(getAssetDetailsData).toHaveBeenCalledWith("AAPL");
    expect(response).toEqual({
      data: { message: "Internal Server ErrorError: Test error" },
      status: 500,
    });
  });
});
